// Shared validation functions
const validators = {
  isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 10000000; // Max 1 crore
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidPin(pin) {
    return /^\d{4}$/.test(pin);
  },

  isValidPassword(password) {
    return typeof password === 'string' && password.length >= 6;
  },

  isValidCategory(categoryId, customCategories = []) {
    const defaultIds = [
      'food', 'snacks_cafe', 'travel', 'shopping', 'education',
      'entertainment', 'recharge_bills', 'health', 'friends_outings',
      'subscriptions', 'savings', 'other'
    ];
    return defaultIds.includes(categoryId) || customCategories.some((c) => c.id === categoryId);
  },

  isValidPaymentMethod(method) {
    return ['upi', 'cash', 'card', 'wallet'].includes(method);
  },

  isValidTag(tag) {
    return ['need', 'want', 'savings'].includes(tag);
  },

  sanitizeString(str, maxLength = 500) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
  },

  isValidDate(dateStr) {
    const d = new Date(dateStr);
    return d instanceof Date && !isNaN(d);
  },

  isValidFileType(mimeType) {
    return ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mimeType);
  },

  isValidFileSize(sizeBytes) {
    return sizeBytes > 0 && sizeBytes <= 5 * 1024 * 1024; // 5 MB
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = validators;
}
