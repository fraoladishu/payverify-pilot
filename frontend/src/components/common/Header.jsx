import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, User, LogOut, Utensils, LayoutDashboard, History, Smartphone } from 'lucide-react';

export default function Header({ currentView, setCurrentView }) {
  const { user, logout, activeTable, setActiveTable } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [tempTable, setTempTable] = useState(activeTable);

  const handleSaveTable = (e) => {
    e.preventDefault();
    if (tempTable.trim()) {
      setActiveTable(tempTable.trim().toUpperCase());
    }
    setIsEditingTable(false);
  };

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title (Matching Figma PayVerify) */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="cursor-pointer" onClick={() => {
            if (user?.role === 'admin') setCurrentView('owner-dashboard');
            else if (user?.role === 'cashier') setCurrentView('dashboard');
            else setCurrentView('new-payment');
          }}>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 flex items-center gap-1">
              Pay<span className="text-emerald-600">Verify</span>
            </span>
          </div>
        </div>

        {/* Desktop Navigation for Cashier */}
        {user?.role === 'cashier' && (
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'dashboard' || currentView === 'default'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Daily Cashier Desk</span>
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'history'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Log</span>
            </button>
          </nav>
        )}

        {/* Desktop Navigation for Super Admin (Owner) */}
        {user?.role === 'admin' && (
          <nav className="hidden md:flex items-center space-x-1 bg-purple-50/80 border border-purple-100 p-1 rounded-xl">
            <button
              onClick={() => setCurrentView('owner-dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
                currentView === 'owner-dashboard' || currentView === 'default'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-purple-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Owner Portal</span>
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'dashboard'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Cashier Desk</span>
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'history'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Log</span>
            </button>
          </nav>
        )}

        {/* Right Section: Table Tag & User Menu */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Table Tag Pill (Figma T-14) - Clickable to change table */}
          {user?.role === 'waiter' && (
            <div>
              {isEditingTable ? (
                <form onSubmit={handleSaveTable} className="flex items-center">
                  <input
                    type="text"
                    value={tempTable}
                    onChange={(e) => setTempTable(e.target.value)}
                    onBlur={handleSaveTable}
                    autoFocus
                    placeholder="T-14"
                    className="w-16 px-2 py-1 text-xs font-bold text-center bg-slate-100 border border-emerald-500 rounded-lg focus:outline-none"
                  />
                </form>
              ) : (
                <button
                  onClick={() => { setTempTable(activeTable); setIsEditingTable(true); }}
                  title="Click to switch table number"
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>{activeTable || 'T-14'}</span>
                </button>
              )}
            </div>
          )}

          {/* User Profile Button */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'Staff'}</p>
                  <p className={`text-[10px] uppercase font-semibold tracking-wider leading-none ${
                    user?.role === 'admin' ? 'text-purple-600 font-bold' : user?.role === 'cashier' ? 'text-blue-600' : 'text-emerald-600'
                  }`}>
                    {user?.role === 'admin' ? 'Hotel Owner' : user?.role === 'cashier' ? 'Front Cashier' : 'Floor Waiter'}
                  </p>
                </div>
              </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-modal border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-500">Signed in as</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    user?.role === 'admin' ? 'bg-purple-100 text-purple-800' : user?.role === 'cashier' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {user?.role === 'admin' ? 'Hotel Owner (Admin)' : user?.role === 'cashier' ? 'Cashier Desk' : 'Waiter (Mobile)'}
                  </span>
                </div>

                {/* Mobile Links for Cashier */}
                {user?.role === 'cashier' && (
                  <div className="md:hidden py-1 border-b border-slate-100">
                    <button
                      onClick={() => { setCurrentView('dashboard'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                      <span>Daily Cashier Desk</span>
                    </button>
                    <button
                      onClick={() => { setCurrentView('history'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <History className="w-4 h-4 text-emerald-600" />
                      <span>Audit Log</span>
                    </button>
                  </div>
                )}

                {/* Mobile Links for Super Admin (Owner) */}
                {user?.role === 'admin' && (
                  <div className="md:hidden py-1 border-b border-slate-100">
                    <button
                      onClick={() => { setCurrentView('owner-dashboard'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 flex items-center gap-2 font-bold"
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Owner Portal</span>
                    </button>
                    <button
                      onClick={() => { setCurrentView('dashboard'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                      <span>Daily Cashier Desk</span>
                    </button>
                    <button
                      onClick={() => { setCurrentView('history'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <History className="w-4 h-4 text-emerald-600" />
                      <span>Audit Log</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => { setShowProfileMenu(false); logout(); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
