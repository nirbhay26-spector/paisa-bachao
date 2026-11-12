import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Search, Eye, EyeOff, Sparkles, Command } from 'lucide-react';

export default function TopBar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [hideBalances, setHideBalances] = useState(() => {
    return localStorage.getItem('pb_hide_balances') === 'true';
  });

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function toggleHideBalances() {
    const next = !hideBalances;
    setHideBalances(next);
    localStorage.setItem('pb_hide_balances', String(next));
    window.dispatchEvent(new Event('pb_balances_toggle'));
  }

  // Cmd+K shortcut listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const quickNav = [
    { label: 'Home', path: '/', emoji: '🏠' },
    { label: 'Activity & Spends', path: '/transactions', emoji: '🧾' },
    { label: 'Log Spend (+)', path: '/add', emoji: '➕' },
    { label: 'Split Bills', path: '/splits', emoji: '👥' },
    { label: 'Campus Hub', path: '/hub', emoji: '🎛️' },
    { label: 'Money Pulse & Insights', path: '/insights', emoji: '📈' },
    { label: 'AI Advisor', path: '/advisor', emoji: '🤖' },
    { label: 'Goal Jars', path: '/savings', emoji: '🎯' },
    { label: 'Profile & Settings', path: '/profile', emoji: '⚙️' }
  ];

  const filteredNav = quickNav.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b-2 border-border px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {/* Logo & Vibe */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group focus:outline-none"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">💸</span>
            <span className="font-heading font-black text-base text-text tracking-tight">
              Paise Bachao
            </span>
          </button>

          {/* Right Action Icons: Spotlight Search + Hide Balance + Avatar */}
          <div className="flex items-center gap-2">
            {/* Desktop Spotlight Cmd+K button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl border border-border bg-bg text-text-muted hover:text-text text-xs font-heading font-bold"
              title="Search (Cmd+K)"
            >
              <Search size={13} />
              <span>Search</span>
              <kbd className="text-[10px] bg-surface px-1.5 py-0.2 rounded border border-border">⌘K</kbd>
            </button>

            {/* Mobile search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden w-8 h-8 rounded-xl border border-border bg-bg flex items-center justify-center text-text-muted hover:text-text"
              aria-label="Search"
            >
              <Search size={15} />
            </button>

            {/* Hide/Show balances toggle */}
            <button
              onClick={toggleHideBalances}
              className="w-8 h-8 rounded-xl border border-border bg-bg flex items-center justify-center text-text-muted hover:text-text transition-colors"
              title={hideBalances ? 'Show balances' : 'Hide balances (Privacy Mode)'}
              aria-label="Toggle Balance Visibility"
            >
              {hideBalances ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

            {/* Profile Avatar Button on EVERY screen */}
            <button
              onClick={() => navigate('/profile')}
              className={`w-9 h-9 rounded-2xl border-2 border-border shadow-sticker flex items-center justify-center text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 ${
                location.pathname === '/profile' ? 'bg-primary text-white ring-2 ring-primary' : 'bg-highlight'
              }`}
              title="My Profile & Settings"
              aria-label="Profile"
            >
              {user?.avatar?.startsWith('data:') ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.avatar || '🐼'}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Spotlight Command Palette (Cmd+K) Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="card-brutal w-full max-w-md bg-surface border-3 border-border shadow-sticker-lg overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b-2 border-border flex items-center gap-2 bg-bg">
              <Search size={18} className="text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search app features, splits, jars... (Esc to close)"
                className="w-full bg-transparent border-none text-sm font-heading font-bold text-text focus:outline-none"
                autoFocus
              />
              <kbd className="text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-text-muted">ESC</kbd>
            </div>

            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {filteredNav.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-highlight hover:text-text text-left font-heading font-bold text-xs transition-colors"
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              {filteredNav.length === 0 && (
                <p className="p-4 text-center text-xs text-text-muted font-bold">No results found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

