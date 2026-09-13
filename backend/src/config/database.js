const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbInstance = null;
let dbType = process.env.DB_TYPE || 'sqlite';

class DatabaseAdapter {
  constructor() {
    this.type = dbType;
  }

  async init() {
    if (this.type === 'mysql') {
      try {
        const mysql = require('mysql2/promise');
        this.pool = mysql.createPool({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'payverify_db',
          port: parseInt(process.env.DB_PORT || '3306', 10),
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        });
        await this.pool.getConnection();
        console.log(' Connected to MySQL database successfully.');
        await this.initMySQLTables();
        return;
      } catch (err) {
        console.warn('⚠️ Could not connect to MySQL. Falling back to local SQLite database...', err.message);
        this.type = 'sqlite';
      }
    }

    // SQLite or lightweight fallback
    try {
      const Database = require('better-sqlite3');
      const dbDir = path.join(__dirname, '../../data');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      const dbPath = path.join(dbDir, 'payverify.db');
      this.sqlite = new Database(dbPath);
      console.log(` Connected to SQLite database at: ${dbPath}`);
      this.initSQLiteTables();
    } catch (err) {
      console.warn('ℹ️ Using zero-config JSON database engine:', err.message);
      this.type = 'json';
      await this.initJSONStore();
    }
  }

