import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import hinglish from './locales/hinglish.json';
import pa from './locales/pa.json';
import bn from './locales/bn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import ur from './locales/ur.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  hinglish: { translation: hinglish },
  pa: { translation: pa },
  bn: { translation: bn },
  ta: { translation: ta },
  te: { translation: te },
  mr: { translation: mr },
  gu: { translation: gu },
  kn: { translation: kn },
  ml: { translation: ml },
  ur: { translation: ur }
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
  { code: 'hinglish', label: 'Hinglish', native: 'Hinglish (Roman)', dir: 'ltr' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', dir: 'ltr' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', dir: 'ltr' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', dir: 'ltr' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', dir: 'ltr' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', dir: 'ltr' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', dir: 'ltr' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', native: 'اردو', dir: 'rtl' }
];

export function applyLanguageDirection(langCode) {
  const isRTL = langCode === 'ur';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = langCode;
  if (isRTL) {
    document.documentElement.classList.add('rtl-layout');
  } else {
    document.documentElement.classList.remove('rtl-layout');
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

// Apply initial direction
applyLanguageDirection(i18n.language || 'en');

// Listen to language changes
i18n.on('languageChanged', (lng) => {
  applyLanguageDirection(lng);
});

export default i18n;
