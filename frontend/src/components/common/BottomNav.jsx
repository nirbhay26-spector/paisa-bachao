import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Receipt, Plus, Users, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';

export default function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tabs = [
    { to: '/', icon: Home, label: t('nav.home') || 'Home' },
    { to: '/transactions', icon: Receipt, label: t('nav.activity') || 'Activity' },
    { to: '/add', icon: Plus, label: t('nav.add') || 'Add', isFab: true },
    { to: '/splits', icon: Users, label: t('nav.split') || 'Split' },
    { to: '/hub', icon: LayoutGrid, label: t('nav.hub') || 'Hub' },
  ];

  function triggerHaptic() {
    if (navigator.vibrate) navigator.vibrate(15);
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface/90 backdrop-blur-md border-t-2 border-border z-40 safe-bottom shadow-sticker">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
        {tabs.map(({ to, icon: Icon, label, isFab }) =>
          isFab ? (
            <button
              key={to}
              onClick={() => {
                triggerHaptic();
                navigate(to);
              }}
              className="flex items-center justify-center w-14 h-14 -mt-7 bg-primary rounded-full border-3 border-border shadow-sticker text-white hover:scale-105 active:scale-95 transition-all focus:outline-none"
              aria-label="Quick Add Spend"
            >
              <Icon size={30} strokeWidth={3.5} />
            </button>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={triggerHaptic}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 min-w-[54px] min-h-[44px] text-xs font-bold transition-all',
                  isActive
                    ? 'text-primary scale-105 font-black'
                    : 'text-text-muted hover:text-text'
                )
              }
            >
              <Icon size={20} strokeWidth={2.4} />
              <span className="text-[10.5px] font-heading font-extrabold">{label}</span>
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
}
