import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';
import { Coffee, AlertTriangle, CheckCircle2, ChevronRight, X, Sparkles, Target } from 'lucide-react';

export default function MoneyPulseChart({ transactions = [], safePerDay = 150, monthlyIncome = 3000, savingsGoal = 500 }) {
  const { t } = useTranslation();
  const [range, setRange] = useState('7D'); // '7D' | '30D' | '3M'
  const [selectedDay, setSelectedDay] = useState(null);

  // Group transactions into daily timeline based on selected range
  const timelineData = useMemo(() => {
    const daysCount = range === '7D' ? 7 : range === '30D' ? 30 : 90;
    const now = new Date();
    const days = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayTxns = transactions.filter(t => t.date && t.date.slice(0, 10) === dateStr && !t.is_deleted);
      const total = dayTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      days.push({
        date: dateStr,
        dayLabel: d.toLocaleDateString('en-IN', { weekday: 'narrow' }),
        dateNum: d.getDate(),
        monthLabel: d.toLocaleDateString('en-IN', { month: 'short' }),
        total,
        transactions: dayTxns,
        isOverspent: total > safePerDay && safePerDay > 0,
        overspentAmount: Math.max(0, total - safePerDay)
      });
    }
    return days;
  }, [transactions, range, safePerDay]);

  // Compute Chai & Snack Tax (all spends under ₹100)
  const chaiTax = useMemo(() => {
    const recent = transactions.filter(t => {
      const isUnder100 = t.amount <= 100;
      const isThisMonth = t.date && new Date(t.date).getMonth() === new Date().getMonth();
      return isUnder100 && isThisMonth && !t.is_deleted;
    });
    const total = recent.reduce((sum, t) => sum + t.amount, 0);
    const count = recent.length;
    return { total, count };
  }, [transactions]);

  // Goal fuel calculation
  const totalSpentInPeriod = timelineData.reduce((sum, d) => sum + d.total, 0);
  const projectedSavings = Math.max(0, monthlyIncome - totalSpentInPeriod);

  // Max value for bar chart height scaling
  const maxDaySpend = Math.max(...timelineData.map(d => d.total), safePerDay * 1.5, 200);

  return (
    <div className="card-brutal p-4 bg-surface border-2 border-border shadow-sticker space-y-4">
      {/* Header & Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base">📈</span>
            <h2 className="text-sm font-heading font-black text-text uppercase tracking-wider">
              Money Pulse
            </h2>
          </div>
          <p className="text-[11px] text-text-muted font-medium">
            Daily spending pace vs ₹{safePerDay} safe limit
          </p>
        </div>

        {/* Range Tabs */}
        <div className="flex bg-bg p-1 rounded-xl border border-border self-start sm:self-auto">
          {['7D', '30D', '3M'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-heading font-extrabold transition-all ${
                range === r
                  ? 'bg-primary text-white shadow-sticker border border-border'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Pulse Timeline Chart */}
      <div className="relative pt-6 pb-2">
        {/* Shaded Safe Zone Line */}
        <div
          className="absolute inset-x-0 border-b-2 border-dashed border-income/70 flex items-center justify-end pr-1 z-10 pointer-events-none"
          style={{
            bottom: `${Math.min(90, Math.max(15, (safePerDay / maxDaySpend) * 140))}px`
          }}
        >
          <span className="bg-income text-white text-[9px] font-heading font-black px-1.5 py-0.5 rounded-md shadow-xs -translate-y-2">
            Safe: ₹{safePerDay}/day
          </span>
        </div>

        {/* Timeline Columns */}
        <div className="flex items-end justify-between gap-1 h-44 overflow-x-auto pb-6 pt-4 px-1">
          {timelineData.map((day) => {
            const barHeightPct = Math.min(100, Math.max(8, (day.total / maxDaySpend) * 100));

            return (
              <div
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className="flex flex-col items-center flex-1 min-w-[28px] max-w-[46px] group cursor-pointer relative"
              >
                {/* Warning icon if overspent */}
                {day.isOverspent && (
                  <div className="text-[10px] text-expense font-black mb-1 animate-bounce-once" title={`Overspent by ₹${day.overspentAmount}`}>
                    ⚠
                  </div>
                )}

                {/* Bar with bubbles */}
                <div
                  className={`w-full rounded-t-xl border-2 border-border transition-all relative flex flex-col justify-end items-center p-0.5 ${
                    day.isOverspent
                      ? 'bg-expense/80 shadow-sticker'
                      : day.total > 0
                      ? 'bg-income/80 shadow-sticker'
                      : 'bg-bg border-border/40'
                  } group-hover:scale-105`}
                  style={{ height: `${barHeightPct}%` }}
                >
                  {/* Transaction bubble dots */}
                  <div className="flex flex-wrap gap-0.5 justify-center items-center w-full mb-1">
                    {day.transactions.slice(0, 3).map((txn, idx) => (
                      <span
                        key={txn.id || idx}
                        className="w-2 h-2 rounded-full bg-white border border-border shadow-xs"
                        title={`${txn.merchant || 'Spend'}: ₹${txn.amount}`}
                      />
                    ))}
                    {day.transactions.length > 3 && (
                      <span className="text-[8px] font-black text-white">+</span>
                    )}
                  </div>
                </div>

                {/* Day label */}
                <div className="text-center mt-1.5">
                  <span className="block text-[10px] font-heading font-black text-text leading-tight">
                    {day.dateNum}
                  </span>
                  <span className="block text-[9px] font-bold text-text-muted uppercase">
                    {day.dayLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-text-muted pt-2 border-t border-border/40 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-income border border-border" />
          <span>Inside Safe Limit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-expense border border-border" />
          <span>Overspent Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white border border-border" />
          <span>Bubble = Spend</span>
        </div>
      </div>

      {/* Chai Tax Card (<₹100 Spends) */}
      <div className="p-3.5 bg-highlight/40 rounded-2xl border-2 border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-highlight text-text border border-border flex items-center justify-center text-xl shrink-0">
            ☕
          </div>
          <div>
            <h3 className="text-xs font-heading font-black text-text">
              Chai & Snack Tax: ₹{chaiTax.total.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-text-muted font-medium">
              {chaiTax.count} spends under ₹100 this month. That is ~{Math.round(chaiTax.total / 15)} tapri chais!
            </p>
          </div>
        </div>
      </div>

      {/* Goal Fuel Projection Bar */}
      {savingsGoal > 0 && (
        <div className="p-3.5 bg-bg rounded-2xl border-2 border-border space-y-2">
          <div className="flex items-center justify-between text-xs font-heading font-black">
            <div className="flex items-center gap-1.5 text-primary">
              <Target size={14} />
              <span>Goal Fuel Pacing</span>
            </div>
            <span className="text-income">
              ₹{projectedSavings.toLocaleString('en-IN')} projected
            </span>
          </div>
          <div className="w-full bg-surface h-2.5 rounded-full border border-border overflow-hidden">
            <div
              className="bg-primary h-full transition-all rounded-full"
              style={{ width: `${Math.min(100, Math.round((projectedSavings / savingsGoal) * 100))}%` }}
            />
          </div>
          <p className="text-[10px] text-text-muted font-medium">
            Keep daily spends under ₹{safePerDay} to hit your savings goal this month!
          </p>
        </div>
      )}

      {/* Day Detail Bottom Sheet / Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="card-brutal w-full max-w-md bg-surface border-t-3 sm:border-3 border-border shadow-sticker-lg p-5 space-y-4 rounded-b-none sm:rounded-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b-2 border-border">
              <div>
                <h3 className="text-sm font-heading font-black text-text">
                  Breakdown for {new Date(selectedDay.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                </h3>
                <p className="text-xs text-text-muted">
                  Total Spent: <span className="font-heading font-black text-text">₹{selectedDay.total.toLocaleString('en-IN')}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-7 h-7 rounded-lg border border-border bg-bg flex items-center justify-center font-bold"
              >
                <X size={15} />
              </button>
            </div>

            {/* Overspend or Safe Status */}
            {selectedDay.isOverspent ? (
              <div className="p-3 bg-expense/10 border border-expense rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-heading font-black text-expense">
                  <AlertTriangle size={15} />
                  <span>Exceeded safe limit by ₹{selectedDay.overspentAmount}</span>
                </div>
                <p className="text-text-muted text-[11px]">
                  💡 Actionable tip: Cap non-essential treats tomorrow to keep your monthly buffer safe.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-income/10 border border-income rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-heading font-black text-income">
                  <CheckCircle2 size={15} />
                  <span>Within daily safe limit!</span>
                </div>
                <p className="text-text-muted text-[11px]">
                  Disciplined spending! The leftover buffer automatically rolls into your goals.
                </p>
              </div>
            )}

            {/* Transactions on this day */}
            <div className="space-y-2 max-h-52 overflow-y-auto">
              <h4 className="text-xs font-heading font-black text-text-muted uppercase tracking-wider">
                Logged Spends ({selectedDay.transactions.length})
              </h4>
              {selectedDay.transactions.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">No spends logged on this day (Zero-spend day! 🎉)</p>
              ) : (
                selectedDay.transactions.map((t) => (
                  <div key={t.id} className="p-2.5 rounded-xl border border-border bg-bg flex items-center justify-between">
                    <div>
                      <p className="font-heading font-black text-xs text-text">{t.merchant || 'Spend'}</p>
                      {t.note && <p className="text-[10px] text-text-muted">{t.note}</p>}
                    </div>
                    <span className="font-heading font-black text-xs text-primary">₹{t.amount}</span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedDay(null)}
              className="btn-brutal w-full py-2.5 text-xs font-black bg-primary text-white"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

