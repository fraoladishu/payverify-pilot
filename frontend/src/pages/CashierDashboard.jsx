import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { getProviderById } from '../services/providers';
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Utensils, 
  Wine, 
  Tag, 
  RefreshCw,
  Receipt,
  ArrowUpRight,
  Bell,
  Clock,
  Hash,
  ShieldCheck,
  Check,
  X,
  Volume2,
  VolumeX,
  AlertCircle,
  Banknote,
  Building2
} from 'lucide-react';

// Web Audio API pure synthesized two-tone chime (no external audio files needed)
function playChimeAlert() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Tone 1 (D5 = 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);

    // Tone 2 (A5 = 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (err) {
    // AudioContext autoplay restrictions or disabled audio
  }
}

// Helper to format live elapsed time (SLA Timer)
function ElapsedTimer({ createdAt }) {
  const [elapsed, setElapsed] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      if (!createdAt) return;
      const diffSec = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      if (diffSec < 0) {
        setElapsed('Just now');
        return;
      }
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setElapsed(mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`);
      setIsOverdue(diffSec >= 120); // Amber alert if waiting > 2 minutes
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
      isOverdue ? 'bg-amber-100 text-amber-900 animate-pulse' : 'bg-slate-100 text-slate-700'
    }`}>
      <Clock className="w-3 h-3 mr-1" />
      {elapsed}
    </span>
  );
}

