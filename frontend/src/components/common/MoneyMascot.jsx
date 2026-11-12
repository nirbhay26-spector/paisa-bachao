export default function MoneyMascot({ mood = 'calm', line = '' }) {
  const avatars = {
    calm: {
      emoji: '😎',
      bg: 'bg-highlight',
      badge: 'Chilling',
    },
    proud: {
      emoji: '🥳',
      bg: 'bg-income',
      badge: 'Budget Boss',
    },
    nervous: {
      emoji: '😬',
      bg: 'bg-accent',
      badge: 'Caution Zone',
    },
    panicking: {
      emoji: '😱',
      bg: 'bg-expense',
      badge: 'Broke Alert',
    },
  };

  const current = avatars[mood] || avatars.calm;

  return (
    <div className="card-brutal p-3.5 flex items-center gap-3.5 bg-surface">
      <div className="relative shrink-0">
        <div className="w-13 h-13 w-12 h-12 rounded-2xl border-2 border-border shadow-sticker flex items-center justify-center text-2xl bg-highlight">
          {current.emoji}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] uppercase font-heading font-extrabold px-2 py-0.5 rounded-full border border-border bg-bg text-text">
            {current.badge}
          </span>
        </div>
        <p className="text-xs font-semibold text-text leading-tight">
          {line || "You're all set! Track your spends as they happen."}
        </p>
      </div>
    </div>
  );
}

