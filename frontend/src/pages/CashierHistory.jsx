import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ETHIOPIAN_PAYMENT_ACCOUNTS } from '../services/providers';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Receipt,
  X,
  Banknote
} from 'lucide-react';

export default function CashierHistory({ onBackToDashboard }) {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [waiterFilter, setWaiterFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(0);
  const limit = 20;

  // Waiter performance sidebar state
  const [waiterStats, setWaiterStats] = useState([]);
  const [dayTotalWorked, setDayTotalWorked] = useState(0);
  const [loadingWaiters, setLoadingWaiters] = useState(false);

  // Expandable row for item details
  const [expandedTxId, setExpandedTxId] = useState(null);

  const fetchWaitersSummary = async (date) => {
    try {
      setLoadingWaiters(true);
      const res = await api.getWaitersDailySummary(date);
      if (res.success) {
        setWaiterStats(res.waiters || []);
        setDayTotalWorked(res.grandTotalDayRevenue || 0);
      }
    } catch (err) {
      console.error('Waiter summary error:', err);
    } finally {
      setLoadingWaiters(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {
        limit,
        offset: page * limit
      };
      if (dateFilter) params.date = dateFilter;
      if (statusFilter) params.status = statusFilter;
      if (bankFilter) params.payment_method = bankFilter;
      if (paymentTypeFilter) params.payment_type = paymentTypeFilter;
      if (waiterFilter) params.waiter_id = waiterFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await api.getTransactionHistory(params);
      if (res.success) {
        setTransactions(res.transactions);
        setTotal(res.total);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchWaitersSummary(dateFilter);
  }, [dateFilter, statusFilter, bankFilter, paymentTypeFilter, waiterFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchHistory();
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setBankFilter('');
    setPaymentTypeFilter('');
    setWaiterFilter('');
    setSearchTerm('');
    setPage(0);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['Reference ID', 'Date/Time', 'Table', 'Waiter', 'Payment Type', 'Service', 'Items', 'Amount (ETB)', 'Bank/Provider', 'Bank Tx ID', 'Phone', 'Status', 'Decline Reason'];
    const rows = transactions.map(t => {
      const isCash = (t.payment_type === 'manual') || ((t.payment_method || '').toLowerCase() === 'cash');
      const itemsStr = t.items && Array.isArray(t.items) ? t.items.map(i => `${i.name} (${i.quantity})`).join('; ') : 'N/A';
      return [
        t.reference_id,
        t.created_at,
        t.table_number || 'N/A',
        t.waiter_name || 'N/A',
        isCash ? 'Manual Cash' : 'Wire Transfer',
        t.service_name || 'N/A',
        `"${itemsStr}"`,
        t.amount,
        isCash ? 'Manual Cash' : (t.payment_method || 'Telebirr'),
        t.bank_tx_id || (isCash ? 'N/A (Cash)' : 'N/A'),
        t.customer_phone || 'N/A',
        t.status,
        t.decline_reason ? `"${t.decline_reason}"` : ''
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayVerify_AuditLog_${dateFilter || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Confirmed</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
    }
  };

  const hasActiveFilters = Boolean(statusFilter || bankFilter || paymentTypeFilter || waiterFilter || searchTerm);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
        <div className="flex items-center space-x-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Transaction Audit Log
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Itemized requests & waiter performance for {dateFilter ? new Date(dateFilter).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'All Dates'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setDateFilter(dateFilter ? '' : new Date().toISOString().slice(0, 10)); setPage(0); }}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${
              !dateFilter 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {dateFilter ? 'Show All Dates' : 'Show Today Only'}
          </button>

          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
              className="pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors"
            />
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid: Table Area (Left) + Waiter Performance Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Filter Controls & Transactions Data Table (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-card space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              
              {/* Search Box */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Ref, Phone, Table, Item..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </form>

              {/* Payment Type Filter */}
              <div>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => { setPaymentTypeFilter(e.target.value); setPage(0); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Payment Types</option>
                  <option value="manual">💵 Manual Cash Only</option>
                  <option value="wire">🏦 Bank / Wire Only</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Statuses</option>
                  <option value="confirmed">Confirmed (Paid)</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed / Timeout</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Bank / Provider Filter */}
              <div>
                <select
                  value={bankFilter}
                  onChange={(e) => { setBankFilter(e.target.value); setPage(0); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Banks / Wallets</option>
                  {ETHIOPIAN_PAYMENT_ACCOUNTS.map(acc => (
                    <option key={acc.id} value={acc.name}>{acc.name}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Active Filters Tag Bar */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-medium">Active filters:</span>
                  {waiterFilter && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 flex items-center gap-1">
                      Waiter: {waiterStats.find(w => String(w.waiter_id) === String(waiterFilter))?.name || 'Selected'}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setWaiterFilter('')} />
                    </span>
                  )}
                  {statusFilter && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-lg capitalize flex items-center gap-1">
                      {statusFilter}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter('')} />
                    </span>
                  )}
                  {paymentTypeFilter && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 flex items-center gap-1">
                      Type: {paymentTypeFilter === 'manual' ? 'Manual Cash' : 'Wire / Bank'}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setPaymentTypeFilter('')} />
                    </span>
                  )}
                  {bankFilter && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-lg flex items-center gap-1">
                      {bankFilter}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setBankFilter('')} />
                    </span>
                  )}
                  {searchTerm && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-lg flex items-center gap-1">
                      "{searchTerm}"
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-red-600 hover:underline shrink-0"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Transactions Data Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] uppercase font-extrabold tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3.5">Reference & Time</th>
                    <th className="px-3 py-3.5">Table</th>
                    <th className="px-3 py-3.5">Waiter</th>
                    <th className="px-4 py-3.5">Bank & Tx ID</th>
                    <th className="px-3 py-3.5">Order Items</th>
                    <th className="px-4 py-3.5 text-right">Total (ETB)</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Loading transactions...</span>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                        <p className="mb-2">No transactions found for the selected filters.</p>
                        <button
                          onClick={handleClearFilters}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors"
                        >
                          View All Dates & Clear Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => {
                      const isExpanded = expandedTxId === t.id;
                      const hasItems = t.items && Array.isArray(t.items) && t.items.length > 0;
                      return (
                        <React.Fragment key={t.id}>
                          <tr className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5">
                              <span className="font-mono font-bold text-slate-900 block">{t.reference_id}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            <td className="px-3 py-3.5 font-bold text-emerald-700">
                              {t.table_number || 'T-14'}
                            </td>

                            <td className="px-3 py-3.5 font-semibold text-slate-800">
                              {t.waiter_name}
                            </td>

                            <td className="px-4 py-3.5">
                              {((t.payment_type === 'manual') || ((t.payment_method || '').toLowerCase() === 'cash')) ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <Banknote className="w-3 h-3" />
                                    <span>Manual Cash</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-0.5 block">Physical Paper Cash</span>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-bold text-slate-900 leading-tight">
                                    {t.payment_method || 'Telebirr'}
                                  </p>
                                  {t.bank_tx_id ? (
                                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block font-bold mt-1">
                                      Tx: {t.bank_tx_id}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 mt-0.5 block">Ref: {t.reference_id?.slice(-6)}</span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-3.5">
                              {hasItems ? (
                                <button
                                  onClick={() => setExpandedTxId(isExpanded ? null : t.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors"
                                >
                                  <Receipt className="w-3 h-3 text-emerald-600" />
                                  <span>{t.items.length} items</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px]">{t.service_name || 'Food'}</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                              {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              {getStatusBadge(t.status)}
                              {t.decline_reason && (
                                <span className="text-[10px] text-red-600 font-medium block mt-1 max-w-[130px] truncate mx-auto" title={t.decline_reason}>
                                  "{t.decline_reason}"
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Itemized Bill Row */}
                          {isExpanded && hasItems && (
                            <tr className="bg-slate-50/80">
                              <td colSpan="7" className="px-6 py-3 border-y border-slate-100">
                                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                      Itemized Order Breakdown (Table {t.table_number || 'T-14'})
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      Customer: {t.customer_phone}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    {t.items.map((item, i) => (
                                      <div key={i} className="flex justify-between items-center text-xs p-1.5 rounded-lg bg-slate-50">
                                        <span className="font-semibold text-slate-800">
                                          {item.name} <span className="text-slate-400">× {item.quantity}</span>
                                        </span>
                                        <span className="font-bold text-slate-700">
                                          {(item.price * item.quantity).toLocaleString()} ETB
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {transactions.length > 0 ? page * limit + 1 : 0} to {Math.min((page + 1) * limit, total)} of {total} entries
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-700 px-2">Page {page + 1}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Waiter Daily Performance Breakdown Sidebar (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Waiter Work Shift</h3>
                  <p className="text-[10px] text-slate-400">Staff revenue on selected date</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-full">
                {waiterStats.length} Waiters
              </span>
            </div>

            {/* Shift Grand Total Card */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Total Worked Today
              </span>
              <div className="text-xl font-black tracking-tight">
                {dayTotalWorked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-bold text-slate-400 ml-1">ETB</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Sum of all confirmed tables
              </p>
            </div>

            {/* Individual Waiter Breakdown List */}
            <div className="space-y-2.5">
              {loadingWaiters ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-600" />
                  <span>Calculating staff metrics...</span>
                </div>
              ) : waiterStats.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No waiter shifts recorded on this date.
                </p>
              ) : (
                waiterStats.map((w, idx) => {
                  const isSelectedWaiter = String(waiterFilter) === String(w.waiter_id);
                  const sharePct = dayTotalWorked > 0 ? Math.round((w.total_revenue / dayTotalWorked) * 100) : 0;
                  return (
                    <div
                      key={w.waiter_id}
                      onClick={() => setWaiterFilter(isSelectedWaiter ? '' : String(w.waiter_id))}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelectedWaiter
                          ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-600'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">
                            {w.name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {w.name}
                          </span>
                          {idx === 0 && w.total_revenue > 0 && (
                            <Award className="w-3.5 h-3.5 text-amber-500" title="Top Earner" />
                          )}
                        </div>

                        <span className="text-xs font-black text-slate-900">
                          {Number(w.total_revenue).toLocaleString()} ETB
                        </span>
                      </div>

                      {/* Performance Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden my-1.5">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${Math.max(sharePct, 4)}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span>
                          {w.orders_count} orders ({w.confirmed_count} paid)
                        </span>
                        <span className="font-bold text-emerald-700">
                          {sharePct}% of shift
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {waiterFilter && (
              <button
                type="button"
                onClick={() => setWaiterFilter('')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Clear Waiter Filter
              </button>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
