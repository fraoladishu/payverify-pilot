import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Header from './components/common/Header';
import LoginPage from './pages/LoginPage';
import WaiterNewPayment from './pages/WaiterNewPayment';
import WaiterLiveStatus from './pages/WaiterLiveStatus';
import CashierDashboard from './pages/CashierDashboard';
import CashierHistory from './pages/CashierHistory';
import OwnerDashboard from './pages/OwnerDashboard';

export default function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('default'); // 'owner-dashboard', 'new-payment', 'status', 'dashboard', 'history'
  const [activeTransaction, setActiveTransaction] = useState(null);
  const [prefillData, setPrefillData] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading PayVerify...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show Figma Login Screen
  if (!user) {
    return <LoginPage />;
  }

  // Determine active view based on role and user action
  const isCashier = user.role === 'cashier';
  const isAdmin = user.role === 'admin';
  
  // Handlers for Waiter flow
  const handleTransactionCreated = (txn) => {
    setActiveTransaction(txn);
    setPrefillData(null);
    setCurrentView('status');
  };

  const handleNewRequest = () => {
    setActiveTransaction(null);
    setPrefillData(null);
    if (isAdmin) {
      setCurrentView('owner-dashboard');
    } else if (isCashier) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('new-payment');
    }
  };

  const handleRetryWithOtherGateway = (retryPayload) => {
    setActiveTransaction(null);
    setPrefillData(retryPayload);
    setCurrentView('new-payment');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Header currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Super Admin (Hotel Owner) View Handling */}
        {isAdmin && (
          <>
            {currentView === 'dashboard' ? (
              <CashierDashboard onNavigateToHistory={() => setCurrentView('history')} />
            ) : currentView === 'history' ? (
              <CashierHistory onBackToDashboard={() => setCurrentView('dashboard')} />
            ) : (
              <OwnerDashboard />
            )}
          </>
        )}

        {/* Cashier View Handling - Cleanly Separated */}
        {isCashier && (
          <>
            {currentView === 'default' || currentView === 'dashboard' ? (
              <CashierDashboard onNavigateToHistory={() => setCurrentView('history')} />
            ) : currentView === 'history' ? (
              <CashierHistory onBackToDashboard={() => setCurrentView('dashboard')} />
            ) : (
              <CashierDashboard onNavigateToHistory={() => setCurrentView('history')} />
            )}
          </>
        )}

        {/* Waiter Mobile View Handling */}
        {!isAdmin && !isCashier && (
          <>
            {currentView === 'status' && activeTransaction ? (
              <WaiterLiveStatus
                initialTransaction={activeTransaction}
                onNewRequest={handleNewRequest}
                onRetryWithOtherGateway={handleRetryWithOtherGateway}
              />
            ) : (
              <WaiterNewPayment
                onTransactionCreated={handleTransactionCreated}
                prefillData={prefillData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
