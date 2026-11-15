import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import MoneyMascot from '../components/common/MoneyMascot';
import MoneyPulseScore from '../components/common/MoneyPulseScore';
import PurchaseSimulatorModal from '../components/common/PurchaseSimulatorModal';
import CampusHubModal from '../components/common/CampusHubModal';
import { formatCurrency, formatDate } from '../utils/format';
import { getIcon } from '../utils/icons';
import {
  Plus,
  HelpCircle,
  Sparkles,
  Calendar,
  ChevronRight,
  Receipt,
  Users,
  Wallet,
  Zap,
  Edit2,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function HomePage() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [frequentChips, setFrequentChips] = useState([]);
  const [upcomingSubs, setUpcomingSubs] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [latestCheckin, setLatestCheckin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Allowance setup/edit modal
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [allowanceInput, setAllowanceInput] = useState('');
  const [savingAllowance, setSavingAllowance] = useState(false);

  // Simulator & Campus Hub modals
  const [showSimulator, setShowSimulator] = useState(false);
  const [showCampusHub, setShowCampusHub] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    try {
      setLoading(true);
      const [sumRes, expRes, freqRes, checkRes, subRes, saveRes, budRes] = await Promise.all([
        api.get('/expenses/summary').catch(() => ({ data: { month: 0, today: 0, safe_per_day: 0, days_left: 1, money_left: 0 } })),
        api.get('/expenses?limit=3').catch(() => ({ data: { expenses: [] } })),
        api.get('/expenses/frequent').catch(() => ({ data: [] })),
        api.get('/questions/weekly-checkin').catch(() => ({ data: null })),
        api.get('/settings/subscriptions').catch(() => ({ data: { upcoming_7_days: [] } })),
        api.get('/savings').catch(() => ({ data: [] })),
        api.get('/budgets').catch(() => ({ data: [] }))
      ]);

      setSummary(sumRes.data);
      setRecentExpenses(expRes.data.expenses || []);
      setFrequentChips(freqRes.data || []);
      setLatestCheckin(checkRes.data);
      setUpcomingSubs(subRes.data.upcoming_7_days || []);
      setSavingsGoals(saveRes.data || []);
      setBudgets(budRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickAdd(chip) {
    if (navigator.vibrate) navigator.vibrate(20);
    try {
      await api.post('/expenses', {
        amount: chip.amount,
        category_id: chip.category_id,
        merchant: chip.label,
        payment_method: chip.payment_method || 'upi',
        tag: chip.tag,
      });
      loadHomeData();
    } catch (err) {
      alert('Failed to log quick spend');
    }
  }

  async function handleWeeklyMood(mood) {
    try {
      await api.post('/questions/weekly-checkin', { mood });
      setLatestCheckin({ mood });
      if (navigator.vibrate) navigator.vibrate(25);
    } catch {}
  }

  async function handleSaveAllowance() {
    const val = parseFloat(allowanceInput);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid pocket money amount');
      return;
    }
    setSavingAllowance(true);
    try {
      await updateProfile({ monthly_income: val });
      setShowAllowanceModal(false);
      setAllowanceInput('');
      await loadHomeData();
    } catch (err) {
      console.error('Failed to update allowance:', err);
      alert('Could not save pocket money');
    } finally {
      setSavingAllowance(false);
    }
  }

  const income = summary?.monthly_income || user?.monthly_income || 0;
  const spentMonth = summary?.month || 0;
  const moneyLeft = summary?.money_left !== undefined ? summary.money_left : income - spentMonth;
  const safePerDay = summary?.safe_per_day || 0;
  const daysLeft = summary?.days_left || 1;
  const pctUsed = income > 0 ? Math.min(100, Math.round((spentMonth / income) * 100)) : 0;

  // Safe to spend status badge
  let paceStatus = 'Safe & on track';
  let paceBadgeBg = 'bg-primary text-white';
  if (safePerDay <= 0) {
    paceStatus = 'Zero-spend mode';
    paceBadgeBg = 'bg-expense text-white';
  } else if (safePerDay < 50) {
    paceStatus = 'Pacing tight';
    paceBadgeBg = 'bg-accent text-white';
  }

  // Active goals aggregation
  const totalGoalTarget = savingsGoals.reduce((s, g) => s + g.target_amount, 0);
  const totalGoalSaved = savingsGoals.reduce((s, g) => s + g.current_amount, 0);
  const goalSavedPct = totalGoalTarget > 0 ? Math.round((totalGoalSaved / totalGoalTarget) * 100) : 0;

  // Budget health summary
  const overBudgets = budgets.filter(b => b.alert_level === 'exceeded');
  const warningBudgets = budgets.filter(b => b.alert_level === 'warning');

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-heading font-extrabold uppercase tracking-wider text-text-muted">
            Student Money OS
          </span>
          <h1 className="text-xl font-heading font-black text-text">
            Hey, {user?.name || 'Friend'}! 👋
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {summary?.pending_questions > 0 && (
            <Link
              to="/questions"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white border-2 border-border shadow-sticker text-xs font-heading font-black animate-pulse"
            >
              <HelpCircle size={15} />
              <span>{summary.pending_questions}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setShowSimulator(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface text-text border-2 border-border shadow-sticker-hover text-xs font-heading font-bold"
            title="Can I afford this simulator"
          >
            <span>🤔</span>
            <span className="hidden sm:inline">Can I Afford?</span>
          </button>
        </div>
      </div>

      {/* Pocket Money Setup Card (If not configured or 0) */}
      {income === 0 && (
        <div className="card-brutal p-4 bg-highlight text-text border-2 border-border shadow-sticker space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👛</span>
            <div>
              <h2 className="text-sm font-heading font-black">Set Your Monthly Pocket Money</h2>
              <p className="text-[11px] text-text-muted font-medium">
                Enter your allowance so we can track your daily safe spending buffer!
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="e.g. 3500"
              value={allowanceInput}
              onChange={(e) => setAllowanceInput(e.target.value)}
              className="input-brutal text-sm py-2 px-3 flex-1 bg-surface font-bold"
            />
            <button
              type="button"
              disabled={savingAllowance}
              onClick={handleSaveAllowance}
              className="btn-brutal py-2 px-4 text-xs shrink-0"
            >
              {savingAllowance ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {['1500', '3000', '5000', '8000'].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAllowanceInput(amt)}
                className="text-[11px] font-heading font-bold px-2.5 py-0.5 rounded-full border border-border bg-surface hover:bg-bg transition-colors"
              >
                ₹{parseInt(amt).toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* HERO: SAFE-TO-SPEND TODAY CARD */}
      <div className="card-brutal p-5 bg-surface border-3 border-border shadow-sticker-lg space-y-4 relative overflow-hidden">
        {/* Top Tag & Status Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-heading font-black uppercase tracking-wider text-text-muted">
              How much can I safely spend today?
            </span>
          </div>
          <span className={`text-[10px] font-heading font-black px-2.5 py-0.5 rounded-full border border-border shadow-xs ${paceBadgeBg}`}>
            {paceStatus}
          </span>
        </div>

        {/* Hero Big Typography */}
        <div className="flex items-baseline justify-between pt-1">
          <div>
            <div className="text-5xl font-heading font-black text-primary tracking-tight">
              ₹{safePerDay}
              <span className="text-lg font-bold text-text-muted tracking-normal ml-1">/day</span>
            </div>
            <p className="text-xs font-bold text-text-muted mt-1">
              Safe spending pace for the next {daysLeft} days
            </p>
          </div>

          <div className="text-right">
            <div className="w-14 h-14 rounded-2xl border-2 border-border flex items-center justify-center font-heading font-black text-sm bg-highlight shadow-sticker">
              {income > 0 ? `${100 - pctUsed}%` : '100%'}
            </div>
            <span className="text-[9px] uppercase font-heading font-black text-text-muted block mt-1">
              Remaining
            </span>
          </div>
        </div>

        {/* 3 Secondary Key Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center">
          <div className="p-2 rounded-xl bg-bg border border-border/60">
            <span className="text-[10px] font-heading font-extrabold text-text-muted uppercase block">
              Remaining
            </span>
            <span className="text-xs font-heading font-black text-text truncate block mt-0.5">
              {formatCurrency(moneyLeft)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-bg border border-border/60">
            <span className="text-[10px] font-heading font-extrabold text-text-muted uppercase block">
              Spent Month
            </span>
            <span className="text-xs font-heading font-black text-expense truncate block mt-0.5">
              {formatCurrency(spentMonth)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-bg border border-border/60">
            <span className="text-[10px] font-heading font-extrabold text-text-muted uppercase block">
              Allowance
            </span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="text-xs font-heading font-black text-text truncate">
                {formatCurrency(income)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAllowanceInput(income > 0 ? String(income) : '');
                  setShowAllowanceModal(true);
                }}
                className="text-primary hover:underline"
                title="Edit allowance"
              >
                <Edit2 size={10} />
              </button>
            </div>
          </div>
        </div>

        {/* Pacing Progress Bar */}
        <div className="space-y-1">
          <div className="h-2.5 w-full bg-bg rounded-full border border-border overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pctUsed >= 100 ? 'bg-expense' : pctUsed >= 80 ? 'bg-accent' : 'bg-primary'
              }`}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
        </div>
      </div>

      {/* ONE PERSONALIZED MONEY PULSE INSIGHT */}
      <MoneyPulseScore />

      {/* QUICK PRIMARY ACTION BAR */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => navigate('/add')}
          className="btn-brutal py-3 px-2 text-xs flex items-center justify-center gap-1.5 bg-primary text-white shadow-sticker"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Smart Add</span>
        </button>

        <button
          onClick={() => navigate('/splits')}
          className="btn-brutal-secondary py-3 px-2 text-xs flex items-center justify-center gap-1.5 bg-surface text-text shadow-sticker"
        >
          <Users size={15} />
          <span>Split Bills</span>
        </button>

        <button
          onClick={() => setShowCampusHub(true)}
          className="btn-brutal py-3 px-2 text-xs flex items-center justify-center gap-1.5 bg-highlight text-text border-2 border-border shadow-sticker"
        >
          <span>🎒 Hub</span>
          <span className="text-[10px] bg-accent text-white px-1.5 py-0.2 rounded-full font-black">4</span>
        </button>
      </div>

      {/* UPCOMING RECURRING BILLS (NEXT 7 DAYS) */}
      {upcomingSubs.length > 0 && (
        <div className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-black text-text flex items-center gap-1.5">
              <Clock size={14} className="text-accent" />
              <span>Upcoming Bills (Next 7 Days)</span>
            </span>
            <Link to="/profile" className="text-[11px] font-heading font-bold text-primary hover:underline">
              Manage
            </Link>
          </div>

          <div className="space-y-1.5">
            {upcomingSubs.map((sub) => (
              <div
                key={sub.id}
                className="p-2 rounded-xl bg-bg border border-border flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">💳</span>
                  <div>
                    <p className="font-heading font-bold text-text">{sub.name}</p>
                    <p className="text-[10px] text-text-muted">Due on {formatDate(sub.next_billing_date)}</p>
                  </div>
                </div>
                <span className="font-heading font-black text-expense">
                  ₹{Math.round(sub.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SAVINGS PROGRESS & BUDGET HEALTH TILES */}
      <div className="grid grid-cols-2 gap-2">
        {/* Savings Goals Mini-Tile */}
        <Link
          to="/savings"
          className="card-brutal p-3 bg-surface border-2 border-border shadow-sticker hover:translate-y-[-2px] transition-transform block space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-black text-text-muted uppercase">
              Savings Goals
            </span>
            <span className="text-base">🎯</span>
          </div>

          {savingsGoals.length > 0 ? (
            <div>
              <div className="text-base font-heading font-black text-primary">
                {goalSavedPct}%
                <span className="text-[10px] font-bold text-text-muted ml-1">saved</span>
              </div>
              <p className="text-[10px] font-bold text-text truncate mt-0.5">
                {savingsGoals[0]?.name}
              </p>
            </div>
          ) : (
            <p className="text-[11px] font-bold text-text-muted">No goal set yet. Tap to create!</p>
          )}
        </Link>

        {/* Budget Health Mini-Tile */}
        <Link
          to="/hub"
          className="card-brutal p-3 bg-surface border-2 border-border shadow-sticker hover:translate-y-[-2px] transition-transform block space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-black text-text-muted uppercase">
              Budget Health
            </span>
            <span className="text-base">📊</span>
          </div>

          {overBudgets.length > 0 ? (
            <div>
              <div className="text-sm font-heading font-black text-expense">
                {overBudgets.length} Exceeded!
              </div>
              <p className="text-[10px] font-bold text-text-muted truncate mt-0.5">
                {overBudgets[0]?.category_name || 'Category'} limit crossed
              </p>
            </div>
          ) : warningBudgets.length > 0 ? (
            <div>
              <div className="text-sm font-heading font-black text-accent">
                {warningBudgets.length} Near Limit
              </div>
              <p className="text-[10px] font-bold text-text-muted truncate mt-0.5">
                80%+ used in {warningBudgets[0]?.category_name}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-sm font-heading font-black text-primary">
                All Healthy 🟢
              </div>
              <p className="text-[10px] font-bold text-text-muted truncate mt-0.5">
                Spending within limits
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Mascot Card */}
      <MoneyMascot
        mood={summary?.mascot_mood || 'calm'}
        line={summary?.mascot_line}
      />

      {/* Frequent Spends (1-Tap Add) */}
      {frequentChips.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-heading font-extrabold uppercase text-text-muted block tracking-wider">
            Frequent Spends (1-Tap Add)
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {frequentChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAdd(chip)}
                className="card-brutal p-2.5 min-w-[130px] shrink-0 text-left flex items-center gap-2 hover:translate-y-[-2px] transition-all bg-surface active:scale-95"
              >
                <div
                  className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: chip.category_color }}
                >
                  <Plus size={16} strokeWidth={3} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-heading font-bold truncate text-text">{chip.label}</p>
                  <p className="text-[11px] font-bold text-primary">₹{chip.amount}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RECENT TRANSACTIONS (LATEST 3) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted">
            Recent Transactions
          </h2>
          {recentExpenses.length > 0 && (
            <Link
              to="/transactions"
              className="text-xs font-heading font-bold text-primary flex items-center gap-0.5 hover:underline"
            >
              <span>See All</span>
              <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {recentExpenses.length === 0 ? (
          <div className="card-brutal p-7 text-center bg-surface space-y-3">
            <div className="w-14 h-14 rounded-2xl border-2 border-border shadow-sticker bg-highlight mx-auto flex items-center justify-center text-2xl">
              ✨
            </div>
            <h3 className="text-sm font-heading font-black text-text">
              Clean Canvas!
            </h3>
            <p className="text-xs text-text-muted font-medium max-w-xs mx-auto">
              Add your first spend and let's start keeping your pocket money safe.
            </p>
            <button
              onClick={() => navigate('/add')}
              className="btn-brutal text-xs py-2 px-4 inline-flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Log First Spend</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentExpenses.slice(0, 3).map((exp) => {
              const IconComp = getIcon(exp.category_icon || 'Circle');
              return (
                <div
                  key={exp.id}
                  onClick={() => navigate('/transactions')}
                  className="card-brutal p-3 flex items-center justify-between cursor-pointer hover:translate-x-1 transition-transform bg-surface"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl border-2 border-border shadow-sticker-hover flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: exp.category_color || '#FF5C8A' }}
                    >
                      <IconComp size={16} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-heading font-bold text-text truncate">
                        {exp.merchant || exp.category_name || exp.note || 'Spend'}
                      </p>
                      <p className="text-[10px] text-text-muted font-medium flex items-center gap-1.5">
                        <span>{formatDate(exp.date)}</span>
                        <span>•</span>
                        <span className="uppercase">{exp.payment_method}</span>
                        {exp.tag && (
                          <span className="font-extrabold uppercase text-primary">
                            • {exp.tag}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-heading font-black text-expense shrink-0">
                    -{formatCurrency(exp.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Check-in Mood Picker */}
      <div className="card-brutal p-3 bg-surface space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-heading font-bold text-text flex items-center gap-1.5">
            <Zap size={14} className="text-accent" />
            <span>Weekly check-in: How did your week feel?</span>
          </span>
          {latestCheckin?.mood && (
            <span className="text-[9px] font-bold text-income bg-income/10 px-2 py-0.5 rounded-full border border-income/30">
              Recorded
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'great', label: 'Great', emoji: '😎' },
            { id: 'okay', label: 'Okay', emoji: '🙂' },
            { id: 'stressed', label: 'Stressed', emoji: '😬' },
            { id: 'broke', label: 'Broke', emoji: '😭' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleWeeklyMood(m.id)}
              className={`p-2 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                latestCheckin?.mood === m.id
                  ? 'border-border bg-highlight shadow-sticker scale-105'
                  : 'border-border/50 bg-bg text-text-muted hover:border-border'
              }`}
            >
              <div className="text-lg mb-0.5">{m.emoji}</div>
              <span className="text-[10px] block font-heading">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Edit Allowance Modal */}
      {showAllowanceModal && (
        <div className="card-brutal p-4 bg-highlight text-text border-2 border-border shadow-sticker space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-heading font-black flex items-center gap-1.5">
              <Wallet size={14} />
              <span>Update Pocket Money / Allowance</span>
            </h3>
            <button
              onClick={() => setShowAllowanceModal(false)}
              className="text-xs font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="e.g. 3000"
              value={allowanceInput}
              onChange={(e) => setAllowanceInput(e.target.value)}
              className="input-brutal text-sm py-2 px-3 flex-1 bg-surface font-bold"
            />
            <button
              type="button"
              disabled={savingAllowance}
              onClick={handleSaveAllowance}
              className="btn-brutal py-2 px-4 text-xs shrink-0"
            >
              {savingAllowance ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>
      )}

      {/* Purchase Simulator Modal */}
      <PurchaseSimulatorModal
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
      />

      {/* Campus & Student Hub (4-in-1 Tools Modal) */}
      <CampusHubModal
        isOpen={showCampusHub}
        onClose={() => setShowCampusHub(false)}
        onRefresh={loadHomeData}
      />
    </div>
  );
}
