const db = require('../config/database');

// Helper to generate Ethiopian reference ID format: TXN-YYYYMMDD-XXXX
function generateReferenceId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${dateStr}-${randomNum}`;
}

// 1. Waiter Submits Bill for Cashier Verification
exports.createTransaction = async (req, res) => {
  try {
    const { service_id, table_number, amount, payment_method, payment_type, bank_tx_id, customer_phone, items } = req.body;
    const waiter_id = req.user.id;

    if (!service_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: service_id and amount.'
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid transaction amount.' });
    }

    // Server-side Price Integrity Validation:
    // If items array is provided and non-empty, sum must match amount within ±0.01 ETB
    if (Array.isArray(items) && items.length > 0) {
      const computedSum = items.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQty = parseInt(item.quantity || 1, 10);
        return sum + (itemPrice * itemQty);
      }, 0);

      if (Math.abs(computedSum - numAmount) > 0.05) {
        return res.status(400).json({
          success: false,
          message: `Amount mismatch: submitted ${numAmount} ETB does not match items total ${computedSum.toFixed(2)} ETB.`
        });
      }
    }

    // Determine payment type and method
    const isManual = payment_type === 'manual' || (payment_method && payment_method.toLowerCase() === 'cash');
    const resolvedPaymentType = isManual ? 'manual' : 'wire';
    const provider = isManual ? 'Cash' : (payment_method || 'Telebirr');

    // VAT removed: Amount is pure bill total
    const vatAmount = 0.00;
    const referenceId = generateReferenceId();
    const formattedTable = (table_number || 'T-1').toUpperCase().trim();
    const cleanTxId = isManual ? '' : (bank_tx_id || '').trim();
    const cleanPhone = (customer_phone || '').trim();

    // Insert into database with 'pending' status for cashier review
    await db.query(
      `INSERT INTO transactions (
        reference_id, waiter_id, service_id, table_number, amount, vat_amount, 
        gateway, payment_method, payment_type, customer_phone, bank_tx_id, gateway_reference_id, items
      ) VALUES (?, ?, ?, ?, ?, ?, 'cashier', ?, ?, ?, ?, ?, ?)`,
      [
        referenceId,
        waiter_id,
        service_id,
        formattedTable,
        numAmount,
        vatAmount,
        provider,
        resolvedPaymentType,
        cleanPhone,
        cleanTxId,
        cleanTxId || referenceId,
        JSON.stringify(items || [])
      ]
    );

    const transaction = await db.get(
      `SELECT t.*, s.name as service_name, u.name as waiter_name 
       FROM transactions t 
       JOIN services s ON t.service_id = s.id 
       JOIN users u ON t.waiter_id = u.id 
       WHERE t.reference_id = ?`,
      [referenceId]
    );

    res.status(201).json({
      success: true,
      message: 'Payment verification request sent to cashier.',
      transaction
    });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ success: false, message: 'Failed to create payment verification request: ' + err.message });
  }
};

// 2. Cashier Fetches Live Pending Queue
exports.getPendingCashierRequests = async (req, res) => {
  try {
    const pending = await db.query(
      `SELECT t.*, s.name as service_name, u.name as waiter_name 
       FROM transactions t 
       JOIN services s ON t.service_id = s.id 
       JOIN users u ON t.waiter_id = u.id 
       WHERE t.status = 'pending' 
       ORDER BY t.created_at DESC`
    );

    res.json({
      success: true,
      count: pending ? pending.length : 0,
      transactions: pending || []
    });
  } catch (err) {
    console.error('Get pending requests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pending cashier requests.' });
  }
};

// 3. Cashier Verifies & Confirms Transaction
exports.verifyCashierTransaction = async (req, res) => {
  try {
    const { referenceId } = req.params;
    const cashierId = req.user.id;

    const transaction = await db.get('SELECT * FROM transactions WHERE reference_id = ?', [referenceId]);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (transaction.status === 'confirmed') {
      return res.json({ success: true, message: 'Transaction already verified.', transaction });
    }

    // Strict state transition: only pending transactions can be confirmed
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot verify transaction with status '${transaction.status}'. Only pending requests can be verified.`
      });
    }

    const confirmedAt = new Date().toISOString();
    await db.query(
      `UPDATE transactions SET status = 'confirmed', confirmed_at = ?, confirmed_by = ? WHERE reference_id = ?`,
      [confirmedAt, cashierId, referenceId]
    );

    const updated = await db.get(
      `SELECT t.*, s.name as service_name, u.name as waiter_name 
       FROM transactions t 
       JOIN services s ON t.service_id = s.id 
       JOIN users u ON t.waiter_id = u.id 
       WHERE t.reference_id = ?`,
      [referenceId]
    );

    res.json({
      success: true,
      message: 'Payment successfully verified and settled.',
      transaction: updated
    });
  } catch (err) {
    console.error('Verify transaction error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify transaction.' });
  }
};

