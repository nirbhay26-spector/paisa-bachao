// Currency, number, and date formatting utilities for Indian & International locales
import i18n from '../i18n';

const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  hinglish: 'en-IN',
  pa: 'pa-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  ur: 'ur-PK'
};

export function getActiveLocaleTag() {
  const currentLang = i18n.language || 'en';
  return LOCALE_MAP[currentLang] || 'en-IN';
}

export function formatCurrency(amount, currency = 'INR', customLocale = null) {
  const locale = customLocale || getActiveLocaleTag();
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  } catch {
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  }
}

export function formatNumber(num, customLocale = null) {
  const locale = customLocale || getActiveLocaleTag();
  const val = typeof num === 'number' ? num : parseFloat(num) || 0;
  try {
    return new Intl.NumberFormat(locale).format(val);
  } catch {
    return val.toLocaleString('en-IN');
  }
}

export function formatDate(dateStr, customLocale = null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const locale = customLocale || getActiveLocaleTag();

  if (dateDay.getTime() === today.getTime()) {
    return i18n.t('common.today') || 'Today';
  }
  if (dateDay.getTime() === yesterday.getTime()) {
    return i18n.t('common.yesterday') || 'Yesterday';
  }

  try {
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}

export function formatTime(dateStr, customLocale = null) {
  if (!dateStr) return '';
  const locale = customLocale || getActiveLocaleTag();
  try {
    return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

export function formatFullDate(dateStr, customLocale = null) {
  if (!dateStr) return '';
  const locale = customLocale || getActiveLocaleTag();
  try {
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}

export function groupByDate(items, dateField = 'date') {
  const groups = {};
  for (const item of items) {
    const key = formatDate(item[dateField]);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}
