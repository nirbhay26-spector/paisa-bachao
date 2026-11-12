// Shared category definitions used by both frontend and backend
const CATEGORIES = [
  { id: 'food', icon: 'UtensilsCrossed', label: 'Food', color: '#E8A317' },
  { id: 'snacks_cafe', icon: 'Coffee', label: 'Snacks & Cafe', color: '#D4A04A' },
  { id: 'travel', icon: 'Bus', label: 'Travel', color: '#4A90D9' },
  { id: 'shopping', icon: 'ShoppingBag', label: 'Shopping', color: '#9B59B6' },
  { id: 'education', icon: 'GraduationCap', label: 'Education', color: '#2E7D5B' },
  { id: 'entertainment', icon: 'Gamepad2', label: 'Entertainment', color: '#E74C3C' },
  { id: 'recharge_bills', icon: 'Smartphone', label: 'Recharge & Bills', color: '#3498DB' },
  { id: 'health', icon: 'Heart', label: 'Health', color: '#1ABC9C' },
  { id: 'friends_outings', icon: 'Users', label: 'Friends & Outings', color: '#F39C12' },
  { id: 'subscriptions', icon: 'RefreshCw', label: 'Subscriptions', color: '#8E44AD' },
  { id: 'savings', icon: 'PiggyBank', label: 'Savings', color: '#1E5B4F' },
  { id: 'other', icon: 'MoreHorizontal', label: 'Other', color: '#6B746E' },
];

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: 'Smartphone' },
  { id: 'cash', label: 'Cash', icon: 'Banknote' },
  { id: 'card', label: 'Card', icon: 'CreditCard' },
  { id: 'wallet', label: 'Wallet', icon: 'Wallet' },
];

const EXPENSE_TAGS = ['need', 'want', 'savings'];

const INCOME_SOURCES = ['parents', 'part_time_job', 'scholarship', 'freelance', 'other'];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'de-DE' },
];

// Export for both CommonJS (backend) and ES modules (frontend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATEGORIES, PAYMENT_METHODS, EXPENSE_TAGS, INCOME_SOURCES, CURRENCIES };
}
export { CATEGORIES, PAYMENT_METHODS, EXPENSE_TAGS, INCOME_SOURCES, CURRENCIES };