export default function CashierDashboard({ onNavigateToHistory }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Real-time Pending Requests Queue
  const [pendingRequests, setPendingRequests] = useState([]);
  const [actionInProgress, setActionInProgress] = useState(null); // referenceId being processed
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevCountRef = useRef(0);

  // Decline Modal State
  const [declineModalItem, setDeclineModalItem] = useState(null);
  const [declineReason, setDeclineReason] = useState('Payment not received on phone yet');
  const [customReason, setCustomReason] = useState('');

  const PRESET_DECLINE_REASONS = [
    'Payment not received on phone yet',
    'Amount or Tx ID mismatch',
    'Customer cancelled order',
    'Duplicate submission'
  ];

  // Fetch summary metrics
  const fetchSummary = async (date) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getDailySummary(date);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  // Poll pending queue in real-time
  const fetchPendingQueue = async () => {
    try {
      const res = await api.getPendingVerifications();
      if (res.success && Array.isArray(res.transactions)) {
        const newCount = res.transactions.length;
        // Sound alert if new request arrived
        if (newCount > prevCountRef.current && soundEnabled) {
          playChimeAlert();
        }
        prevCountRef.current = newCount;
        setPendingRequests(res.transactions);
      }
    } catch (err) {
      console.error('Pending queue poll error:', err);
    }
  };

  useEffect(() => {
    fetchSummary(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    fetchPendingQueue();
    const interval = setInterval(fetchPendingQueue, 2500); // Poll every 2.5s
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Cashier Action: Approve & Settle
  const handleApprove = async (referenceId) => {
    try {
      setActionInProgress(referenceId);
      const res = await api.cashierVerifyTransaction(referenceId);
      if (res.success) {
        setPendingRequests(prev => prev.filter(r => r.reference_id !== referenceId));
        fetchSummary(selectedDate);
      }
    } catch (err) {
      alert(err.message || 'Failed to verify transaction.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Cashier Action: Submit Decline
  const handleSubmitDecline = async () => {
    if (!declineModalItem) return;
    const finalReason = declineReason === 'Other' && customReason.trim() ? customReason.trim() : declineReason;

    try {
      setActionInProgress(declineModalItem.reference_id);
      const res = await api.cashierDeclineTransaction(declineModalItem.reference_id, finalReason);
      if (res.success) {
        setPendingRequests(prev => prev.filter(r => r.reference_id !== declineModalItem.reference_id));
        setDeclineModalItem(null);
        setCustomReason('');
        fetchSummary(selectedDate);
      }
    } catch (err) {
      alert(err.message || 'Failed to decline transaction.');
    } finally {
      setActionInProgress(null);
    }
  };

  const getServiceIcon = (name) => {
    switch ((name || '').toLowerCase()) {
      case 'food': return <Utensils className="w-4 h-4 text-emerald-600" />;
      case 'drinks': return <Wine className="w-4 h-4 text-amber-600" />;
      default: return <Tag className="w-4 h-4 text-purple-600" />;
    }
  };

  const summary = data?.summary || {
    totalRevenue: 0,
    confirmedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    totalCount: 0
  };

  const totalRev = Number(summary.totalRevenue || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Top Header: Title, Sound Toggle & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cashier Financial Hub
            </h1>
            {pendingRequests.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white animate-pulse shadow-sm">
                {pendingRequests.length} Pending
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time deposit verification and daily revenue settlement
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChimeAlert();
            }}
            title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
            className={`p-2 rounded-xl border transition-colors flex items-center space-x-1 text-xs font-bold ${
              soundEnabled 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{soundEnabled ? 'Chime On' : 'Muted'}</span>
          </button>

          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors"
            />
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <button
            onClick={() => {
              fetchSummary(selectedDate);
              fetchPendingQueue();
            }}
            title="Refresh statistics & queue"
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔔 LIVE INCOMING VERIFICATION QUEUE SECTION */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500/20 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>Incoming Waiter Verification Requests</span>
                {pendingRequests.length > 0 && (
                  <span className="text-xs font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                    {pendingRequests.length} Waiting
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">Check restaurant phone SMS/account against the Bank Tx ID below</p>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
            Auto-syncing every 2.5s
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 stroke-[2]" />
            </div>
            <p className="text-sm font-bold text-slate-800">All Waiter Requests Settled</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When a waiter sends a bill for verification, it will pop up here with an audio alert.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {pendingRequests.map((req) => {
              const isCash = req.payment_type === 'manual' || (req.payment_method || '').toLowerCase() === 'cash';
              const provider = isCash ? { name: 'Cash', shortCode: 'ETB', color: '#059669' } : getProviderById(req.payment_method || 'Telebirr');
              const isProcessing = actionInProgress === req.reference_id;

              return (
                <div 
                  key={req.reference_id}
                  className={`bg-white rounded-2xl p-4 border-2 shadow-sm hover:shadow-md transition-all space-y-3 relative flex flex-col justify-between ${
                    isCash ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-500'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Table, Waiter, Type Badge, Timer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-black">
                          {req.table_number || 'T-1'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isCash ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {isCash ? <Banknote className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          <span>{isCash ? 'Manual Cash' : 'Wire Transfer'}</span>
                        </span>
                      </div>
                      <ElapsedTimer createdAt={req.created_at} />
                    </div>

                    {/* Waiter Name */}
                    <div className="text-xs text-slate-500 font-semibold">
                      Waiter: <span className="text-slate-800 font-bold">{req.waiter_name || 'Staff'}</span>
                    </div>

                    {/* Amount & Bank Provider Badge */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          {Number(req.amount).toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-slate-500 ml-1">ETB</span>
                      </div>

                      <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold text-white shadow-xs" style={{ backgroundColor: provider.color }}>
                        <span>{provider.shortCode}</span>
                        <span className="text-[11px] font-medium opacity-90">{provider.name}</span>
                      </div>
                    </div>

                    {/* Cash Notice or Bank Tx ID */}
                    {isCash ? (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-bold">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          <span>Physical Cash:</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                          Waiter holds cash
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                          <Hash className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Bank Tx ID:</span>
                        </div>
                        <span className="text-xs font-mono font-black text-slate-900 tracking-wide bg-white px-2 py-0.5 rounded border border-slate-300">
                          {req.bank_tx_id || req.reference_id.slice(-6)}
                        </span>
                      </div>
                    )}

                    {/* Item count or phone */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{req.service_name || 'Food'} • {Array.isArray(req.items) ? req.items.length : 0} items</span>
                      {req.customer_phone && <span>{req.customer_phone}</span>}
                    </div>
                  </div>

                  {/* 1-Tap Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(req.reference_id)}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{isCash ? 'Confirm Cash' : 'Verify & Settle'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setDeclineModalItem(req)}
                      className="py-2.5 px-3 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 📊 FINANCIAL KPI CARDS GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Confirmed Revenue */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Confirmed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm font-bold text-slate-400 ml-1.5">ETB</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {summary.confirmedCount} verified payments
          </p>
        </div>

        {/* Manual Cash Today */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Manual Cash</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {Number(summary.manualCashTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm font-bold text-slate-400 ml-1.5">ETB</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            {summary.manualCashCount || 0} physical cash payments
          </p>
        </div>

        {/* Wire / Bank Transfers Today */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Wire / Bank</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {Number(summary.wireTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm font-bold text-slate-400 ml-1.5">ETB</span>
          </div>
          <p className="text-[11px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {summary.wireCount || 0} bank transfers
          </p>
        </div>

        {/* Verification Success Rate & Declined Count */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Verification Rate</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {summary.totalCount > 0 
              ? `${Math.round((summary.confirmedCount / summary.totalCount) * 100)}%` 
              : '100%'}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-2">
            {summary.failedCount} declined / {summary.totalCount} total
          </p>
        </div>

      </div>

      {/* Main Breakdown Section (Service Category & Audit Button) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Breakdown by Service Type (Food, Drinks, Other) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue by Service Type</h2>
              <p className="text-xs text-slate-500">Confirmed bills grouped by department</p>
            </div>
            <button
              onClick={onNavigateToHistory}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              <span>View Full History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {data?.serviceBreakdown?.map((item) => {
              const itemAmt = Number(item.total_amount || 0);
              const percentage = totalRev > 0 ? Math.round((itemAmt / totalRev) * 100) : 0;
              return (
                <div key={item.service_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center space-x-2 font-bold text-slate-800">
                      <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        {getServiceIcon(item.service_name)}
                      </div>
                      <span>{item.service_name}</span>
                      <span className="text-xs text-slate-400 font-normal">({item.transaction_count || 0} bills)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900">{itemAmt.toLocaleString()} ETB</span>
                      <span className="text-xs text-slate-400 ml-2 font-semibold">{percentage}%</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bank & Mobile Wallet Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Bank & Wallet Settlement</h2>
            <p className="text-xs text-slate-500">
              Confirmed revenue grouped by Ethiopian bank & wallet account
            </p>

            <div className="space-y-2 mt-2">
              {(!data?.providerBreakdown || data.providerBreakdown.length === 0) ? (
                <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-400 font-medium">
                  No verified payments recorded for this date yet.
                </div>
              ) : (
                data.providerBreakdown.map((pItem) => {
                  const isCash = (pItem.payment_method || '').toLowerCase() === 'cash' || pItem.payment_type === 'manual';
                  const prov = isCash 
                    ? { name: 'Manual Cash', shortCode: 'ETB', color: '#059669' } 
                    : getProviderById(pItem.payment_method);
                  const pAmt = Number(pItem.total_amount || 0);
                  return (
                    <div key={pItem.payment_method} className={`p-3 rounded-2xl border flex items-center justify-between ${
                      isCash ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-xl text-white text-[10px] font-black flex items-center justify-center shadow-xs" style={{ backgroundColor: prov.color }}>
                          {prov.shortCode}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{prov.name}</span>
                            {isCash && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">CASH</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">{pItem.count || 0} confirmed bills</p>
                        </div>
                      </div>
                      <span className="font-extrabold text-xs text-slate-900">{pAmt.toLocaleString()} ETB</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={onNavigateToHistory}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
            >
              Open Audit Logs & CSV Export
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🛑 QUICK DECLINE REASON MODAL */}
      {/* ========================================================================= */}
      {declineModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-red-600 font-extrabold text-base">
                <AlertCircle className="w-5 h-5" />
                <span>Decline Verification Request</span>
              </div>
              <button 
                onClick={() => setDeclineModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Table & Waiter:</span>
                <span className="font-bold text-slate-900">{declineModalItem.table_number} • {declineModalItem.waiter_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount & Provider:</span>
                <span className="font-bold text-slate-900">{Number(declineModalItem.amount).toLocaleString()} ETB ({declineModalItem.payment_method || 'Telebirr'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Tx ID:</span>
                <span className="font-mono font-bold text-slate-900">{declineModalItem.bank_tx_id}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select Reason (will be shown to waiter):
              </label>
              <div className="space-y-2">
                {PRESET_DECLINE_REASONS.map((reasonText) => (
                  <label 
                    key={reasonText}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      declineReason === reasonText 
                        ? 'bg-red-50/70 border-red-300 text-red-900 ring-1 ring-red-300' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="declineReason"
                      value={reasonText}
                      checked={declineReason === reasonText}
                      onChange={() => setDeclineReason(reasonText)}
                      className="accent-red-600"
                    />
                    <span>{reasonText}</span>
                  </label>
                ))}

                <label 
                  className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    declineReason === 'Other' 
                      ? 'bg-red-50/70 border-red-300 text-red-900 ring-1 ring-red-300' 
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="declineReason"
                    value="Other"
                    checked={declineReason === 'Other'}
                    onChange={() => setDeclineReason('Other')}
                    className="accent-red-600"
                  />
                  <span>Other reason...</span>
                </label>

                {declineReason === 'Other' && (
                  <input
                    type="text"
                    placeholder="Specify reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-red-500 font-medium"
                    autoFocus
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeclineModalItem(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitDecline}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
