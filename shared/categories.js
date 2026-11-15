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

function suggestCategoryAndTag(text = '') {
  const lower = (text || '').toLowerCase().trim();
  if (!lower) return { category: 'other', tag: 'need' };

  // Subscriptions
  if (/spotify|netflix|hotstar|prime|youtube\s*premium|apple\s*music|disney|zee5|sonyliv/.test(lower)) {
    return { category: 'subscriptions', tag: 'want' };
  }
  // Travel / Commute
  if (/uber|ola|rapido|metro|irctc|redbus|bus|auto|fuel|petrol|diesel|toll|fastag|cab|taxi/.test(lower)) {
    return { category: 'travel', tag: 'need' };
  }
  // Food / Meals
  if (/swiggy|zomato|mcdonald|burger|domino|pizza|kfc|subway|biryani|mess|canteen|thali|dhaba|lunch|dinner|restaurant|haldiram/.test(lower)) {
    return { category: 'food', tag: 'need' };
  }
  // Snacks / Cafe
  if (/chai|tea|tapri|coffee|starbucks|cafe|ccd|costa|boba|maggie|samosa|bakery|dessert|juice|shake/.test(lower)) {
    return { category: 'snacks_cafe', tag: 'want' };
  }
  // Quick Commerce / Groceries
  if (/blinkit|zepto|instamart|bigbasket|dmart|grocer|kirana|ration/.test(lower)) {
    return { category: 'food', tag: 'need' };
  }
  // Shopping
  if (/amazon|flipkart|myntra|ajio|zara|h&m|meesho|nykaa|clothes|shoes|mall/.test(lower)) {
    return { category: 'shopping', tag: 'want' };
  }
  // Education
  if (/book|stationery|xerox|print|udemy|coursera|fee|tuition|exam|college|hostel\s*fee|class/.test(lower)) {
    return { category: 'education', tag: 'need' };
  }
  // Recharge & Utilities
  if (/jio|airtel|vi\b|bsnl|recharge|wifi|broadband|electricity|bill|cylinder|gas|water/.test(lower)) {
    return { category: 'recharge_bills', tag: 'need' };
  }
  // Entertainment
  if (/cinema|pvr|inox|movie|steam|playstation|game|concert|bowling/.test(lower)) {
    return { category: 'entertainment', tag: 'want' };
  }
  // Friends & Outings
  if (/split|party|outing|hangout|club|pub|trip|celebrat/.test(lower)) {
    return { category: 'friends_outings', tag: 'want' };
  }
  // Health
  if (/pharmacy|medicine|doctor|clinic|apollo|1mg|hospital|dentist|tablet/.test(lower)) {
    return { category: 'health', tag: 'need' };
  }
  // Savings / Investments
  if (/sip|mutual\s*fund|zerodha|groww|gold|deposit|ppf|fd\b/.test(lower)) {
    return { category: 'savings', tag: 'savings' };
  }

  return { category: 'other', tag: 'need' };
}

// Export for both CommonJS (backend) and ES modules (frontend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATEGORIES, PAYMENT_METHODS, EXPENSE_TAGS, INCOME_SOURCES, CURRENCIES, suggestCategoryAndTag };
}
export { CATEGORIES, PAYMENT_METHODS, EXPENSE_TAGS, INCOME_SOURCES, CURRENCIES, suggestCategoryAndTag };

