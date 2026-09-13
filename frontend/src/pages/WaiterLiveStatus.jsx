import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, XCircle, ShieldCheck, ArrowLeft, Hash, Edit3, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { getProviderById } from '../services/providers';

export default function WaiterLiveStatus({ initialTransaction, onNewRequest, onRetryWithOtherGateway }) {
  const [transaction, setTransaction] = useState(initialTransaction);
  const [cancelling, setCancelling] = useState(false);
  const pollIntervalRef = useRef(null);

  const provider = getProviderById(transaction.payment_method || 'Telebirr');

  useEffect(() => {
    if (!transaction || transaction.status !== 'pending') return;

    const fetchStatus = async () => {
      try {
        const res = await api.getTransactionStatus(transaction.reference_id);
        if (res.success && res.transaction) {
          setTransaction(res.transaction);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollIntervalRef.current = setInterval(fetchStatus, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [transaction?.reference_id, transaction?.status]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this pending verification request?')) return;

    try {
      setCancelling(true);
      const res = await api.cancelTransaction(transaction.reference_id);
      if (res.success) {
        setTransaction(prev => ({ ...prev, status: 'cancelled', decline_reason: 'Cancelled by waiter' }));
      }
    } catch (err) {
      alert(err.message || 'Could not cancel request.');
    } finally {
      setCancelling(false);
    }
  };

  const handleEditAndResubmit = () => {
    onRetryWithOtherGateway({
      service_id: transaction.service_id,
      amount: transaction.amount.toString(),
      table_number: transaction.table_number,
      payment_method_id: provider.id,
      bank_tx_id: transaction.bank_tx_id,
      phone: transaction.customer_phone,
      decline_reason: transaction.decline_reason
    });
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateFormatted} • ${timeFormatted}`;
  };

  const isPending = transaction.status === 'pending';
  const isConfirmed = transaction.status === 'confirmed';
  const isFailed = transaction.status === 'failed' || transaction.status === 'cancelled';

  return (
    <div className="max-w-md mx-auto w-full px-4 py-6 flex flex-col justify-between min-h-[85vh]">
      
      <div className="space-y-6 text-center">
        
        {/* State Icon Indicator */}
        <div className="flex justify-center pt-4">
          {isPending && (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-28 h-28 rounded-full bg-amber-400/20 animate-pulse-ring"></div>
              <div className="w-20 h-20 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 z-10">
                <Clock className="w-10 h-10 stroke-[2.2] animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </div>
          )}

          {isConfirmed && (
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="w-11 h-11 stroke-[2.5]" />
            </div>
          )}

          {isFailed && (
            <div className="w-20 h-20 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 animate-in zoom-in-50 duration-300">
              <XCircle className="w-11 h-11 stroke-[2.5]" />
            </div>
          )}
        </div>

        {/* State Title & Subtitle */}
        <div>
          {isPending && (
            <>
              <h2 className="text-xl font-black text-slate-900">
                Waiting for Cashier...
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {transaction.payment_type === 'manual' || (transaction.payment_method || '').toLowerCase() === 'cash'
                  ? 'Cash handover request sent to Cashier station. Cashier is confirming cash receipt.'
                  : `Request sent to Cashier station. Cashier is checking their phone/SMS for the ${provider.name} transfer.`}
              </p>
            </>
          )}

          {isConfirmed && (
            <>
              <h2 className="text-xl font-black text-slate-900">Payment Confirmed!</h2>
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                {transaction.payment_type === 'manual' || (transaction.payment_method || '').toLowerCase() === 'cash'
                  ? `Cashier confirmed cash receipt of ${Number(transaction.amount).toLocaleString()} ETB`
                  : `Cashier confirmed ${provider.name} deposit of ${Number(transaction.amount).toLocaleString()} ETB`}
              </p>
            </>
          )}

          {isFailed && (
            <div className="space-y-1">
              <h2 className="text-xl font-black text-red-600">Verification Declined</h2>
              <p className="text-xs text-slate-600">
                {transaction.decline_reason 
                  ? `Reason: "${transaction.decline_reason}"` 
                  : 'Cashier could not verify this payment.'}
              </p>
            </div>
          )}
        </div>

        {/* Transaction Summary Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card text-left space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-500">Total Amount</span>
            <span className="text-lg font-black text-slate-900">
              {Number(transaction.amount).toLocaleString()} ETB
            </span>
          </div>

          {/* Dynamic Provider / Bank Row */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-500">Bank / Provider</span>
            <div className="flex items-center space-x-2">
              <span
                className="w-6 h-6 rounded-lg text-white text-[10px] font-black flex items-center justify-center shadow-xs"
                style={{ backgroundColor: provider.color }}
              >
                {provider.shortCode}
              </span>
              <span className="text-xs font-bold text-slate-900">
                {provider.name}
              </span>
            </div>
          </div>

          {/* Bank Transaction ID Row */}
          {transaction.bank_tx_id && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-500 flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bank Tx ID / Ref</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {transaction.bank_tx_id}
              </span>
            </div>
          )}

          {/* Itemized Order Details */}
          {transaction.items && Array.isArray(transaction.items) && transaction.items.length > 0 && (
            <div className="pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Order Items ({transaction.items.length})
              </span>
              <div className="space-y-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">
                      {item.name} <span className="text-slate-400 font-normal">× {item.quantity}</span>
                    </span>
                    <span className="font-bold text-slate-700">
                      {(item.price * item.quantity).toLocaleString()} ETB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transaction.customer_phone && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-500">Customer Phone</span>
              <span className="text-xs font-bold text-slate-800 tracking-wide">
                {transaction.customer_phone}
              </span>
            </div>
          )}

          {isConfirmed && (
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-xs font-medium text-slate-500">Verified At</span>
              <span className="text-xs font-bold text-emerald-700">
                {formatTimestamp(transaction.confirmed_at || transaction.created_at)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-0.5 text-xs text-slate-400">
            <span>Table / Category:</span>
            <span className="font-semibold text-slate-600">
              {transaction.table_number || 'T-14'} • {transaction.service_name || 'Food'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          
          {isPending && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={onNewRequest}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Serve Another Table (Keep Table {transaction.table_number} Waiting)</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="text-xs font-bold text-red-600 hover:text-red-700 py-1.5 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Request'}
              </button>

              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 inline" />
                <span>Real-time Cashier Station Sync</span>
              </p>
            </div>
          )}

          {isConfirmed && (
            <button
              type="button"
              onClick={onNewRequest}
              className="w-full py-4 px-6 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-800/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>New Bill / Request</span>
            </button>
          )}

          {isFailed && (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleEditAndResubmit}
                className="w-full py-4 px-6 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-800/20 transition-all flex items-center justify-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit & Resubmit to Cashier</span>
              </button>

              <button
                type="button"
                onClick={onNewRequest}
                className="w-full py-3 px-4 bg-transparent text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl transition-colors"
              >
                Start New Bill
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Bottom Reference ID */}
      <div className="text-center pt-8 pb-2">
        <p className="text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
          REF: {transaction.reference_id}
        </p>
      </div>

    </div>
  );
}
