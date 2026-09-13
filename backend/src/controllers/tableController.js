const db = require('../config/database');

// 1. Get all active open tables for the waiter (or restaurant)
exports.getActiveTables = async (req, res) => {
  try {
    const waiterId = req.user.id;
    const isCashier = req.user.role === 'cashier';

    let tables = [];
    if (db.type === 'json') {
      if (!db.store.active_tables) {
        db.store.active_tables = [];
      }
      tables = isCashier
        ? db.store.active_tables
        : db.store.active_tables.filter(t => Number(t.waiter_id) === Number(waiterId));
    } else {
      tables = isCashier
        ? await db.query('SELECT * FROM active_tables ORDER BY updated_at DESC')
        : await db.query('SELECT * FROM active_tables WHERE waiter_id = ? ORDER BY updated_at DESC', [waiterId]);
    }

    res.json({
      success: true,
      tables: tables || []
    });
  } catch (err) {
    console.error('Get active tables error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch active tables.' });
  }
};

// 2. Save or update an active open table's order
exports.saveTableOrder = async (req, res) => {
  try {
    const waiterId = req.user.id;
    const { table_number, items, customer_phone, service_id } = req.body;

    if (!table_number) {
      return res.status(400).json({ success: false, message: 'Table number is required.' });
    }

    const formattedTable = table_number.toUpperCase().trim();
    const orderItems = Array.isArray(items) ? items : [];
    const totalAmount = orderItems.reduce((acc, item) => acc + (parseFloat(item.price) * parseInt(item.quantity, 10)), 0);
    const vatAmount = 0.00;
    const now = new Date().toISOString();

    if (db.type === 'json') {
      if (!db.store.active_tables) {
        db.store.active_tables = [];
      }

      const existingIndex = db.store.active_tables.findIndex(
        t => t.table_number === formattedTable && Number(t.waiter_id) === Number(waiterId)
      );

      const tableData = {
        table_number: formattedTable,
        waiter_id: waiterId,
        service_id: service_id || 1,
        items: orderItems,
        amount: totalAmount,
        vat_amount: vatAmount,
        customer_phone: customer_phone || '',
        updated_at: now
      };

      if (existingIndex >= 0) {
        db.store.active_tables[existingIndex] = {
          ...db.store.active_tables[existingIndex],
          ...tableData
        };
      } else {
        db.store.active_tables.push({
          ...tableData,
          created_at: now
        });
      }

      db.saveJSONStore();

      return res.json({
        success: true,
        message: 'Table order updated.',
        table: existingIndex >= 0 ? db.store.active_tables[existingIndex] : tableData
      });
    }

    // SQLite / MySQL handling
    const existing = await db.get(
      'SELECT * FROM active_tables WHERE table_number = ? AND waiter_id = ?',
      [formattedTable, waiterId]
    );

    if (existing) {
      await db.query(
        `UPDATE active_tables 
         SET items = ?, amount = ?, vat_amount = ?, customer_phone = ?, service_id = ?, updated_at = ? 
         WHERE table_number = ? AND waiter_id = ?`,
        [JSON.stringify(orderItems), totalAmount, vatAmount, customer_phone || '', service_id || 1, now, formattedTable, waiterId]
      );
    } else {
      await db.query(
        `INSERT INTO active_tables (table_number, waiter_id, service_id, items, amount, vat_amount, customer_phone, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [formattedTable, waiterId, service_id || 1, JSON.stringify(orderItems), totalAmount, vatAmount, customer_phone || '', now, now]
      );
    }

    const updated = await db.get(
      'SELECT * FROM active_tables WHERE table_number = ? AND waiter_id = ?',
      [formattedTable, waiterId]
    );

    res.json({
      success: true,
      message: 'Table order saved successfully.',
      table: updated
    });
  } catch (err) {
    console.error('Save table order error:', err);
    res.status(500).json({ success: false, message: 'Failed to save table order: ' + err.message });
  }
};

// 3. Clear or close an active open table
exports.deleteTableOrder = async (req, res) => {
  try {
    const waiterId = req.user.id;
    const { tableNumber } = req.params;
    const formattedTable = (tableNumber || '').toUpperCase().trim();

    if (db.type === 'json') {
      if (db.store.active_tables) {
        db.store.active_tables = db.store.active_tables.filter(
          t => !(t.table_number === formattedTable && (Number(t.waiter_id) === Number(waiterId) || req.user.role === 'cashier'))
        );
        db.saveJSONStore();
      }
      return res.json({ success: true, message: `Table ${formattedTable} cleared.` });
    }

    await db.query(
      'DELETE FROM active_tables WHERE table_number = ? AND (waiter_id = ? OR ? = "cashier")',
      [formattedTable, waiterId, req.user.role]
    );

    res.json({ success: true, message: `Table ${formattedTable} cleared.` });
  } catch (err) {
    console.error('Delete table order error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear table order.' });
  }
};
