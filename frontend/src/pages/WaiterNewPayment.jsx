import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ETHIOPIAN_PAYMENT_ACCOUNTS, getProviderById } from '../services/providers';
import { 
  Utensils, 
  Wine, 
  Tag, 
  ShieldCheck, 
  Check, 
  ArrowRight, 
  Building2, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  ListPlus,
  Edit2,
  BookmarkPlus,
  Sparkles,
  Save,
  Hash,
  AlertCircle,
  Layers,
  X,
  Banknote
} from 'lucide-react';

export default function WaiterNewPayment({ onTransactionCreated, prefillData }) {
  const { activeTable, setActiveTable } = useAuth();
  
  // Clean Restaurant Services (Food, Drinks, Other)
  const services = [
    { id: 1, name: 'Food', icon: 'Utensils' },
    { id: 2, name: 'Drinks', icon: 'Wine' },
    { id: 3, name: 'Other', icon: 'Tag' }
  ];

  const [selectedService, setSelectedService] = useState(1);
  const [selectedServiceName, setSelectedServiceName] = useState('Food');

  // Custom Saved Menu Library (Persisted restaurant menu)
  const [savedMenuItems, setSavedMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // =========================================================================
  // 🪑 MULTI-TABLE ORDER TABS STATE
  // =========================================================================
  const [openTables, setOpenTables] = useState(() => {
    try {
      const saved = localStorage.getItem('payverify_open_tables');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) return parsed;
      }
    } catch (e) {}

    // Starter open tables if brand new
    return {
      'T-15': {
        items: [
          { id: 'item-1', name: 'Habesha Beer', price: 95, quantity: 3, category: 'Drinks' }
        ],
        bankTxId: '',
        phone: '',
        providerId: 'telebirr'
      },
      'T-4': {
        items: [
          { id: 'item-2', name: 'Special Tibs', price: 450, quantity: 2, category: 'Food' },
          { id: 'item-3', name: 'St. George Beer', price: 90, quantity: 2, category: 'Drinks' }
        ],
        bankTxId: '',
        phone: '',
        providerId: 'cbebirr'
      }
    };
  });

  const [currentTable, setCurrentTable] = useState(prefillData?.table_number || activeTable || 'T-15');
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [newTableNumberInput, setNewTableNumberInput] = useState('');

  // Active table's current order items & fields
  const currentTableData = openTables[currentTable] || {
    items: [],
    bankTxId: '',
    phone: '',
    providerId: 'telebirr'
  };

  const orderItems = currentTableData.items || [];
  const [paymentType, setPaymentType] = useState(currentTableData.paymentType || 'wire');
  const [bankTxId, setBankTxId] = useState(prefillData?.bank_tx_id || currentTableData.bankTxId || '');
  const [selectedProviderId, setSelectedProviderId] = useState(prefillData?.payment_method_id || currentTableData.providerId || 'telebirr');
  const [phone, setPhone] = useState(prefillData?.phone ? prefillData.phone.replace('+251', '') : currentTableData.phone || '');

  // Add Custom Item Form State
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [saveToMenuLibrary, setSaveToMenuLibrary] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit Price Inline State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingPrice, setEditingPrice] = useState('');

  // Manual total amount override
  const [manualAmount, setManualAmount] = useState('');
  const [useManualAmount, setUseManualAmount] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Daily totals for this waiter (Cash vs Wire)
  const [waiterDailyTotals, setWaiterDailyTotals] = useState({ manualCashTotal: 0, wireTotal: 0, totalRevenue: 0 });

  const fetchWaiterDaySummary = async () => {
    try {
      const res = await api.getMyRecentTransactions();
      if (res.success && Array.isArray(res.transactions)) {
        const today = new Date().toISOString().slice(0, 10);
        const todayTxs = res.transactions.filter(t => t.created_at && t.created_at.slice(0, 10) === today && t.status === 'confirmed');
        const cashTxs = todayTxs.filter(t => t.payment_type === 'manual' || (t.payment_method || '').toLowerCase() === 'cash');
        const wireTxs = todayTxs.filter(t => t.payment_type !== 'manual' && (t.payment_method || '').toLowerCase() !== 'cash');
        
        const manualCashTotal = cashTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const wireTotal = wireTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        setWaiterDailyTotals({
          manualCashTotal,
          wireTotal,
          totalRevenue: manualCashTotal + wireTotal
        });
      }
    } catch (e) {
      console.warn('Could not fetch waiter day summary', e);
    }
  };

  useEffect(() => {
    fetchWaiterDaySummary();
  }, []);

  // Sync open tables to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('payverify_open_tables', JSON.stringify(openTables));
    } catch (e) {}
  }, [openTables]);

  // When switching tables, update local form inputs
  useEffect(() => {
    const data = openTables[currentTable];
    if (data) {
      setPaymentType(data.paymentType || 'wire');
      setBankTxId(data.bankTxId || '');
      setSelectedProviderId(data.providerId || 'telebirr');
      setPhone(data.phone || '');
      setUseManualAmount(false);
      setManualAmount('');
    }
    if (setActiveTable) {
      setActiveTable(currentTable);
    }
  }, [currentTable]);

  // Load Saved Menu Items from Backend
  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoadingMenu(true);
        const res = await api.getMenuItems();
        if (res.success && res.items) {
          setSavedMenuItems(res.items);
        }
      } catch (err) {
        console.warn('Using local fallback menu items:', err);
        setSavedMenuItems([
          { id: 1, name: 'Special Tibs', price: 450, category: 'Food' },
          { id: 2, name: 'Shekla Tibs', price: 500, category: 'Food' },
          { id: 3, name: 'Kitfo Special', price: 550, category: 'Food' },
          { id: 4, name: 'Shiro Tegamino', price: 220, category: 'Food' },
          { id: 5, name: 'St. George Beer', price: 90, category: 'Drinks' },
          { id: 6, name: 'Habesha Beer', price: 95, category: 'Drinks' },
          { id: 7, name: 'Ambo Mineral Water', price: 45, category: 'Drinks' },
          { id: 8, name: 'Macchiato', price: 40, category: 'Drinks' }
        ]);
      } finally {
        setLoadingMenu(false);
      }
    };

    loadMenu();
  }, []);

  // Filter saved menu items by active category (Food, Drinks, Other)
  const activeCategoryItems = savedMenuItems.filter(i => i.category === selectedServiceName);

  // Calculate bill total for current table
  const calculatedItemsTotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const finalAmount = useManualAmount && parseFloat(manualAmount) > 0 ? parseFloat(manualAmount) : calculatedItemsTotal;

  const cleanDigits = phone.replace(/\D/g, '');
  const currentProvider = getProviderById(selectedProviderId);

  const getServiceIcon = (name) => {
    switch ((name || '').toLowerCase()) {
      case 'food': return <Utensils className="w-3.5 h-3.5" />;
      case 'drinks': return <Wine className="w-3.5 h-3.5" />;
      default: return <Tag className="w-3.5 h-3.5" />;
    }
  };

  // Helper to update current table's order items
  const updateCurrentTableItems = (newItems) => {
    setUseManualAmount(false);
    setOpenTables(prev => ({
      ...prev,
      [currentTable]: {
        ...(prev[currentTable] || {}),
        items: newItems,
        bankTxId,
        phone,
        providerId: selectedProviderId
      }
    }));
  };

  // 1. Add item from Menu Library to current active table
  const handleAddFromLibrary = (menuItem) => {
    const existingIndex = orderItems.findIndex(i => i.name.toLowerCase() === menuItem.name.toLowerCase());
    let updated;
    if (existingIndex >= 0) {
      updated = orderItems.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updated = [
        ...orderItems,
        {
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          category: menuItem.category
        }
      ];
    }
    updateCurrentTableItems(updated);
  };

  // 2. Add New Custom Item (adds to bill AND saves to menu library)
  const handleCreateCustomItem = async (e) => {
    e.preventDefault();
    if (!customName.trim() || !customPrice || parseFloat(customPrice) <= 0) return;

    const itemName = customName.trim();
    const itemPrice = parseFloat(customPrice);
    const itemQuantity = parseInt(customQty, 10) || 1;

    const existing = orderItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    let updated;
    if (existing) {
      updated = orderItems.map(i => i.name.toLowerCase() === itemName.toLowerCase() ? { ...i, quantity: i.quantity + itemQuantity } : i);
    } else {
      updated = [
        ...orderItems,
        {
          id: `custom-${Date.now()}`,
          name: itemName,
          price: itemPrice,
          quantity: itemQuantity,
          category: selectedServiceName
        }
      ];
    }
    updateCurrentTableItems(updated);

    if (saveToMenuLibrary) {
      try {
        const res = await api.saveMenuItem({
          name: itemName,
          price: itemPrice,
          category: selectedServiceName
        });
        if (res.success && res.items) {
          setSavedMenuItems(res.items);
        }
      } catch (err) {
        console.warn('Could not save menu item to backend:', err);
      }
    }

    setCustomName('');
    setCustomPrice('');
    setCustomQty(1);
    setShowAddForm(false);
  };

  // 3. Edit Saved Item Price
  const handleSavePriceEdit = async (itemId, currentName) => {
    const newPriceNum = parseFloat(editingPrice);
    if (isNaN(newPriceNum) || newPriceNum <= 0) {
      setEditingItemId(null);
      return;
    }

    try {
      const res = await api.saveMenuItem({
        name: currentName,
        price: newPriceNum,
        category: selectedServiceName
      });
      if (res.success && res.items) {
        setSavedMenuItems(res.items);
      }
    } catch (err) {
      setSavedMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, price: newPriceNum } : i));
    }

    const updated = orderItems.map(i => i.name.toLowerCase() === currentName.toLowerCase() ? { ...i, price: newPriceNum } : i);
    updateCurrentTableItems(updated);
    setEditingItemId(null);
    setEditingPrice('');
  };

  // 4. Delete Item from Saved Menu
  const handleDeleteFromLibrary = async (e, itemId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this item from the saved restaurant menu?')) return;

    try {
      const res = await api.deleteMenuItem(itemId);
      if (res.success && res.items) {
        setSavedMenuItems(res.items);
      }
    } catch (err) {
      setSavedMenuItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  // 5. Quantity Controls in Active Table Bill Tray
  const handleUpdateQty = (billItemId, delta) => {
    const updated = orderItems.map(item => {
      if (item.id === billItemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean);

    updateCurrentTableItems(updated);
  };

  const handleRemoveBillItem = (billItemId) => {
    const updated = orderItems.filter(i => i.id !== billItemId);
    updateCurrentTableItems(updated);
  };

  // =========================================================================
  // 🏷️ TABLE TAB MANAGEMENT (Open, Switch, Close)
  // =========================================================================
  const handleOpenNewTable = (e) => {
    e.preventDefault();
    if (!newTableNumberInput.trim()) return;

    let clean = newTableNumberInput.trim().toUpperCase();
    if (!clean.startsWith('T-') && !clean.startsWith('TABLE') && /^\d+$/.test(clean)) {
      clean = `T-${clean}`;
    }

    if (!openTables[clean]) {
      setOpenTables(prev => ({
        ...prev,
        [clean]: {
          items: [],
          bankTxId: '',
          phone: '',
          providerId: 'telebirr'
        }
      }));
    }

    setCurrentTable(clean);
    setNewTableNumberInput('');
    setShowNewTableModal(false);
  };

  const handleCloseTableTab = (e, tableKey) => {
    e.stopPropagation();
    const tableOrders = openTables[tableKey]?.items || [];
    if (tableOrders.length > 0) {
      if (!window.confirm(`Table ${tableKey} has ${tableOrders.length} active order items. Close and clear this table tab?`)) {
        return;
      }
    }

    setOpenTables(prev => {
      const copy = { ...prev };
      delete copy[tableKey];
      
      const remainingKeys = Object.keys(copy);
      if (currentTable === tableKey) {
        setCurrentTable(remainingKeys.length > 0 ? remainingKeys[0] : 'T-1');
      }
      if (remainingKeys.length === 0) {
        copy['T-1'] = { items: [], bankTxId: '', phone: '', providerId: 'telebirr' };
        setCurrentTable('T-1');
      }
      return copy;
    });
  };

  // =========================================================================
  // 🚀 SUBMIT SPECIFIC TABLE TO CASHIER FOR VERIFICATION
  // =========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (finalAmount <= 0) {
      setError(`Please add order items for Table ${currentTable} before requesting verification.`);
      return;
    }

    const isManual = paymentType === 'manual';

    if (!isManual && !bankTxId.trim()) {
      setError(`Please enter the customer's ${currentProvider.name} Transaction ID (or last digits from SMS/receipt).`);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        service_id: selectedService,
        table_number: currentTable,
        amount: finalAmount,
        payment_type: isManual ? 'manual' : 'wire',
        payment_method: isManual ? 'Cash' : currentProvider.name,
        payment_method_id: isManual ? 'cash' : currentProvider.id,
        bank_tx_id: isManual ? '' : bankTxId.trim(),
        customer_phone: phone ? `+251${cleanDigits}` : '',
        items: orderItems
      };

      const res = await api.createTransaction(payload);
      if (res.success && res.transaction) {
        // Refresh waiter's daily totals
        fetchWaiterDaySummary();

        // Clear this table from active tabs upon successful submission to cashier
        setOpenTables(prev => {
          const copy = { ...prev };
          delete copy[currentTable];
          const remaining = Object.keys(copy);
          if (remaining.length === 0) {
            copy['T-1'] = { items: [], bankTxId: '', phone: '', providerId: 'telebirr', paymentType: 'wire' };
          }
          return copy;
        });

        onTransactionCreated(res.transaction);
      } else {
        throw new Error(res.message || 'Failed to submit verification request.');
      }
    } catch (err) {
      setError(err.message || 'Verification submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openTableKeys = Object.keys(openTables);

  return (
    <div className="max-w-md mx-auto w-full px-4 py-4 sm:py-6 space-y-4">
      
      {/* ========================================================================= */}
      {/* 🪑 MULTI-TABLE TABS BAR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-3 border border-slate-100 shadow-card space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Active Tables ({openTableKeys.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowNewTableModal(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Open Table</span>
          </button>
        </div>

        {/* Horizontal Scrollable Table Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {openTableKeys.map((tKey) => {
            const isSelected = currentTable === tKey;
            const tItems = openTables[tKey]?.items || [];
            const tTotal = tItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            return (
              <button
                key={tKey}
                type="button"
                onClick={() => setCurrentTable(tKey)}
                className={`px-3 py-2 rounded-2xl border text-left transition-all shrink-0 relative flex items-center space-x-2 ${
                  isSelected 
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-md shadow-emerald-700/20 ring-2 ring-emerald-700' 
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-black tracking-tight">{tKey}</span>
                    {tItems.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {tItems.length}
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {tTotal > 0 ? `${tTotal.toLocaleString()} ETB` : 'Empty'}
                  </p>
                </div>

                {/* Close table button */}
                <span
                  onClick={(e) => handleCloseTableTab(e, tKey)}
                  title={`Close table ${tKey}`}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ml-1 ${
                    isSelected ? 'hover:bg-emerald-800 text-emerald-200' : 'hover:bg-slate-200 text-slate-400'
                  }`}
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Decline Reason Notice (if previous attempt was declined) */}
      {prefillData?.decline_reason && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start space-x-3 text-amber-900 shadow-sm animate-in fade-in duration-300">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-extrabold text-amber-900">Previous Request Declined by Cashier</p>
            <p className="mt-0.5 font-medium text-amber-800">Reason: "{prefillData.decline_reason}"</p>
            <p className="mt-1 text-[11px] text-amber-700">Please verify the Bank Tx ID / Amount for {currentTable} and resubmit.</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📋 MAIN ORDER & BILL FORM */}
      {/* ========================================================================= */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* 1. Category Switcher (Food, Drinks, Other) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Service Category
          </label>
          <div className="flex gap-2">
            {services.map((svc) => {
              const isSelected = selectedService === svc.id;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(svc.id);
                    setSelectedServiceName(svc.name);
                  }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20 ring-2 ring-emerald-700'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{getServiceIcon(svc.name)}</span>
                  <span>{svc.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Custom Menu Section & Saved Items Library */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <ListPlus className="w-4 h-4 text-emerald-600" />
              <label className="text-xs font-bold text-slate-900">
                {selectedServiceName} Menu Library
              </label>
            </div>
            
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{showAddForm ? 'Cancel' : `+ Add ${selectedServiceName}`}</span>
            </button>
          </div>

          {/* Form to Add New Custom Item */}
          {showAddForm && (
            <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Add Custom {selectedServiceName} Item
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">Saves to library</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${selectedServiceName === 'Food' ? 'Gomen Kitfo' : selectedServiceName === 'Drinks' ? 'Bedele Special' : 'Special Hookah'}`}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Price (ETB)"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">ETB</span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-medium text-slate-400">qty</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveToLibraryCheck"
                    checked={saveToMenuLibrary}
                    onChange={(e) => setSaveToMenuLibrary(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="saveToLibraryCheck" className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                    Save to restaurant menu for future days
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleCreateCustomItem}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-1.5"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Add to Table {currentTable} & Save Item</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Tap Saved Menu Items Grid */}
          <div>
            <p className="text-[11px] text-slate-400 mb-2 leading-tight">
              Tap item to add to <strong>Table {currentTable}</strong>. Tap ✏️ to update price:
            </p>

            {activeCategoryItems.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
                <p className="text-xs text-slate-500 font-medium">No saved {selectedServiceName} items yet.</p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-1.5 text-xs font-bold text-emerald-700 hover:underline"
                >
                  + Add First {selectedServiceName} Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {activeCategoryItems.map((item) => {
                  const onBill = orderItems.find(i => i.name.toLowerCase() === item.name.toLowerCase());
                  const isEditing = editingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isEditing && handleAddFromLibrary(item)}
                      className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                        onBill
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-black text-slate-900 truncate pr-1">
                          {item.name}
                        </p>
                        
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="Edit Price"
                            onClick={() => {
                              if (isEditing) {
                                handleSavePriceEdit(item.id, item.name);
                              } else {
                                setEditingItemId(item.id);
                                setEditingPrice(item.price.toString());
                              }
                            }}
                            className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-emerald-700 flex items-center justify-center"
                          >
                            {isEditing ? <Save className="w-3 h-3 text-emerald-600" /> : <Edit2 className="w-2.5 h-2.5" />}
                          </button>
                          
                          <button
                            type="button"
                            title="Delete Item"
                            onClick={(e) => handleDeleteFromLibrary(e, item.id)}
                            className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-red-600 flex items-center justify-center"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        {isEditing ? (
                          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(e.target.value)}
                              autoFocus
                              className="w-16 px-1.5 py-0.5 text-xs font-bold bg-white border border-emerald-500 rounded focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400">ETB</span>
                          </div>
                        ) : (
                          <span className="text-xs font-extrabold text-emerald-800">
                            {item.price} ETB
                          </span>
                        )}

                        {onBill && (
                          <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-black flex items-center justify-center">
                            {onBill.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Current Table Bill Tray (Incremental rounds) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                Table {currentTable} Bill Tray ({orderItems.length})
              </span>
              {orderItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateCurrentTableItems([])}
                  className="text-[10px] font-bold text-red-600 hover:text-red-700"
                >
                  Clear Table Bill
                </button>
              )}
            </div>

            {orderItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl">
                Table {currentTable} bill is empty. Tap items above to add round-by-round.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {item.price} ETB × {item.quantity} = <span className="font-bold text-slate-800">{item.price * item.quantity} ETB</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-black text-slate-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBillItem(item.id)}
                        className="w-6 h-6 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Total Transaction Amount Card for This Table */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              TABLE {currentTable} BILL TOTAL
            </span>
            <button
              type="button"
              onClick={() => {
                setUseManualAmount(!useManualAmount);
                if (!useManualAmount) setManualAmount(finalAmount.toString());
              }}
              className="text-[10px] font-bold text-emerald-700 hover:underline"
            >
              {useManualAmount ? 'Use Item Sum' : 'Manual Override'}
            </button>
          </div>

          <div className="flex items-baseline space-x-2 border-b border-slate-100 pb-3">
            {useManualAmount ? (
              <input
                type="number"
                step="any"
                required
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0"
                className="w-full text-3xl sm:text-4xl font-black text-slate-900 focus:outline-none bg-transparent"
              />
            ) : (
              <div className="w-full text-3xl sm:text-4xl font-black text-slate-900">
                {finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <span className="text-xl font-bold text-slate-500">ETB</span>
          </div>
        </div>

        {/* 4. Payment Method Mode: Wire Transfer vs Physical Cash */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Payment Method</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              paymentType === 'manual' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-800'
            }`}>
              {paymentType === 'manual' ? '💵 Manual Cash' : '🏦 Bank / Wire'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentType('wire');
                setOpenTables(prev => ({
                  ...prev,
                  [currentTable]: {
                    ...(prev[currentTable] || {}),
                    paymentType: 'wire'
                  }
                }));
              }}
              className={`py-3 px-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                paymentType === 'wire'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-600'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Building2 className={`w-4 h-4 ${paymentType === 'wire' ? 'text-emerald-700' : 'text-slate-500'}`} />
                <span className={`text-xs font-black ${paymentType === 'wire' ? 'text-emerald-900' : 'text-slate-700'}`}>
                  Bank / Wire Transfer
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Customer pays via bank app</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentType('manual');
                setOpenTables(prev => ({
                  ...prev,
                  [currentTable]: {
                    ...(prev[currentTable] || {}),
                    paymentType: 'manual'
                  }
                }));
              }}
              className={`py-3 px-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                paymentType === 'manual'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-600'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Banknote className={`w-4 h-4 ${paymentType === 'manual' ? 'text-emerald-700' : 'text-slate-500'}`} />
                <span className={`text-xs font-black ${paymentType === 'manual' ? 'text-emerald-900' : 'text-slate-700'}`}>
                  Manual Cash
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Physical paper cash collected</span>
            </button>
          </div>
        </div>

        {/* 5A. If Wire Transfer: Bank Plate & Tx ID */}
        {paymentType === 'wire' && (
          <>
            {/* Customer's Bank / Wallet Choosing Plate */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <label className="text-xs font-bold text-slate-800">
                    Customer's Bank / Wallet Plate
                  </label>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {currentProvider.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {ETHIOPIAN_PAYMENT_ACCOUNTS.map((p) => {
                  const isSelected = selectedProviderId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProviderId(p.id);
                        setOpenTables(prev => ({
                          ...prev,
                          [currentTable]: {
                            ...(prev[currentTable] || {}),
                            providerId: p.id
                          }
                        }));
                      }}
                      className={`p-2 rounded-2xl border text-left transition-all flex items-center space-x-2 relative ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-xl text-white text-[10px] font-black flex items-center justify-center shadow-xs shrink-0"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.shortCode}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                          {p.name}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium truncate">
                          {p.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bank Tx ID & Customer Phone Number */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-card space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{currentProvider.name} Transaction ID / Ref #</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Required
                  </span>
                </div>
                
                <input
                  type="text"
                  required
                  value={bankTxId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBankTxId(val);
                    setOpenTables(prev => ({
                      ...prev,
                      [currentTable]: {
                        ...(prev[currentTable] || {}),
                        bankTxId: val
                      }
                    }));
                  }}
                  placeholder="e.g. 9821 or full SMS reference code"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white tracking-wider transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ask customer for their {currentProvider.name} transaction ID or last 4 digits from SMS.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Customer Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center space-x-1 text-slate-500 font-bold text-xs pointer-events-none">
                    <span>🇪🇹 +251</span>
                    <span className="text-slate-300">|</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="912 345 678"
                    className="w-full pl-20 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white tracking-wider transition-all"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* 5B. If Manual Cash Payment: Cash Handover Notice */}
        {paymentType === 'manual' && (
          <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-3xl p-5 shadow-card space-y-3">
            <div className="flex items-center space-x-2 text-emerald-900">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">Physical Cash Handover</h3>
                <p className="text-xs text-emerald-800 font-medium">You received physical cash from customer</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-emerald-100 text-xs text-slate-700 space-y-1.5">
              <div className="flex justify-between font-bold">
                <span>Cash to Hand In:</span>
                <span className="text-emerald-700 font-black">{finalAmount.toLocaleString()} ETB</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When you tap below, a cash confirmation request will be queued on the Cashier’s screen. Cashier will confirm receipt of cash.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 6. Submit Action Button for This Table */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-6 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-800/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <span>
                {paymentType === 'manual' 
                  ? `Confirm Cash Request (${finalAmount.toLocaleString()} ETB)`
                  : `Send Table ${currentTable} to Cashier (${finalAmount.toLocaleString()} ETB)`}
              </span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Daily Cash vs Wire Audit Summary Widget for Waiter */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Your Daily Confirmed Total</span>
            <span className="font-extrabold text-slate-800">{waiterDailyTotals.totalRevenue.toLocaleString()} ETB</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-xs">
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1 text-[11px] font-semibold">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cash</span>
              </span>
              <span className="font-bold text-slate-900">{waiterDailyTotals.manualCashTotal.toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1 text-[11px] font-semibold">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Wire</span>
              </span>
              <span className="font-bold text-slate-900">{waiterDailyTotals.wireTotal.toLocaleString()} ETB</span>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
            <span>Direct Cashier SMS / Deposit Verification</span>
          </p>
        </div>

      </form>

      {/* ========================================================================= */}
      {/* ➕ MODAL: OPEN A NEW TABLE */}
      {/* ========================================================================= */}
      {showNewTableModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-sm font-black text-slate-900">Open New Table Tab</span>
              <button 
                type="button"
                onClick={() => setShowNewTableModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpenNewTable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Table Number / Name:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 15, 22, VIP-1, Terrace-3"
                  value={newTableNumberInput}
                  onChange={(e) => setNewTableNumberInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              {/* Quick Table Presets */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">Quick Select:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {['T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'T-9', 'T-10', 'T-14', 'T-15'].map((quickT) => (
                    <button
                      key={quickT}
                      type="button"
                      onClick={() => {
                        setNewTableNumberInput(quickT);
                      }}
                      className="py-1 px-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-bold rounded-lg transition-colors text-center"
                    >
                      {quickT}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTableModal(false)}
                  className="py-2.5 px-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Open Tab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
