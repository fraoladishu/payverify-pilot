const API_BASE_URL = '/api';

export const api = {
  getToken() {
    return localStorage.getItem('payverify_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('payverify_token', token);
    } else {
      localStorage.removeItem('payverify_token');
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid session
          if (endpoint !== '/auth/login') {
            this.setToken(null);
            window.location.reload();
          }
        }
        throw new Error(data.message || 'API request failed');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getProfile() {
    return await this.request('/auth/profile');
  },

  async getServices() {
    return await this.request('/services');
  },

  // Custom Menu Library (Persistent across sessions & staff)
  async getMenuItems() {
    return await this.request('/menu');
  },

  async saveMenuItem(itemData) {
    return await this.request('/menu', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  },

  async deleteMenuItem(id) {
    return await this.request(`/menu/${id}`, {
      method: 'DELETE'
    });
  },

  // Multi-Table Real-Time Tab Tracking
  async getActiveTables() {
    return await this.request('/tables/active');
  },

  async saveTableOrder(tableData) {
    return await this.request('/tables/update', {
      method: 'POST',
      body: JSON.stringify(tableData)
    });
  },

  async deleteTableOrder(tableNumber) {
    return await this.request(`/tables/${encodeURIComponent(tableNumber)}`, {
      method: 'DELETE'
    });
  },

  // Waiter Transactions
  async createTransaction(payload) {
    return await this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getTransactionStatus(referenceId) {
    return await this.request(`/transactions/${referenceId}/status`);
  },

  async cancelTransaction(referenceId) {
    return await this.request(`/transactions/${referenceId}/cancel`, {
      method: 'POST'
    });
  },

  async getMyRecentTransactions() {
    return await this.request('/transactions/my-recent');
  },

  // Cashier Real-Time Verification
  async getPendingVerifications() {
    return await this.request('/transactions/pending-verification');
  },

  async cashierVerifyTransaction(referenceId) {
    return await this.request(`/transactions/${referenceId}/cashier-verify`, {
      method: 'POST'
    });
  },

  async cashierDeclineTransaction(referenceId, reason) {
    return await this.request(`/transactions/${referenceId}/cashier-decline`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // Cashier Reports
  async getDailySummary(date) {
    const query = date ? `?date=${date}` : '';
    return await this.request(`/reports/daily-summary${query}`);
  },

  async getWaitersDailySummary(date) {
    const query = date ? `?date=${date}` : '';
    return await this.request(`/reports/waiters-summary${query}`);
  },

  async getTransactionHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/reports/transactions${query ? '?' + query : ''}`);
  },

  // Super Admin (Hotel Owner) Management
  async getStaffList() {
    return await this.request('/admin/staff');
  },

  async createStaff(staffData) {
    return await this.request('/admin/staff', {
      method: 'POST',
      body: JSON.stringify(staffData)
    });
  },

  async deleteStaff(staffId) {
    return await this.request(`/admin/staff/${staffId}`, {
      method: 'DELETE'
    });
  },

  async changeStaffPassword(staffId, newPassword) {
    return await this.request(`/admin/staff/${staffId}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  },

  async getHotelActivities(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/admin/activities?${query}`);
  }
};
