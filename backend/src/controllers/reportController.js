const db = require('../config/database');

exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    const targetDate = date || new Date().toISOString().slice(0, 10);

    // 1. Total Confirmed Revenue and Counts
    const totals = await db.get(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as total_revenue,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(*) as total_count
       FROM transactions 
       WHERE DATE(created_at) = DATE(?)`,
      [targetDate]
    );

    // 2. Breakdown by Service Type (Confirmed Only)
    const serviceBreakdown = await db.query(
      `SELECT 
        s.id as service_id,
        s.name as service_name,
        s.icon as service_icon,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount
       FROM services s
       LEFT JOIN transactions t ON s.id = t.service_id 
            AND t.status = 'confirmed' 
            AND DATE(t.created_at) = DATE(?)
       GROUP BY s.id, s.name, s.icon
       ORDER BY total_amount DESC`,
      [targetDate]
    );

    // 3. Breakdown by Payment Provider / Bank (Confirmed Only)
    const providerBreakdown = await db.query(
      `SELECT 
        payment_method,
        COUNT(id) as count,
        COALESCE(SUM(amount), 0) as total_amount
       FROM transactions 
       WHERE status = 'confirmed' AND DATE(created_at) = DATE(?)
       GROUP BY payment_method`,
      [targetDate]
    );

    res.json({
      success: true,
      date: targetDate,
      summary: {
        totalRevenue: totals?.total_revenue || 0,
        confirmedCount: totals?.confirmed_count || 0,
        pendingCount: totals?.pending_count || 0,
        failedCount: totals?.failed_count || 0,
        totalCount: totals?.total_count || 0,
        manualCashTotal: totals?.manual_cash_total || 0,
        manualCashCount: totals?.manual_cash_count || 0,
        wireTotal: totals?.wire_total || 0,
        wireCount: totals?.wire_count || 0
      },
      serviceBreakdown,
      providerBreakdown,
      gatewayBreakdown: providerBreakdown
    });
  } catch (err) {
    console.error('Daily summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate daily financial summary.' });
  }
};

// Waiter Performance breakdown for a selected date (or all-time if date is empty)
exports.getWaitersDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    // If date is explicitly provided as empty string ('') or 'all', treat as all-time
    const targetDate = (date && date !== 'all') ? date : null;

    const allUsers = await db.query('SELECT * FROM users');
    // Include staff with role 'waiter', plus any user that has recorded transactions
    const waiters = allUsers.filter(u => u.role === 'waiter');
    const allTransactions = await db.query('SELECT * FROM transactions');

    // Also include any user who has served tables even if role was cashier/admin in test data
    const activeStaffIds = new Set(waiters.map(w => Number(w.id)));
    allTransactions.forEach(t => {
      const wId = Number(t.waiter_id);
      if (wId && !activeStaffIds.has(wId)) {
        const u = allUsers.find(x => Number(x.id) === wId);
        if (u) {
          waiters.push(u);
          activeStaffIds.add(wId);
        }
      }
    });

    const waiterSummaries = waiters.map(w => {
      const userTxs = allTransactions.filter(t => {
        const matchesWaiter = Number(t.waiter_id) === Number(w.id);
        const matchesDate = !targetDate || (t.created_at && t.created_at.slice(0, 10) === targetDate);
        return matchesWaiter && matchesDate;
      });

      const confirmedTxs = userTxs.filter(t => t.status === 'confirmed');
      const totalRevenue = confirmedTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      // Service breakdown for this waiter
      const serviceCounts = {};
      userTxs.forEach(t => {
        const sName = t.service_name || 'Food';
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
      });

      return {
        waiter_id: w.id,
        name: w.name,
        username: w.username,
        role: w.role,
        total_revenue: totalRevenue,
        orders_count: userTxs.length,
        confirmed_count: confirmedTxs.length,
        pending_count: userTxs.filter(t => t.status === 'pending').length,
        failed_count: userTxs.filter(t => t.status === 'failed' || t.status === 'cancelled').length,
        success_rate: userTxs.length > 0 ? Math.round((confirmedTxs.length / userTxs.length) * 100) : 100,
        service_counts: serviceCounts
      };
    });

    // Sort by top revenue
    waiterSummaries.sort((a, b) => b.total_revenue - a.total_revenue);

    const grandTotalDayRevenue = waiterSummaries.reduce((sum, w) => sum + w.total_revenue, 0);

    res.json({
      success: true,
      date: targetDate || 'all',
      grandTotalDayRevenue,
      waiters: waiterSummaries
    });
  } catch (err) {
    console.error('Waiter summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to calculate waiter performance.' });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const { date, startDate, endDate, service_id, waiter_id, gateway, payment_method, status, search, limit = 50, offset = 0 } = req.query;

    // Get all enriched transactions
    let transactions = await db.query('SELECT * FROM transactions');

    // In-memory robust filtering
    if (date) {
      transactions = transactions.filter(t => t.created_at && t.created_at.slice(0, 10) === date);
    }
    if (startDate && endDate) {
      transactions = transactions.filter(t => {
        const d = t.created_at && t.created_at.slice(0, 10);
        return d >= startDate && d <= endDate;
      });
    }
    if (service_id) {
      transactions = transactions.filter(t => String(t.service_id) === String(service_id));
    }
    if (waiter_id) {
      transactions = transactions.filter(t => String(t.waiter_id) === String(waiter_id));
    }
    if (gateway) {
      transactions = transactions.filter(t => (t.gateway || '').toLowerCase() === gateway.toLowerCase());
    }
    if (payment_method) {
      transactions = transactions.filter(t => (t.payment_method || '').toLowerCase().includes(payment_method.toLowerCase()));
    }
    const { payment_type } = req.query;
    if (payment_type) {
      transactions = transactions.filter(t => {
        const pt = t.payment_type || ((t.payment_method || '').toLowerCase() === 'cash' ? 'manual' : 'wire');
        return pt.toLowerCase() === payment_type.toLowerCase();
      });
    }
    if (status) {
      transactions = transactions.filter(t => (t.status || '').toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase().trim();
      transactions = transactions.filter(t => {
        const refMatch = (t.reference_id || '').toLowerCase().includes(q);
        const phoneMatch = (t.customer_phone || '').toLowerCase().includes(q);
        const tableMatch = (t.table_number || '').toLowerCase().includes(q);
        const waiterMatch = (t.waiter_name || '').toLowerCase().includes(q);
        const methodMatch = (t.payment_method || '').toLowerCase().includes(q);
        const itemsMatch = t.items && Array.isArray(t.items) 
          ? t.items.some(i => (i.name || '').toLowerCase().includes(q))
          : false;
        return refMatch || phoneMatch || tableMatch || waiterMatch || methodMatch || itemsMatch;
      });
    }

    const total = transactions.length;
    const paginated = transactions.slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10));

    // Ensure items is always a parsed array (guard against JSON-string residue)
    const safePaginated = paginated.map(t => {
      let items = t.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      if (!Array.isArray(items)) items = [];
      return { ...t, items };
    });

    res.json({
      success: true,
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      transactions: safePaginated
    });
  } catch (err) {
    console.error('Transaction history error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve transaction history.' });
  }
};