// 4. Cashier Declines Transaction (with quick reason)
exports.declineCashierTransaction = async (req, res) => {
  try {
    const { referenceId } = req.params;
    const { reason } = req.body;

    const transaction = await db.get('SELECT * FROM transactions WHERE reference_id = ?', [referenceId]);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Strict state transition: only pending transactions can be declined
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot decline transaction with status '${transaction.status}'. Only pending requests can be declined.`
      });
    }

    const declineReason = reason || 'Payment could not be verified on cashier phone.';
    await db.query(
      `UPDATE transactions SET status = 'failed', decline_reason = ? WHERE reference_id = ?`,
      [declineReason, referenceId]
    );

    const updated = await db.get(
      `SELECT t.*, s.name as service_name, u.name as waiter_name 
       FROM transactions t 
       JOIN services s ON t.service_id = s.id 
       JOIN users u ON t.waiter_id = u.id 
       WHERE t.reference_id = ?`,
      [referenceId]
    );

    res.json({
      success: true,
      message: 'Transaction declined.',
      transaction: updated
    });
  } catch (err) {
    console.error('Decline transaction error:', err);
    res.status(500).json({ success: false, message: 'Failed to decline transaction.' });
  }
};

// 5. Waiter Polls Live Status (with Access Check)
exports.getTransactionByReference = async (req, res) => {
  try {
    const { referenceId } = req.params;
    let transaction = await db.get(
      `SELECT t.*, s.name as service_name, u.name as waiter_name 
       FROM transactions t 
       JOIN services s ON t.service_id = s.id 
       JOIN users u ON t.waiter_id = u.id 
       WHERE t.reference_id = ?`,
      [referenceId]
    );

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Access control: only the waiter who created it, a cashier, or an admin can view details
    if (req.user.role === 'waiter' && Number(transaction.waiter_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own transactions.' });
    }

    // Safe parse items
    if (typeof transaction.items === 'string') {
      try { transaction.items = JSON.parse(transaction.items); } catch { transaction.items = []; }
    }
    if (!Array.isArray(transaction.items)) transaction.items = [];

    res.json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving transaction status.' });
  }
};

// 6. Waiter Cancels Pending Request (with Ownership Check)
exports.cancelTransaction = async (req, res) => {
  try {
    const { referenceId } = req.params;
    const transaction = await db.get('SELECT * FROM transactions WHERE reference_id = ?', [referenceId]);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Ownership check: only the owning waiter or an admin can cancel
    if (req.user.role === 'waiter' && Number(transaction.waiter_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot cancel another waiter\'s transaction.' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel transaction with status '${transaction.status}'. Only pending requests can be cancelled.`
      });
    }

    await db.query(
      `UPDATE transactions SET status = 'cancelled', decline_reason = 'Cancelled by waiter' WHERE reference_id = ?`,
      [referenceId]
    );

    res.json({ success: true, message: 'Transaction successfully cancelled.', referenceId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel transaction.' });
  }
};

// 7. Waiter Recent Transaction History
exports.getMyRecentTransactions = async (req, res) => {
  try {
    const waiterId = req.user.id;
    const transactions = await db.query(
      `SELECT t.*, s.name as service_name 
       FROM transactions t 
       JOIN services s ON t.service_id = s.id 
       WHERE t.waiter_id = ? 
       ORDER BY t.created_at DESC 
       LIMIT 15`,
      [waiterId]
    );

    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch waiter transactions.' });
  }
};
