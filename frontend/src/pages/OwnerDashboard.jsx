import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Building, 
  TrendingUp, 
  DollarSign, 
  Banknote, 
  Building2, 
  Users, 
  UserPlus, 
  Trash2, 
  Key, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Receipt, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Activity, 
  X, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function OwnerDashboard() {
  // Navigation Tabs within Super Admin
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'activities', 'staff'

  // Data States
  const [analytics, setAnalytics] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityStatusFilter, setActivityStatusFilter] = useState('');

  // Modal: Add Staff
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('waiter');
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');

  // Modal: Change Password
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Fetch Analytics & Activities
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.getHotelActivities(params);
      if (res.success) {
        setAnalytics(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load hotel operations data.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Staff List
  const fetchStaff = async () => {
    try {
      const res = await api.getStaffList();
      if (res.success) {
        setStaff(res.staff || []);
      }
    } catch (err) {
      console.error('Fetch staff error:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchStaff();
  }, [startDate, endDate]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const validatePasswordClient = (pwd) => {
    if (!pwd || pwd.length < 16) {
      return 'Password must be at least 16 characters long.';
    }
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9\s]/.test(pwd);
    const words = pwd.trim().split(/\s+/).filter(w => w.length >= 2);
    const isPassphrase = words.length >= 5;

    if (!((hasUpper && hasLower && hasNumber && hasSpecial) || isPassphrase)) {
      return 'Password must contain uppercase, lowercase, numbers, and symbols, OR be a passphrase of 5+ words.';
    }
    return null;
  };

  // Handle Create Staff
  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffError('');

    const validationErr = validatePasswordClient(newStaffPassword);
    if (validationErr) {
      setStaffError(validationErr);
      return;
    }

    try {
      setSubmittingStaff(true);
      const res = await api.createStaff({
        name: newStaffName,
        username: newStaffUsername,
        password: newStaffPassword,
        role: newStaffRole
      });
      if (res.success) {
        setShowAddStaffModal(false);
        setNewStaffName('');
        setNewStaffUsername('');
        setNewStaffPassword('');
        setNewStaffRole('waiter');
        fetchStaff();
        showToast(res.message || 'Staff member added successfully.');
      }
    } catch (err) {
      setStaffError(err.message || 'Failed to add staff member.');
    } finally {
      setSubmittingStaff(false);
    }
  };

  // Handle Delete Staff
  const handleDeleteStaff = async (staffMember) => {
    if (!window.confirm(`Are you sure you want to remove ${staffMember.name} (${staffMember.username}) from hotel staff?`)) {
      return;
    }
    try {
      const res = await api.deleteStaff(staffMember.id);
      if (res.success) {
        fetchStaff();
        showToast(res.message || 'Staff member removed.');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete staff member.');
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    setPasswordError('');

    const validationErr = validatePasswordClient(newPasswordInput);
    if (validationErr) {
      setPasswordError(validationErr);
      return;
    }

    try {
      setSavingPassword(true);
      const res = await api.changeStaffPassword(passwordModalUser.id, newPasswordInput);
      if (res.success) {
        setPasswordModalUser(null);
        setNewPasswordInput('');
        showToast(res.message || 'Password updated successfully.');
      }
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const totals = analytics?.totals || {
    totalRevenue: 0,
    cashTotal: 0,
    wireTotal: 0,
    totalOrders: 0,
    confirmedOrders: 0,
    declinedOrders: 0,
    pendingOrders: 0
  };

  const chartData = analytics?.chartData || [];
  const maxChartRevenue = chartData.reduce((max, d) => Math.max(max, d.revenue), 0) || 1;

  // Filtered Activities
  const activities = (analytics?.activities || []).filter(item => {
    const matchesSearch = !activitySearch.trim() || 
      (item.reference_id || '').toLowerCase().includes(activitySearch.toLowerCase()) ||
      (item.waiter_name || '').toLowerCase().includes(activitySearch.toLowerCase()) ||
      (item.table_number || '').toLowerCase().includes(activitySearch.toLowerCase()) ||
      (item.payment_method || '').toLowerCase().includes(activitySearch.toLowerCase());
    
    const matchesStatus = !activityStatusFilter || item.status === activityStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Super Admin Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-card">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-md">
            <Building className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Hotel Owner & Operations Hub
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider border border-emerald-300">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Live executive oversight of all tables, revenues, audit trails, and personnel
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Revenue Trends</span>
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'activities'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Hotel Activity Feed</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'staff'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Management ({staff.length})</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. OVERVIEW & REVENUE TRENDS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Hotel Revenue */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {totals.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm font-bold text-slate-400 ml-1.5">ETB</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {totals.confirmedOrders} confirmed orders
              </p>
            </div>

            {/* Total Cash Collected */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Physical Cash</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {totals.cashTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm font-bold text-slate-400 ml-1.5">ETB</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-2">
                {totals.totalRevenue > 0 ? `${Math.round((totals.cashTotal / totals.totalRevenue) * 100)}%` : '0%'} of all turnover
              </p>
            </div>

            {/* Total Wire / Bank Transfers */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Wire / Bank</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {totals.wireTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm font-bold text-slate-400 ml-1.5">ETB</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-2">
                {totals.totalRevenue > 0 ? `${Math.round((totals.wireTotal / totals.totalRevenue) * 100)}%` : '0%'} digital transfers
              </p>
            </div>

            {/* Staff & Orders */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Staff</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {staff.length}
                <span className="text-sm font-bold text-slate-400 ml-1.5">members</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-2">
                {staff.filter(s => s.role === 'waiter').length} waiters • {staff.filter(s => s.role === 'cashier').length} cashiers
              </p>
            </div>

          </div>

          {/* Visual Activity & Revenue Graph Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Daily Revenue & Payment Breakdown Graph</span>
                </h2>
                <p className="text-xs text-slate-500">Sorted chronologically by date</p>
              </div>

              {/* Date Filters */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center space-x-1.5 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-xs font-bold text-red-600 hover:underline px-2"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Visual Bar Chart */}
            {chartData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No transaction records available for the selected dates.
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <div className="flex items-end gap-3 h-64 border-b border-slate-100 pb-2 px-2 overflow-x-auto">
                  {chartData.map((d) => {
                    const hasRevenue = d.revenue > 0;
                    const heightPct = hasRevenue ? Math.max(10, Math.round((d.revenue / maxChartRevenue) * 100)) : 4;
                    const cashPct = hasRevenue ? (d.cashRevenue / d.revenue) * 100 : 0;
                    const wirePct = hasRevenue ? 100 - cashPct : 0;

                    return (
                      <div key={d.date} className="flex-1 min-w-[65px] max-w-[95px] flex flex-col items-center gap-2 group h-full justify-end">
                        {/* Hover Tooltip Amount */}
                        <div className="text-[10px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {d.revenue.toLocaleString()} ETB
                        </div>

                        {/* Stacked Bar */}
                        <div 
                          className="w-full rounded-2xl overflow-hidden flex flex-col justify-end bg-slate-100 shadow-xs transition-all duration-500 group-hover:scale-105"
                          style={{ height: `${heightPct}%` }}
                        >
                          {hasRevenue ? (
                            <>
                              {/* Wire portion (Blue) */}
                              {wirePct > 0 && (
                                <div 
                                  className="w-full bg-blue-500 hover:bg-blue-600 transition-colors"
                                  style={{ height: `${wirePct}%` }}
                                  title={`Wire: ${d.wireRevenue.toLocaleString()} ETB`}
                                />
                              )}
                              {/* Cash portion (Emerald) */}
                              {cashPct > 0 && (
                                <div 
                                  className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors"
                                  style={{ height: `${cashPct}%` }}
                                  title={`Cash: ${d.cashRevenue.toLocaleString()} ETB`}
                                />
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full bg-slate-200" title="0 ETB confirmed revenue" />
                          )}
                        </div>

                        {/* Date Label */}
                        <span className="text-[10px] font-bold text-slate-500 tracking-tight whitespace-nowrap">
                          {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Graph Legend */}
                <div className="flex items-center justify-center space-x-6 text-xs pt-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-500" />
                    <span className="text-slate-600 font-bold">Manual Cash Collected</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-md bg-blue-500" />
                    <span className="text-slate-600 font-bold">Wire / Bank Transfers</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HOTEL ACTIVITY FEED (ALL ACTIVITIES SORTED BY DATE) */}
      {/* ========================================================================= */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>All Hotel Activities & Transactions Log</span>
              </h2>
              <p className="text-xs text-slate-500">Every order and settlement sorted chronologically by timestamp</p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search table, waiter, bank..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>

              <select
                value={activityStatusFilter}
                onChange={(e) => setActivityStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="failed">Declined</option>
              </select>

              <div className="flex items-center space-x-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold text-[11px]">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <div className="flex items-center space-x-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold text-[11px]">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-xs font-bold text-red-600 hover:underline px-1.5"
                >
                  Reset
                </button>
              )}

              <button
                onClick={fetchAnalytics}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200 transition-colors"
                title="Refresh activities"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Activities Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Date / Time</th>
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3">Table</th>
                  <th className="px-3 py-3">Waiter</th>
                  <th className="px-3 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Amount (ETB)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400 italic">
                      No hotel activities match your filters.
                    </td>
                  </tr>
                ) : (
                  activities.map((act) => {
                    const isCash = act.payment_type === 'manual' || (act.payment_method || '').toLowerCase() === 'cash';
                    return (
                      <tr key={act.id || act.reference_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">
                            {new Date(act.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td className="px-3 py-3.5 font-mono font-bold text-slate-800 text-[11px]">
                          {act.reference_id}
                        </td>

                        <td className="px-3 py-3.5 font-extrabold text-emerald-700">
                          {act.table_number || 'T-1'}
                        </td>

                        <td className="px-3 py-3.5 font-semibold text-slate-800">
                          {act.waiter_name || 'Staff'}
                        </td>

                        <td className="px-3 py-3.5">
                          {isCash ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Banknote className="w-3 h-3" />
                              <span>Manual Cash</span>
                            </span>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-900 block">{act.payment_method || 'Telebirr'}</span>
                              {act.bank_tx_id && (
                                <span className="text-[10px] font-mono text-slate-500">Tx: {act.bank_tx_id}</span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                          {Number(act.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {act.status === 'confirmed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirmed</span>
                            </span>
                          ) : act.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="w-3 h-3" />
                              <span className="capitalize">{act.status}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STAFF MANAGEMENT TAB (WAITERS & CASHIERS) */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Hotel Staff Directory & Permissions</span>
              </h2>
              <p className="text-xs text-slate-500">Add, remove, and update credentials for waitstaff and cashier accounts</p>
            </div>

            <button
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          {/* Staff Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Staff Name</th>
                  <th className="px-3 py-3">Username / ID</th>
                  <th className="px-3 py-3">Assigned Role</th>
                  <th className="px-3 py-3">Orders Handled</th>
                  <th className="px-4 py-3 text-right">Revenue Generated</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {staff.map((member) => {
                  const isAdmin = member.role === 'admin';
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                          member.role === 'waiter' ? 'bg-amber-100 text-amber-800' :
                          member.role === 'cashier' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{member.name}</span>
                          <span className="text-[10px] text-slate-400">Added: {new Date(member.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 font-mono font-bold text-slate-700">
                        {member.username}
                      </td>

                      <td className="px-3 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          member.role === 'waiter' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          member.role === 'cashier' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}>
                          {member.role}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 font-bold text-slate-700">
                        {member.role === 'cashier'
                          ? `${member.confirmed_orders || 0} settled (${member.total_orders || 0} audited)`
                          : `${member.total_orders || 0} served (${member.confirmed_orders || 0} paid)`
                        }
                      </td>

                      <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                        {Number(member.total_revenue || 0).toLocaleString()} ETB
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Change Password Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordModalUser(member);
                              setNewPasswordInput('');
                              setPasswordError('');
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Reset / Change Password"
                          >
                            <Key className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          {/* Delete Staff Button (disabled for Admin) */}
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(member)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                              title={`Remove ${member.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ➕ MODAL: ADD STAFF MEMBER */}
      {/* ========================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-black text-slate-900">Add Hotel Staff Member</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {staffError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{staffError}</span>
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meron Hailu"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username / Login ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. waiter3 or cashier2"
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Temporary Password <span className="text-emerald-700 font-normal">(16+ chars, upper/lower/num/sym)</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 16 chars: e.g. Pass#Secure2026! or 5+ word passphrase"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Must be ≥16 chars with mixed cases, numbers, and symbols, or a 5+ word passphrase. Must be unique across all accounts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Position / Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStaffRole('waiter')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newStaffRole === 'waiter'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    🍽️ Waiter
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStaffRole('cashier')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newStaffRole === 'cashier'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    💵 Cashier
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {submittingStaff ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Create Staff Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔑 MODAL: CHANGE STAFF PASSWORD */}
      {/* ========================================================================= */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-black text-slate-900">Change Staff Password</span>
              </div>
              <button 
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Staff Member</span>
              <span className="font-extrabold text-slate-800 text-sm">{passwordModalUser.name}</span>
              <span className="text-slate-500 font-mono text-[11px] block">({passwordModalUser.username} • {passwordModalUser.role})</span>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password <span className="text-emerald-700 font-normal">(16+ chars, upper/lower/num/sym)</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Min 16 chars: e.g. Pass#Secure2026! or 5+ word passphrase"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Must be ≥16 chars with mixed cases, numbers, and symbols, or a 5+ word passphrase. Cannot reuse another staff member's password.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {savingPassword ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
