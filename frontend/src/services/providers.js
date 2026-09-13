/**
 * Ethiopian Restaurant / Hotel Allowed Merchant Payment Accounts & Banks
 */
export const ETHIOPIAN_PAYMENT_ACCOUNTS = [
  {
    id: 'telebirr',
    name: 'Telebirr',
    shortCode: 'TB',
    color: '#008542', // Telebirr Green
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    accentColor: '#10B981',
    category: 'Mobile Money',
    description: 'Ethio Telecom Wallet'
  },
  {
    id: 'cbebirr',
    name: 'CBE Birr / Mobile',
    shortCode: 'CBE',
    color: '#6B1D73', // CBE Purple
    badgeBg: 'bg-purple-50 text-purple-900 border-purple-200',
    accentColor: '#8B5CF6',
    category: 'State Bank',
    description: 'Commercial Bank of Ethiopia'
  },
  {
    id: 'abyssinia',
    name: 'Bank of Abyssinia',
    shortCode: 'BoA',
    color: '#D4AF37', // BoA Gold
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
    accentColor: '#F59E0B',
    category: 'Private Bank',
    description: 'Apollo / BoA Mobile'
  },
  {
    id: 'awash',
    name: 'Awash Birr / Bank',
    shortCode: 'AW',
    color: '#003399', // Awash Blue
    badgeBg: 'bg-blue-50 text-blue-900 border-blue-200',
    accentColor: '#3B82F6',
    category: 'Private Bank',
    description: 'Awash International Bank'
  },
  {
    id: 'coopay',
    name: 'Coopay-Ebirr',
    shortCode: 'CP',
    color: '#0097A7', // Coop Cyan
    badgeBg: 'bg-cyan-50 text-cyan-900 border-cyan-200',
    accentColor: '#06B6D4',
    category: 'Cooperative Bank',
    description: 'Coop Bank of Oromia'
  },
  {
    id: 'dashen',
    name: 'Dashen / Amole',
    shortCode: 'AM',
    color: '#1A237E', // Dashen Navy/Red
    badgeBg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    accentColor: '#6366F1',
    category: 'Private Bank',
    description: 'Dashen Bank Amole'
  },
  {
    id: 'mpesa',
    name: 'Safaricom M-PESA',
    shortCode: 'MP',
    color: '#E50914', // Safaricom Red
    badgeBg: 'bg-rose-50 text-rose-900 border-rose-200',
    accentColor: '#F43F5E',
    category: 'Mobile Money',
    description: 'Safaricom Ethiopia'
  }
];

export function getProviderById(idOrName) {
  if (!idOrName) {
    return ETHIOPIAN_PAYMENT_ACCOUNTS[0]; // Default to Telebirr instead of Unknown
  }
  const lower = idOrName.toLowerCase();
  const found = ETHIOPIAN_PAYMENT_ACCOUNTS.find(
    p => p.id === lower || p.name.toLowerCase().includes(lower) || lower.includes(p.id)
  );
  if (found) return found;
  // Return a dynamic fallback using the actual name so it's never silently wrong
  const initials = idOrName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '??';
  return { id: lower, name: idOrName, shortCode: initials, color: '#64748b', badgeBg: 'bg-slate-50 text-slate-600 border-slate-200', accentColor: '#64748b', category: 'Bank', description: idOrName };
}