  async initJSONStore() {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.storePath = path.join(dataDir, 'store.json');
    if (!fs.existsSync(this.storePath)) {
      this.store = { users: [], services: [], transactions: [] };
      fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2));
    } else {
      try {
        this.store = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
      } catch (e) {
        this.store = { users: [], services: [], transactions: [] };
      }
    }
    await this.seedDefaults();
  }

  saveJSONStore() {
    if (this.type === 'json' && this.storePath) {
      fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2));
    }
  }

  initSQLiteTables() {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('waiter', 'cashier')) NOT NULL DEFAULT 'waiter',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'utensils',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_id TEXT UNIQUE NOT NULL,
        waiter_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        table_number TEXT DEFAULT 'T-1',
        amount REAL NOT NULL,
        vat_amount REAL DEFAULT 0.00,
        gateway TEXT DEFAULT 'cashier',
        payment_method TEXT NOT NULL,
        payment_type TEXT DEFAULT 'wire',
        customer_phone TEXT DEFAULT '',
        bank_tx_id TEXT DEFAULT '',
        status TEXT CHECK(status IN ('pending', 'confirmed', 'failed', 'cancelled')) NOT NULL DEFAULT 'pending',
        gateway_reference_id TEXT,
        items TEXT DEFAULT '[]',
        decline_reason TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        confirmed_at DATETIME DEFAULT NULL,
        confirmed_by INTEGER DEFAULT NULL,
        FOREIGN KEY (waiter_id) REFERENCES users(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      );

      CREATE TABLE IF NOT EXISTS active_tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number TEXT NOT NULL,
        waiter_id INTEGER NOT NULL,
        service_id INTEGER DEFAULT 1,
        items TEXT DEFAULT '[]',
        amount REAL DEFAULT 0.00,
        vat_amount REAL DEFAULT 0.00,
        customer_phone TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (waiter_id) REFERENCES users(id),
        UNIQUE(table_number, waiter_id)
      );
    `);

    this.seedDefaults();
  }

  async initMySQLTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('waiter', 'cashier', 'admin') NOT NULL DEFAULT 'waiter',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        icon VARCHAR(50) DEFAULT 'utensils',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference_id VARCHAR(64) UNIQUE NOT NULL,
        waiter_id INT NOT NULL,
        service_id INT NOT NULL,
        table_number VARCHAR(20) DEFAULT 'T-1',
        amount DECIMAL(10, 2) NOT NULL,
        vat_amount DECIMAL(10, 2) DEFAULT 0.00,
        gateway VARCHAR(50) DEFAULT 'cashier',
        payment_method VARCHAR(100) NOT NULL,
        payment_type VARCHAR(20) DEFAULT 'wire',
        customer_phone VARCHAR(20) DEFAULT '',
        bank_tx_id VARCHAR(100) DEFAULT '',
        status ENUM('pending', 'confirmed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
        gateway_reference_id VARCHAR(100),
        items TEXT,
        decline_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP NULL DEFAULT NULL,
        confirmed_by INT NULL DEFAULT NULL,
        FOREIGN KEY (waiter_id) REFERENCES users(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      );
    `);

    await this.seedDefaults();
  }

  async seedDefaults() {
    // Pre-computed bcrypt hashes (round 10) of strong 16+ character demo passwords.
    // These avoid hashing 'password123' at startup and enforce strong credentials from day one.
    const SEED_HASHES = {
      waiter1:  '$2a$10$7TiMl3UVSESNOP4HotI9ZOVL/bzEG.efOf2gFoxSCW.P.2u8qbYNC', // Waiter1#SecureP@ss2026!
      waiter2:  '$2a$10$3.OFDaKBwR/1ST6BBvaYB..d4WtIGlI8IcsNCEHZn15hOJPwshC0u', // Waiter2#SecureP@ss2026!
      cashier1: '$2a$10$2LlJzTkVxDlf8w1vSQzqEue5cKMAcjRh62aWyeFphyySW.jhacyOm', // Cashier1#DeskP@ss2026!
      admin:    '$2a$10$YBf17eGevsvfWwYgurLx2./3xKWTU7MFFczeY9jVUbg.uuGUalfr.', // Admin#HotelOwnerP@ss2026!
    };

    if (this.type === 'json') {
      if (!this.store.users || this.store.users.length === 0) {
        this.store.users = [
          { id: 1, name: 'Abebe Bikila', username: 'waiter1', password_hash: SEED_HASHES.waiter1, role: 'waiter', created_at: new Date().toISOString() },
          { id: 2, name: 'Tigist Assefa', username: 'waiter2', password_hash: SEED_HASHES.waiter2, role: 'waiter', created_at: new Date().toISOString() },
          { id: 3, name: 'Yosef Addisu', username: 'cashier1', password_hash: SEED_HASHES.cashier1, role: 'cashier', created_at: new Date().toISOString() },
          { id: 4, name: 'Hotel Owner (Admin)', username: 'admin', password_hash: SEED_HASHES.admin, role: 'admin', created_at: new Date().toISOString() }
        ];
      }
      if (!this.store.services || this.store.services.length === 0) {
        this.store.services = [
          { id: 1, name: 'Food', icon: 'Utensils' },
          { id: 2, name: 'Drinks', icon: 'Wine' },
          { id: 3, name: 'Other', icon: 'Tag' }
        ];
      }
      if (!this.store.menu_items || this.store.menu_items.length === 0) {
        this.store.menu_items = [
          { id: 1, name: 'Special Tibs', price: 450, category: 'Food' },
          { id: 2, name: 'Shekla Tibs', price: 500, category: 'Food' },
          { id: 3, name: 'Special Kitfo', price: 550, category: 'Food' },
          { id: 4, name: 'Doro Wat', price: 480, category: 'Food' },
          { id: 5, name: 'Shiro Tegamino', price: 220, category: 'Food' },
          { id: 6, name: 'Yetsom Beyaynetu', price: 200, category: 'Food' },
          { id: 7, name: 'St. George Beer', price: 90, category: 'Drinks' },
          { id: 8, name: 'Habesha Beer', price: 95, category: 'Drinks' },
          { id: 9, name: 'Walia Beer', price: 90, category: 'Drinks' },
          { id: 10, name: 'Rift Valley Wine', price: 190, category: 'Drinks' },
          { id: 11, name: 'Soft Drink / Soda', price: 50, category: 'Drinks' },
          { id: 12, name: 'Ambo Sparkling Water', price: 45, category: 'Drinks' },
          { id: 13, name: 'Ethiopian Macchiato', price: 40, category: 'Drinks' },
          { id: 14, name: 'Service Fee / Misc', price: 100, category: 'Other' }
        ];
      }
      if (!this.store.transactions) {
        this.store.transactions = [];
      }
      if (!this.store.active_tables) {
        this.store.active_tables = [];
      }
      this.saveJSONStore();
      console.log('👤 JSON Store ready with default users and services.');
      return;
    }

    if (this.type === 'sqlite') {
      const userCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM users').get().count;
      if (userCount === 0) {
        const insertUser = this.sqlite.prepare('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)');
        insertUser.run('Abebe Bikila',       'waiter1',  SEED_HASHES.waiter1,  'waiter');
        insertUser.run('Tigist Assefa',      'waiter2',  SEED_HASHES.waiter2,  'waiter');
        insertUser.run('Yosef Addisu',       'cashier1', SEED_HASHES.cashier1, 'cashier');
        insertUser.run('Hotel Owner (Admin)', 'admin',   SEED_HASHES.admin,    'admin');
        console.log('👤 Seeded default users with strong passwords (see README for credentials)');
      }

      const serviceCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM services').get().count;
      if (serviceCount === 0) {
        const insertService = this.sqlite.prepare('INSERT INTO services (name, icon) VALUES (?, ?)');
        insertService.run('Food', 'Utensils');
        insertService.run('Drinks', 'Wine');
        insertService.run('Other', 'Tag');
        console.log('🍽️ Seeded default services (Food, Drinks, Other)');
      }
    } else {
      const [rows] = await this.pool.query('SELECT COUNT(*) as count FROM users');
      if (rows[0].count === 0) {
        await this.pool.query(
          'INSERT INTO users (name, username, password_hash, role) VALUES ?',
          [[
            ['Abebe Bikila',        'waiter1',  SEED_HASHES.waiter1,  'waiter'],
            ['Tigist Assefa',       'waiter2',  SEED_HASHES.waiter2,  'waiter'],
            ['Yosef Addisu',        'cashier1', SEED_HASHES.cashier1, 'cashier'],
            ['Hotel Owner (Admin)', 'admin',    SEED_HASHES.admin,    'admin']
          ]]
        );
        console.log('👤 Seeded default users with strong passwords (see README for credentials)');
      }

      const [sRows] = await this.pool.query('SELECT COUNT(*) as count FROM services');
      if (sRows[0].count === 0) {
        await this.pool.query(
          'INSERT INTO services (name, icon) VALUES ?',
          [[
            ['Food', 'Utensils'],
            ['Drinks', 'Wine'],
            ['Other', 'Tag']
          ]]
        );
      }
    }
  }

  async query(sql, params = []) {
    if (this.type === 'json') {
      return this.executeJSONQuery(sql, params);
    }
    if (this.type === 'sqlite') {
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sql);
      if (isSelect) {
        const stmt = this.sqlite.prepare(sql);
        return stmt.all(...params);
      } else {
        const stmt = this.sqlite.prepare(sql);
        const info = stmt.run(...params);
        return { insertId: info.lastInsertRowid, affectedRows: info.changes };
      }
    } else {
      const [results] = await this.pool.query(sql, params);
      return results;
    }
  }

  async get(sql, params = []) {
    if (this.type === 'json') {
      const rows = this.executeJSONQuery(sql, params);
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }
    if (this.type === 'sqlite') {
      const stmt = this.sqlite.prepare(sql);
      return stmt.get(...params);
    } else {
      const [rows] = await this.pool.query(sql, params);
      return rows[0] || null;
    }
  }

  executeJSONQuery(sql, params) {
    const s = sql.trim().toUpperCase();
    
    // 1. Users Queries
    if (s.startsWith('INSERT INTO USERS')) {
      const newId = this.store.users.length > 0 ? Math.max(...this.store.users.map(u => Number(u.id) || 0)) + 1 : 1;
      const newUser = {
        id: newId,
        name: params[0],
        username: params[1],
        password_hash: params[2],
        role: params[3] || 'waiter',
        created_at: new Date().toISOString()
      };
      this.store.users.push(newUser);
      this.saveJSONStore();
      return { insertId: newId, affectedRows: 1 };
    }
    if (s.startsWith('DELETE FROM USERS') && s.includes('WHERE ID = ?')) {
      const targetId = Number(params[0]);
      const initialLen = this.store.users.length;
      this.store.users = this.store.users.filter(u => Number(u.id) !== targetId);
      this.saveJSONStore();
      return { affectedRows: initialLen - this.store.users.length };
    }
    if (s.startsWith('UPDATE USERS SET PASSWORD_HASH = ?') && s.includes('WHERE ID = ?')) {
      const targetId = Number(params[1]);
      const u = this.store.users.find(x => Number(x.id) === targetId);
      if (u) {
        u.password_hash = params[0];
        this.saveJSONStore();
      }
      return { affectedRows: u ? 1 : 0 };
    }
    if (s === 'SELECT * FROM USERS' || s.startsWith('SELECT * FROM USERS ORDER')) {
      return this.store.users;
    }
    if (s.includes('FROM USERS') && s.includes('WHERE USERNAME = ?')) {
      return this.store.users.filter(u => u.username === params[0]);
    }
    if (s.includes('FROM USERS') && s.includes('WHERE ROLE = ?')) {
      return this.store.users.filter(u => u.role === params[0]);
    }
    if (s.includes('FROM USERS') && s.includes('WHERE ID = ?')) {
      return this.store.users.filter(u => Number(u.id) === Number(params[0]));
    }
    if (s.includes('FROM USERS')) {
      return this.store.users;
    }

    // 2. Services Queries
    if (s.startsWith('SELECT * FROM SERVICES')) {
      return this.store.services;
    }

    // 3. Insert Transaction
    if (s.startsWith('INSERT INTO TRANSACTIONS')) {
      const newId = this.store.transactions.length + 1;
      // NOTE: The SQL has 'cashier' hardcoded for `gateway` — NOT a ? placeholder.
      // So the params array maps as:
      //   [0]=reference_id [1]=waiter_id [2]=service_id [3]=table_number
      //   [4]=amount [5]=vat_amount  (gateway is hardcoded 'cashier')
      //   [6]=payment_method [7]=payment_type [8]=customer_phone [9]=bank_tx_id
      //   [10]=gateway_reference_id [11]=items
      const paymentMethod = params[6] || 'Telebirr';
      const paymentType = params[7] || (paymentMethod.toLowerCase() === 'cash' ? 'manual' : 'wire');
      const newTx = {
        id: newId,
        reference_id: params[0],
        waiter_id: params[1],
        service_id: params[2],
        table_number: params[3],
        amount: parseFloat(params[4]),
        vat_amount: parseFloat(params[5]),
        gateway: 'cashier',
        payment_method: paymentMethod,
        payment_type: paymentType,
        customer_phone: params[8] || '',
        bank_tx_id: params[9] || '',
        status: 'pending',
        gateway_reference_id: params[10] || params[9] || params[0],
        items: params[11] ? (typeof params[11] === 'string' ? JSON.parse(params[11]) : params[11]) : [],
        decline_reason: null,
        created_at: new Date().toISOString(),
        confirmed_at: null,
        confirmed_by: null
      };
      this.store.transactions.push(newTx);
      this.saveJSONStore();
      return { insertId: newId, affectedRows: 1 };
    }

    // 4. Update Transaction Status
    if (s.includes("STATUS = 'CONFIRMED'") && s.includes('CONFIRMED_AT = ?') && s.includes('CONFIRMED_BY = ?')) {
      const refId = params[2];
      const tx = this.store.transactions.find(t => t.reference_id === refId);
      if (tx) {
        tx.status = 'confirmed';
        tx.confirmed_at = params[0];
        tx.confirmed_by = params[1];
        tx.decline_reason = null;
        this.saveJSONStore();
      }
      return { affectedRows: tx ? 1 : 0 };
    }

    if (s.includes("STATUS = 'FAILED'") && s.includes('DECLINE_REASON = ?')) {
      const refId = params[1];
      const tx = this.store.transactions.find(t => t.reference_id === refId);
      if (tx) {
        tx.status = 'failed';
        tx.decline_reason = params[0];
        this.saveJSONStore();
      }
      return { affectedRows: tx ? 1 : 0 };
    }

    if (s.includes('UPDATE TRANSACTIONS SET STATUS = ?, CONFIRMED_AT = ?, CONFIRMED_BY = ? WHERE REFERENCE_ID = ?')) {
      const tx = this.store.transactions.find(t => t.reference_id === params[3]);
      if (tx) {
        tx.status = params[0];
        tx.confirmed_at = params[1];
        tx.confirmed_by = params[2];
        tx.decline_reason = null;
        this.saveJSONStore();
      }
      return { affectedRows: tx ? 1 : 0 };
    }

    if (s.includes('UPDATE TRANSACTIONS SET STATUS = ?, DECLINE_REASON = ? WHERE REFERENCE_ID = ?')) {
      const tx = this.store.transactions.find(t => t.reference_id === params[2]);
      if (tx) {
        tx.status = params[0];
        tx.decline_reason = params[1];
        this.saveJSONStore();
      }
      return { affectedRows: tx ? 1 : 0 };
    }

    if (s.startsWith('UPDATE TRANSACTIONS SET STATUS = ? WHERE REFERENCE_ID = ?')) {
      const tx = this.store.transactions.find(t => t.reference_id === params[1]);
      if (tx) {
        tx.status = params[0];
        this.saveJSONStore();
      }
      return { affectedRows: tx ? 1 : 0 };
    }
    if (s.startsWith('UPDATE TRANSACTIONS SET STATUS = ?, CONFIRMED_AT = ? WHERE REFERENCE_ID = ?')) {
      const tx = this.store.transactions.find(t => t.reference_id === params[2]);
      if (tx) {
        tx.status = params[0];
        tx.confirmed_at = params[1];
        this.saveJSONStore();
      }
      return { affectedRows: tx ? 1 : 0 };
    }

    // 4b. Pending Verifications Queue for Cashier
    if (s.includes('FROM TRANSACTIONS T') && s.includes("WHERE T.STATUS = 'PENDING'")) {
      const pendingTxs = this.store.transactions.filter(t => t.status === 'pending');
      return pendingTxs.map(tx => {
        const user = this.store.users.find(u => u.id === tx.waiter_id) || {};
        const service = this.store.services.find(sv => sv.id === tx.service_id) || {};
        return { ...tx, service_name: service.name || 'Food', waiter_name: user.name || 'Waiter' };
      }).reverse();
    }

    // 5. Get Single Transaction by Reference
    if (s.includes('FROM TRANSACTIONS T') && s.includes('WHERE T.REFERENCE_ID = ?')) {
      const tx = this.store.transactions.find(t => t.reference_id === params[0]);
      if (!tx) return [];
      const user = this.store.users.find(u => u.id === tx.waiter_id) || {};
      const service = this.store.services.find(sv => sv.id === tx.service_id) || {};
      return [{ ...tx, service_name: service.name || 'Food', waiter_name: user.name || 'Staff' }];
    }

    // 6. Cashier Daily Summary
    if (s.includes('FROM TRANSACTIONS') && s.includes('COUNT(*) AS TOTAL_COUNT')) {
      const targetDate = params[0];
      const matching = this.store.transactions.filter(t => !targetDate || t.created_at.slice(0, 10) === targetDate);
      const confirmed = matching.filter(t => t.status === 'confirmed');
      const totalRev = confirmed.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
      const totalVat = confirmed.reduce((acc, t) => acc + (parseFloat(t.vat_amount) || 0), 0);
      
      const manualConfirmed = confirmed.filter(t => t.payment_type === 'manual' || (t.payment_method || '').toLowerCase() === 'cash');
      const wireConfirmed = confirmed.filter(t => t.payment_type !== 'manual' && (t.payment_method || '').toLowerCase() !== 'cash');
      
      const manualCashTotal = manualConfirmed.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
      const wireTotal = wireConfirmed.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

      return [{
        total_revenue: totalRev,
        total_vat: totalVat,
        confirmed_count: confirmed.length,
        pending_count: matching.filter(t => t.status === 'pending').length,
        failed_count: matching.filter(t => t.status === 'failed').length,
        total_count: matching.length,
        manual_cash_total: manualCashTotal,
        manual_cash_count: manualConfirmed.length,
        wire_total: wireTotal,
        wire_count: wireConfirmed.length
      }];
    }

    // 7. Service Breakdown
    if (s.includes('FROM SERVICES S') && s.includes('GROUP BY S.ID')) {
      const targetDate = params[0];
      return this.store.services.map(svc => {
        const txs = this.store.transactions.filter(t => t.service_id === svc.id && t.status === 'confirmed' && (!targetDate || t.created_at.slice(0, 10) === targetDate));
        return {
          service_id: svc.id,
          service_name: svc.name,
          service_icon: svc.icon,
          transaction_count: txs.length,
          total_amount: txs.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0),
          total_vat: txs.reduce((a, b) => a + (parseFloat(b.vat_amount) || 0), 0)
        };
      });
    }

    // 8. Provider / Bank Breakdown (Telebirr, CBE Birr, BoA, Awash, Cash, etc.)
    if ((s.includes('FROM TRANSACTIONS') && s.includes('GROUP BY PAYMENT_METHOD')) || (s.includes('FROM TRANSACTIONS') && s.includes('GROUP BY GATEWAY'))) {
      const targetDate = params[0];
      const matchingTxs = this.store.transactions.filter(t => t.status === 'confirmed' && (!targetDate || t.created_at.slice(0, 10) === targetDate));
      
      const providerMap = {};
      matchingTxs.forEach(t => {
        const pName = t.payment_method || (t.payment_type === 'manual' ? 'Cash' : 'Telebirr');
        if (!providerMap[pName]) {
          providerMap[pName] = { 
            payment_method: pName, 
            gateway: pName, 
            payment_type: t.payment_type || (pName.toLowerCase() === 'cash' ? 'manual' : 'wire'),
            count: 0, 
            total_amount: 0 
          };
        }
        providerMap[pName].count += 1;
        providerMap[pName].total_amount += (parseFloat(t.amount) || 0);
      });

      return Object.values(providerMap);
    }

    // 9. Waiter Daily Performance Aggregation
    if (s.includes('GROUP BY WAITER_ID') || s.includes('WAITERS_SUMMARY')) {
      const targetDate = params[0];
      const waiters = this.store.users.filter(u => u.role === 'waiter');
      return waiters.map(w => {
        const waiterTxs = this.store.transactions.filter(t => t.waiter_id === w.id && (!targetDate || t.created_at.slice(0, 10) === targetDate));
        const confirmed = waiterTxs.filter(t => t.status === 'confirmed');
        const totalAmount = confirmed.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
        
        const manualTxs = confirmed.filter(t => t.payment_type === 'manual' || (t.payment_method || '').toLowerCase() === 'cash');
        const wireTxs = confirmed.filter(t => t.payment_type !== 'manual' && (t.payment_method || '').toLowerCase() !== 'cash');

        return {
          waiter_id: w.id,
          waiter_name: w.name,
          waiter_username: w.username,
          total_revenue: totalAmount,
          orders_count: waiterTxs.length,
          confirmed_count: confirmed.length,
          pending_count: waiterTxs.filter(t => t.status === 'pending').length,
          failed_count: waiterTxs.filter(t => t.status === 'failed' || t.status === 'cancelled').length,
          manual_cash_total: manualTxs.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0),
          manual_cash_count: manualTxs.length,
          wire_total: wireTxs.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0),
          wire_count: wireTxs.length
        };
      });
    }

    // 10. Filterable Transaction Audit Log List & Count
    let filtered = [...this.store.transactions];

    if (s.includes('WHERE T.WAITER_ID = ?') || s.includes('WHERE WAITER_ID = ?')) {
      filtered = filtered.filter(t => Number(t.waiter_id) === Number(params[0]));
    }

    // Enrich with names
    let enriched = filtered.map(t => {
      const u = this.store.users.find(x => x.id === t.waiter_id) || {};
      const sv = this.store.services.find(x => x.id === t.service_id) || {};
      return { 
        ...t, 
        waiter_name: u.name || 'Staff', 
        waiter_username: u.username || '', 
        service_name: sv.name || 'Food' 
      };
    });

    // Check count query
    if (s.startsWith('SELECT COUNT(*) AS TOTAL FROM TRANSACTIONS')) {
      return [{ total: enriched.length }];
    }

    return enriched.reverse();
  }
}

const db = new DatabaseAdapter();

module.exports = db;
