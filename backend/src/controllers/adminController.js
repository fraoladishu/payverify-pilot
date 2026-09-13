const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { validateStrongPassword, checkPasswordUnique } = require('../utils/passwordValidator');

// 1. Get All Staff (Waiters, Cashiers, Admins) with shift metrics
exports.getAllStaff = async (req, res) => {
  try {
    const users = await db.query('SELECT id, name, username, role, created_at FROM users ORDER BY id ASC');
    const allTransactions = await db.query('SELECT * FROM transactions');

    const staffWithMetrics = users.map(u => {
      let userTxs = [];
      let confirmedTxs = [];

      if (u.role === 'cashier') {
        // For cashiers, count transactions audited / settled by this cashier
        userTxs = allTransactions.filter(t => Number(t.confirmed_by) === Number(u.id));
        confirmedTxs = userTxs.filter(t => t.status === 'confirmed');
      } else {
        // For waiters, count transactions served by this waiter
        userTxs = allTransactions.filter(t => Number(t.waiter_id) === Number(u.id));
        confirmedTxs = userTxs.filter(t => t.status === 'confirmed');
      }

      const totalRevenue = confirmedTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      return {
        ...u,
        total_orders: userTxs.length,
        confirmed_orders: confirmedTxs.length,
        total_revenue: totalRevenue
      };
    });

    res.json({
      success: true,
      staff: staffWithMetrics
    });
  } catch (err) {
    console.error('Get all staff error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve staff members: ' + err.message });
  }
};

// 2. Add New Staff Member (Waiter or Cashier)
exports.createStaff = async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, username, password, and role are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanRole = role.trim().toLowerCase();

    if (!['waiter', 'cashier'].includes(cleanRole)) {
      return res.status(400).json({ success: false, message: 'Role must be either "waiter" or "cashier".' });
    }

    // Enforce 16+ character strong password policy
    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    // Check if username already exists
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Username "${cleanUsername}" is already taken.` });
    }

    // Enforce uniqueness across all staff accounts
    const allUsers = await db.query('SELECT id, password_hash FROM users');
    const uniqueCheck = await checkPasswordUnique(password, allUsers);
    if (!uniqueCheck.unique) {
      return res.status(400).json({ success: false, message: uniqueCheck.message });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), cleanUsername, passwordHash, cleanRole]
    );

    const newUser = await db.get('SELECT id, name, username, role, created_at FROM users WHERE username = ?', [cleanUsername]);

    res.status(201).json({
      success: true,
      message: `Successfully added ${newUser.name} as ${cleanRole}.`,
      user: newUser
    });
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ success: false, message: 'Failed to add staff member: ' + err.message });
  }
};

// 3. Remove Staff Member
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = Number(id);

    // Prevent Super Admin from deleting themselves
    if (targetId === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own administrator account.' });
    }

    const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [targetId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [targetId]);

    res.json({
      success: true,
      message: `Staff member "${targetUser.name}" (${targetUser.username}) successfully removed.`
    });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove staff member: ' + err.message });
  }
};

// 4. Change Password for Waiter or Cashier (Admin Capability)
exports.changeStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const targetId = Number(id);

    const passwordValidation = validateStrongPassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [targetId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const allUsers = await db.query('SELECT id, password_hash FROM users');
    const uniqueCheck = await checkPasswordUnique(newPassword, allUsers, targetId);
    if (!uniqueCheck.unique) {
      return res.status(400).json({ success: false, message: uniqueCheck.message });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, targetId]);

    res.json({
      success: true,
      message: `Password for "${targetUser.name}" (${targetUser.username}) successfully updated.`
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'Failed to update password: ' + err.message });
  }
};

// 5. Super Admin Hotel Comprehensive Activities & Analytics (for Graphs and Detail Logs)
exports.getHotelActivities = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    const allTransactions = await db.query('SELECT * FROM transactions');
    const allUsers = await db.query('SELECT id, name, username, role FROM users');

    // Enrich with staff names
    let enriched = allTransactions.map(t => {
      const u = allUsers.find(x => Number(x.id) === Number(t.waiter_id)) || {};
      const confirmedUser = allUsers.find(x => Number(x.id) === Number(t.confirmed_by)) || {};
      let items = t.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }
      return {
        ...t,
        items: Array.isArray(items) ? items : [],
        waiter_name: u.name || 'Staff',
        confirmed_by_name: confirmedUser.name || 'Cashier'
      };
    });

    // Filter by date range if provided (supports startDate alone, endDate alone, or both)
    if (startDate || endDate) {
      enriched = enriched.filter(t => {
        const d = (t.created_at || '').slice(0, 10);
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }

    // Sort strictly by date descending
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Daily Sales aggregation for Graph
    const dailyMap = {};
    enriched.forEach(t => {
      const d = (t.created_at || '').slice(0, 10);
      if (!d) return;
      if (!dailyMap[d]) {
        dailyMap[d] = { date: d, revenue: 0, cashRevenue: 0, wireRevenue: 0, count: 0, confirmedCount: 0 };
      }
      dailyMap[d].count += 1;
      if (t.status === 'confirmed') {
        const amt = parseFloat(t.amount) || 0;
        dailyMap[d].revenue += amt;
        dailyMap[d].confirmedCount += 1;
        const isCash = t.payment_type === 'manual' || (t.payment_method || '').toLowerCase() === 'cash';
        if (isCash) {
          dailyMap[d].cashRevenue += amt;
        } else {
          dailyMap[d].wireRevenue += amt;
        }
      }
    });

    // Array sorted chronologically for graph
    const chartData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Overall Totals
    const confirmedOnly = enriched.filter(t => t.status === 'confirmed');
    const totalRevenue = confirmedOnly.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const cashTotal = confirmedOnly.filter(t => t.payment_type === 'manual' || (t.payment_method || '').toLowerCase() === 'cash')
      .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const wireTotal = totalRevenue - cashTotal;

    res.json({
      success: true,
      totals: {
        totalRevenue,
        cashTotal,
        wireTotal,
        totalOrders: enriched.length,
        confirmedOrders: confirmedOnly.length,
        declinedOrders: enriched.filter(t => t.status === 'failed' || t.status === 'cancelled').length,
        pendingOrders: enriched.filter(t => t.status === 'pending').length
      },
      chartData,
      activities: enriched.slice(0, parseInt(limit, 10))
    });
  } catch (err) {
    console.error('Get hotel activities error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve hotel activities: ' + err.message });
  }
};
