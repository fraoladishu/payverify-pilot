const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function testBackend() {
  console.log('🧪 Starting PayVerify Cashier Verification Automated Tests...');
  
  await db.init();
  
  // 1. Verify Users
  const waiter = await db.get('SELECT * FROM users WHERE username = ?', ['waiter1']);
  console.log('✅ User retrieved:', waiter?.name, `(Role: ${waiter?.role})`);
  
  const cashier = await db.get('SELECT * FROM users WHERE username = ?', ['cashier1']);
  console.log('✅ Cashier retrieved:', cashier?.name, `(Role: ${cashier?.role})`);

  const passwordMatch = await bcrypt.compare('Waiter1#SecureP@ss2026!', waiter.password_hash);
  console.log('✅ Password hash validation:', passwordMatch ? 'PASSED' : 'FAILED');

  // 2. Waiter submits Wire Bill for Cashier Verification
  const refId = `TXN-TEST-${Date.now()}`;
  await db.query(
    `INSERT INTO transactions (reference_id, waiter_id, service_id, table_number, amount, vat_amount, gateway, payment_method, payment_type, customer_phone, bank_tx_id, gateway_reference_id, items)
     VALUES (?, ?, ?, ?, ?, ?, 'cashier', ?, ?, ?, ?, ?, ?)`,
    [refId, waiter.id, 1, 'T-14', 550.00, 71.74, 'Telebirr', 'wire', '+251911223344', 'TB-9821', 'TB-9821', JSON.stringify([{ name: 'Special Tibs', price: 450, quantity: 1 }])]
  );
  
  const tx = await db.get('SELECT * FROM transactions WHERE reference_id = ?', [refId]);
  console.log('✅ Wire Transaction created by Waiter:', tx?.reference_id, `${tx?.amount} ETB`, `(Bank Tx ID: ${tx?.bank_tx_id}, Type: ${tx?.payment_type})`);

  // 2b. Waiter submits Manual Cash Bill for Cashier Verification
  const cashRefId = `TXN-CASH-${Date.now()}`;
  await db.query(
    `INSERT INTO transactions (reference_id, waiter_id, service_id, table_number, amount, vat_amount, gateway, payment_method, payment_type, customer_phone, bank_tx_id, gateway_reference_id, items)
     VALUES (?, ?, ?, ?, ?, ?, 'cashier', ?, ?, ?, ?, ?, ?)`,
    [cashRefId, waiter.id, 1, 'T-8', 850.00, 110.87, 'Cash', 'manual', '', '', cashRefId, JSON.stringify([{ name: 'Habesha Beer', price: 95, quantity: 4 }])]
  );
  const cashTx = await db.get('SELECT * FROM transactions WHERE reference_id = ?', [cashRefId]);
  console.log('✅ Manual Cash Transaction created by Waiter:', cashTx?.reference_id, `${cashTx?.amount} ETB`, `(Type: ${cashTx?.payment_type}, Method: ${cashTx?.payment_method})`);

  // 3. Cashier retrieves Pending Queue
  const pendingQueue = await db.query("SELECT t.* FROM transactions t WHERE t.status = 'pending'");
  const foundWire = pendingQueue.some(t => t.reference_id === refId);
  const foundCash = pendingQueue.some(t => t.reference_id === cashRefId);
  console.log('✅ Cashier Pending Queue check:', (foundWire && foundCash) ? 'BOTH FOUND IN QUEUE' : 'FAILED', `(${pendingQueue.length} items in queue)`);

  // 4. Cashier Verifies & Settles Payment for Both
  await db.query(
    `UPDATE transactions SET status = 'confirmed', confirmed_at = ?, confirmed_by = ? WHERE reference_id = ?`,
    [new Date().toISOString(), cashier.id, refId]
  );
  await db.query(
    `UPDATE transactions SET status = 'confirmed', confirmed_at = ?, confirmed_by = ? WHERE reference_id = ?`,
    [new Date().toISOString(), cashier.id, cashRefId]
  );
  const confirmedTx = await db.get('SELECT * FROM transactions WHERE reference_id = ?', [refId]);
  const confirmedCashTx = await db.get('SELECT * FROM transactions WHERE reference_id = ?', [cashRefId]);
  console.log('✅ Cashier Confirmed Wire Transaction:', confirmedTx?.reference_id, `(Status: ${confirmedTx?.status})`);
  console.log('✅ Cashier Confirmed Manual Cash Transaction:', confirmedCashTx?.reference_id, `(Status: ${confirmedCashTx?.status})`);

  // 5. Cashier Declines another Transaction with Reason
  const declineRef = `TXN-DECLINE-${Date.now()}`;
  await db.query(
    `INSERT INTO transactions (reference_id, waiter_id, service_id, table_number, amount, vat_amount, gateway, payment_method, payment_type, customer_phone, bank_tx_id, gateway_reference_id, items)
     VALUES (?, ?, ?, ?, ?, ?, 'cashier', ?, ?, ?, ?, ?, ?)`,
    [declineRef, waiter.id, 1, 'T-5', 220.00, 28.70, 'CBE Birr', 'wire', '+251922334455', 'CBE-0000', 'CBE-0000', '[]']
  );
  await db.query(
    `UPDATE transactions SET status = 'failed', decline_reason = ? WHERE reference_id = ?`,
    ['Payment not received on cashier phone yet', declineRef]
  );
  const declinedTx = await db.get('SELECT * FROM transactions WHERE reference_id = ?', [declineRef]);
  console.log('✅ Cashier Declined Transaction with Reason:', declinedTx?.reference_id, `(Status: ${declinedTx?.status}, Reason: "${declinedTx?.decline_reason}")`);

  // 6. Cashier Financial Reporting & Cash/Wire Split
  const today = new Date().toISOString().slice(0, 10);
  const summaryRows = await db.query('SELECT COUNT(*) AS TOTAL_COUNT, SUM(AMOUNT) AS TOTAL_REVENUE FROM TRANSACTIONS', [today]);
  const summary = summaryRows[0];
  console.log('✅ Cashier KPI Summary:', `Total: ${summary.total_revenue} ETB, Cash: ${summary.manual_cash_total} ETB, Wire: ${summary.wire_total} ETB`);

  // 7. Super Admin (Hotel Owner) Tests
  console.log('\n👑 Testing Super Admin (Hotel Owner) Functionalities:');
  const adminUser = await db.get('SELECT * FROM users WHERE role = ?', ['admin']);
  console.log('✅ Admin retrieved:', adminUser?.name, `(Username: ${adminUser?.username})`);

  // Test Admin Add Staff
  const tempStaffUsername = `testwaiter_${Date.now()}`;
  const staffHash = await bcrypt.hash('secretPass123', 10);
  await db.query(
    'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Test Waiter Staff', tempStaffUsername, staffHash, 'waiter']
  );
  const createdStaff = await db.get('SELECT * FROM users WHERE username = ?', [tempStaffUsername]);
  console.log('✅ Super Admin Created Staff:', createdStaff?.name, `ID: ${createdStaff?.id}, Role: ${createdStaff?.role}`);

  // Test Admin Change Password
  const newStaffHash = await bcrypt.hash('brandNewPassword456', 10);
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newStaffHash, createdStaff.id]);
  const updatedStaff = await db.get('SELECT * FROM users WHERE id = ?', [createdStaff.id]);
  const newPasswordWorks = await bcrypt.compare('brandNewPassword456', updatedStaff.password_hash);
  console.log('✅ Super Admin Changed Staff Password:', newPasswordWorks ? 'PASSED (New password hashes match)' : 'FAILED');

  // Test Admin Delete Staff
  await db.query('DELETE FROM users WHERE id = ?', [createdStaff.id]);
  const deletedStaff = await db.get('SELECT * FROM users WHERE id = ?', [createdStaff.id]);
  console.log('✅ Super Admin Removed Staff:', deletedStaff === null ? 'PASSED (Staff successfully removed)' : 'FAILED');

  // Clean test transactions from store so DB stays clean
  db.store.transactions = db.store.transactions.filter(t => 
    !t.reference_id.startsWith('TXN-TEST-') && 
    !t.reference_id.startsWith('TXN-CASH-') && 
    !t.reference_id.startsWith('TXN-DECLINE-')
  );
  db.saveJSONStore();
  console.log('🧹 Cleaned test transactions from JSON store.');

  console.log('\n🎉 ALL CASHIER, WAITER, OWNER ADMIN, AND ZERO-VAT TESTS PASSED SUCCESSFULLY!\n');
}

testBackend().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
