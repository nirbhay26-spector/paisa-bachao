import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ThemeContext = createContext(null);

export const THEMES = [
  { id: 'mango_pop', name: 'Mango Pop', dot: '#FF5C8A', bg: '#FFF4D6', isDark: false },
  { id: 'lofi_lavender', name: 'Lo-fi Lavender', dot: '#6C4CF1', bg: '#EDE7FF', isDark: false },
  { id: 'midnight_arcade', name: 'Midnight Arcade', dot: '#00E5C3', bg: '#0E0B1F', isDark: true },
  { id: 'matcha_chill', name: 'Matcha Chill', dot: '#2F8F5B', bg: '#E6F4E1', isDark: false },
  { id: 'sunset_street', name: 'Sunset Street', dot: '#FF6B35', bg: '#FFE3D3', isDark: false },
  { id: 'cherry_soda', name: 'Cherry Soda', dot: '#E5174D', bg: '#FFE9EC', isDark: false },
  { id: 'citrus_punch', name: 'Citrus Punch', dot: '#FF7A00', bg: '#FFF7E0', isDark: false },
  { id: 'aurora_night', name: 'Aurora Night', dot: '#5CFFB1', bg: '#08130F', isDark: true },
];

// WCAG AA Luminance & Contrast Checker
export function getLuminance(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function isWcagAA(hex1, hex2) {
  return getContrastRatio(hex1, hex2) >= 4.5;
}

export function applyCustomThemeColors(primaryHex, bgHex) {
  const root = document.documentElement;
  const isDark = getLuminance(bgHex) < 0.2;
  const textHex = isDark ? '#F5F5FA' : '#1B1B2F';
  const textMuted = isDark ? '#A0A0BA' : '#5C5B72';
  const surfaceHex = isDark ? '#1C1C2E' : '#FFFFFF';
  const borderHex = isDark ? '#E5E5FA' : '#1B1B2F';

  root.style.setProperty('--color-primary', primaryHex);
  root.style.setProperty('--color-bg', bgHex);
  root.style.setProperty('--color-surface', surfaceHex);
  root.style.setProperty('--color-text', textHex);
  root.style.setProperty('--color-text-muted', textMuted);
  root.style.setProperty('--color-border', borderHex);
  root.style.setProperty('--color-highlight', primaryHex);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('pb_theme') || 'mango_pop');
  const [customColors, setCustomColors] = useState(() => {
    const saved = localStorage.getItem('pb_custom_theme');
    return saved ? JSON.parse(saved) : { primary: '#FF5C8A', bg: '#FFF4D6' };
  });

  useEffect(() => {
    if (theme === 'custom') {
      document.documentElement.setAttribute('data-theme', 'custom');
      applyCustomThemeColors(customColors.primary, customColors.bg);
    } else {
      document.documentElement.removeAttribute('style');
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('pb_theme', theme);
  }, [theme, customColors]);

  async function setTheme(newTheme) {
    setThemeState(newTheme);
    localStorage.setItem('pb_theme', newTheme);
    try {
      if (localStorage.getItem('pb_token')) {
        await api.put('/settings/theme', { theme: newTheme });
      }
    } catch {
      // offline
    }
  }

  function setCustomTheme(primaryHex, bgHex) {
    const custom = { primary: primaryHex, bg: bgHex };
    setCustomColors(custom);
    localStorage.setItem('pb_custom_theme', JSON.stringify(custom));
    setTheme('custom');
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      themes: THEMES,
      customColors,
      setCustomTheme,
      getContrastRatio,
      isWcagAA
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
