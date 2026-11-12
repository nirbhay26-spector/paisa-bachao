import clsx from 'clsx';

export function ProgressRing({ percentage, size = 120, strokeWidth = 10, color = '#1E5B4F', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const pct = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" className="text-border dark:text-border-dark" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function LoadingSkeleton({ lines = 3, className }) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4 rounded" style={{ width: `${80 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
            </div>
            <div className="skeleton h-5 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {Icon && <div className="w-16 h-16 rounded-full bg-bg dark:bg-bg-dark flex items-center justify-center mb-4"><Icon size={32} className="text-text-muted" /></div>}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && <p className="text-text-muted text-sm mb-4 max-w-xs">{description}</p>}
      {action && <button onClick={onAction} className="btn-primary text-sm">{action}</button>}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="card border-expense/30 bg-expense/5 text-center py-4">
      <p className="text-expense font-medium text-sm">{message || 'Something went wrong'}</p>
      {onRetry && <button onClick={onRetry} className="text-primary text-sm font-medium mt-2 underline">Try again</button>}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="bottom-sheet p-5 z-50 animate-slideUp">
        <div className="w-10 h-1 bg-border dark:bg-border-dark rounded-full mx-auto mb-4" />
        {title && <h2 className="text-lg font-bold mb-4">{title}</h2>}
        {children}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } .animate-slideUp { animation: slideUp 0.3s ease-out; }`}</style>
    </>
  );
}

