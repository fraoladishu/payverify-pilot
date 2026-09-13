const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const transactionController = require('../controllers/transactionController');
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const db = require('../config/database');

const menuController = require('../controllers/menuController');
const tableController = require('../controllers/tableController');
const adminController = require('../controllers/adminController');

// --- Public Auth Routes ---
router.post('/auth/login', loginRateLimiter, authController.login);
router.get('/auth/profile', authenticateToken, authController.getProfile);
router.get('/services', authenticateToken, authController.getServices);

// --- Custom Menu Management (Saved for restaurant-wide reuse) ---
router.get('/menu', authenticateToken, menuController.getMenuItems);
router.post('/menu', authenticateToken, requireRole(['admin']), menuController.saveMenuItem);
router.delete('/menu/:id', authenticateToken, requireRole(['admin']), menuController.deleteMenuItem);

// --- Multi-Table Order Management (Open table tabs) ---
router.get('/tables/active', authenticateToken, tableController.getActiveTables);
router.post('/tables/update', authenticateToken, tableController.saveTableOrder);
router.delete('/tables/:tableNumber', authenticateToken, tableController.deleteTableOrder);

// --- Waiter & Shared Transaction Routes ---
router.post('/transactions', authenticateToken, transactionController.createTransaction);
router.get('/transactions/my-recent', authenticateToken, transactionController.getMyRecentTransactions);
router.get('/transactions/:referenceId/status', authenticateToken, transactionController.getTransactionByReference);
router.post('/transactions/:referenceId/cancel', authenticateToken, transactionController.cancelTransaction);

// --- Cashier Direct Real-Time Verification Routes (Exclusive to Cashier Desk) ---
router.get('/transactions/pending-verification', authenticateToken, requireRole(['cashier']), transactionController.getPendingCashierRequests);
router.post('/transactions/:referenceId/cashier-verify', authenticateToken, requireRole(['cashier']), transactionController.verifyCashierTransaction);
router.post('/transactions/:referenceId/cashier-decline', authenticateToken, requireRole(['cashier']), transactionController.declineCashierTransaction);

// --- Reporting Routes (Protected: Cashier & Hotel Owner / Admin) ---
router.get('/reports/daily-summary', authenticateToken, requireRole(['cashier', 'admin']), reportController.getDailySummary);
router.get('/reports/waiters-summary', authenticateToken, requireRole(['cashier', 'admin']), reportController.getWaitersDailySummary);
router.get('/reports/transactions', authenticateToken, requireRole(['cashier', 'admin']), reportController.getTransactionHistory);

// --- Super Admin (Hotel Owner) Management Routes ---
router.get('/admin/staff', authenticateToken, requireRole(['admin']), adminController.getAllStaff);
router.post('/admin/staff', authenticateToken, requireRole(['admin']), adminController.createStaff);
router.delete('/admin/staff/:id', authenticateToken, requireRole(['admin']), adminController.deleteStaff);
router.post('/admin/staff/:id/change-password', authenticateToken, requireRole(['admin']), adminController.changeStaffPassword);
router.get('/admin/activities', authenticateToken, requireRole(['admin']), adminController.getHotelActivities);

// --- Webhooks (Public Gateway Callbacks) ---
const crypto = require('crypto');

router.post('/webhooks/chapa', async (req, res) => {
  if (process.env.ENABLE_GATEWAY_WEBHOOKS !== 'true') {
    return res.status(404).json({ error: 'Gateway webhooks are disabled for this environment' });
  }

  const chapaSignature = req.headers['x-chapa-signature'];
  const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;

  if (webhookSecret && webhookSecret !== 'your_chapa_webhook_secret_here') {
    const hash = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
    if (chapaSignature !== hash) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  try {
    const payload = req.body;
    console.log('[Chapa Webhook Received]', payload);
    const referenceId = payload.tx_ref || payload.trx_ref;
    const status = payload.status === 'success' ? 'confirmed' : 'failed';

    if (referenceId) {
      await db.query(
        `UPDATE transactions SET status = ?, confirmed_at = ? WHERE reference_id = ?`,
        [status, status === 'confirmed' ? new Date().toISOString() : null, referenceId]
      );
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Chapa webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/webhooks/santimpay', async (req, res) => {
  if (process.env.ENABLE_GATEWAY_WEBHOOKS !== 'true') {
    return res.status(404).json({ error: 'Gateway webhooks are disabled for this environment' });
  }

  try {
    const payload = req.body;
    console.log('[SantimPay Webhook Received]', payload);
    const referenceId = payload.id || payload.paymentId || payload.thirdPartyId;
    const status = (payload.status === 'COMPLETED' || payload.status === 'SUCCESS') ? 'confirmed' : 'failed';

    if (referenceId) {
      await db.query(
        `UPDATE transactions SET status = ?, confirmed_at = ? WHERE reference_id = ? OR gateway_reference_id = ?`,
        [status, status === 'confirmed' ? new Date().toISOString() : null, referenceId, referenceId]
      );
    }
    res.json({ received: true });
  } catch (err) {
    console.error('SantimPay webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
