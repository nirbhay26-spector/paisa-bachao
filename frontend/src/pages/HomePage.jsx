import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import MoneyMascot from '../components/common/MoneyMascot';
import CampusHubModal from '../components/common/CampusHubModal';
import MoneyPulseChart from '../components/common/MoneyPulseChart';
import { formatCurrency, formatDate } from '../utils/format';
import { getIcon } from '../utils/icons';
import {
  Plus,
  HelpCircle,
  Sparkles,
  Calendar,
  Flame,
  ChevronRight,
  Receipt,
  AlertCircle,
  Users,
  Wallet,
  Zap,
  Check,
  Edit2,
  Share2
} from 'lucide-react';

export default function HomePage() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [frequentChips, setFrequentChips] = useState([]);
  const [latestCheckin, setLatestCheckin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Allowance setup/edit modal
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [allowanceInput, setAllowanceInput] = useState('');
  const [savingAllowance, setSavingAllowance] = useState(false);

  // Bill Splitter quick widget
  const [showSplitter, setShowSplitter] = useState(false);
  const [splitBillAmount, setSplitBillAmount] = useState('');
  const [splitPeople, setSplitPeople] = useState('3');
  const [showCampusHub, setShowCampusHub] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    try {
      setLoading(true);
      const [sumRes, expRes, freqRes, checkRes] = await Promise.all([
        api.get('/expenses/summary'),
        api.get('/expenses?limit=5'),
        api.get('/expenses/frequent'),
        api.get('/questions/weekly-checkin'),
      ]);
      setSummary(sumRes.data);
      setRecentExpenses(expRes.data.expenses || []);
      setFrequentChips(freqRes.data || []);
      setLatestCheckin(checkRes.data);
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

  // Split calculation
  const totalBill = parseFloat(splitBillAmount) || 0;
  const numPeople = parseInt(splitPeople) || 1;
  const myShare = totalBill > 0 && numPeople > 0 ? Math.round(totalBill / numPeople) : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-heading font-extrabold uppercase tracking-wider text-text-muted">
            Pocket Money Tracker
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
              <span>{summary.pending_questions} Questions</span>
            </Link>
          )}
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
              placeholder="e.g. 2500"
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

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {['1000', '2000', '3500', '5000'].map((amt) => (
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

      {/* Mascot Card */}
      <MoneyMascot
        mood={summary?.mascot_mood || 'calm'}
        line={summary?.mascot_line}
      />

      {/* Main Chunky Balance Ring Card */}
      <div className="card-brutal p-5 bg-surface space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-heading font-black text-text-muted tracking-wider block">
              Money Left This Cycle
            </span>
            <div className="text-4xl font-heading font-black text-primary tracking-tight">
              {formatCurrency(moneyLeft)}
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-text bg-bg border-2 border-border px-2.5 py-1 rounded-xl shadow-sticker-hover mt-1">
              <Calendar size={13} className="text-primary" />
              <span>₹{safePerDay}/day safe to spend ({daysLeft} days left)</span>
            </div>
          </div>

          <div className="text-right">
            <div className="w-16 h-16 rounded-full border-3 border-border flex items-center justify-center font-heading font-black text-sm bg-highlight shadow-sticker">
              {income > 0 ? `${100 - pctUsed}%` : '100%'}
            </div>
            <span className="text-[10px] uppercase font-heading font-extrabold text-text-muted block mt-1">
              remaining
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-bg rounded-full border-2 border-border overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pctUsed >= 100 ? 'bg-expense' : pctUsed >= 80 ? 'bg-accent' : 'bg-primary'
              }`}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-heading font-bold text-text-muted">
            <span>Spent: {formatCurrency(spentMonth)}</span>
            <div className="flex items-center gap-1.5">
              <span>Allowance: {formatCurrency(income)}</span>
              <button
                type="button"
                onClick={() => {
                  setAllowanceInput(income > 0 ? String(income) : '');
                  setShowAllowanceModal(true);
                }}
                className="text-[10px] text-primary hover:underline font-black flex items-center gap-0.5"
              >
                <Edit2 size={10} />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Pills: Add Spend + Split Bill + Campus Hub */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => navigate('/add')}
          className="btn-brutal py-2.5 px-2 text-xs flex items-center justify-center gap-1.5 bg-primary text-white"
        >
          <Plus size={15} strokeWidth={3} />
          <span>Log Spend</span>
        </button>

        <button
          onClick={() => setShowSplitter(!showSplitter)}
          className="btn-brutal-secondary py-2.5 px-2 text-xs flex items-center justify-center gap-1 bg-surface text-text"
        >
          <Users size={14} />
          <span>Split Bill</span>
        </button>

        <button
          onClick={() => setShowCampusHub(true)}
          className="btn-brutal py-2.5 px-2 text-xs flex items-center justify-center gap-1 bg-highlight text-text border-2 border-border shadow-sticker"
        >
          <span>🎒 Hub</span>
          <span className="text-[10px] bg-accent text-white px-1.5 py-0.2 rounded-full font-black">4</span>
        </button>
      </div>

      {/* Gang Bill Splitter Quick Tool */}
      {showSplitter && (
        <div className="card-brutal p-4 bg-surface border-2 border-border shadow-sticker space-y-3 animate-fade-in">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="text-xs font-heading font-black text-text flex items-center gap-1.5">
              <Users size={14} className="text-accent" />
              <span>Split Bill with Gang</span>
            </span>
            <button
              onClick={() => setShowSplitter(false)}
              className="text-xs font-bold text-text-muted hover:text-text"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                Total Bill (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 450"
                value={splitBillAmount}
                onChange={(e) => setSplitBillAmount(e.target.value)}
                className="input-brutal text-sm py-1.5 px-2.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                Friends (incl. you)
              </label>
              <input
                type="number"
                min="1"
                placeholder="3"
                value={splitPeople}
                onChange={(e) => setSplitPeople(e.target.value)}
                className="input-brutal text-sm py-1.5 px-2.5"
              />
            </div>
          </div>

          {myShare > 0 && (
            <div className="p-2.5 rounded-xl bg-highlight border border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-text-muted block">Your share to pay:</span>
                <span className="text-base font-heading font-black text-text">₹{myShare}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigate(`/add?amount=${myShare}&note=Gang%20Split%20(${splitPeople}%20people)`);
                }}
                className="btn-brutal text-xs py-1.5 px-3"
              >
                Log My Share
              </button>
            </div>
          )}
        </div>
      )}

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
              className="input-brutal text-sm py-2 px-3 flex-1 bg-surface"
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

      {/* User's Own Quick Add Chips */}
      {frequentChips.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-heading font-extrabold uppercase text-text-muted block tracking-wider">
            Your Frequent Spends (1-Tap Add)
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

      {/* Weekly Check-in Mood Picker */}
      <div className="card-brutal p-3.5 bg-surface space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-heading font-bold text-text flex items-center gap-1.5">
            <Zap size={14} className="text-accent" />
            <span>How did this week feel money-wise?</span>
          </span>
          {latestCheckin?.mood && (
            <span className="text-[10px] font-bold text-income bg-income/10 px-2 py-0.5 rounded-full border border-income/30">
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
              <div className="text-xl mb-0.5">{m.emoji}</div>
              <span className="text-[10px] block font-heading">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Money Pulse Daily Timeline */}
      <MoneyPulseChart
        transactions={recentExpenses}
        safePerDay={safePerDay}
        monthlyIncome={income}
        savingsGoal={user?.savings_goal || 0}
      />

      {/* Recent Spends Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted">
            Recent Activity
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
          /* Friendly Gen-Z Empty State */
          <div className="card-brutal p-8 text-center bg-surface space-y-3">
            <div className="w-16 h-16 rounded-2xl border-2 border-border shadow-sticker bg-highlight mx-auto flex items-center justify-center text-3xl">
              ✨
            </div>
            <h3 className="text-base font-heading font-black text-text">
              Nothing yet!
            </h3>
            <p className="text-xs text-text-muted font-medium max-w-xs mx-auto">
              Add your first spend and let's start tracking your pocket money habits.
            </p>
            <button
              onClick={() => navigate('/add')}
              className="btn-brutal text-sm py-2 px-5 inline-flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Log First Spend</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentExpenses.map((exp) => {
              const IconComp = getIcon(exp.category_icon || 'Circle');
              return (
                <div
                  key={exp.id}
                  onClick={() => navigate('/transactions')}
                  className="card-brutal p-3 flex items-center justify-between cursor-pointer hover:translate-x-1 transition-transform bg-surface"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl border-2 border-border shadow-sticker-hover flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: exp.category_color || '#FF5C8A' }}
                    >
                      <IconComp size={18} />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-heading font-bold text-text truncate">
                        {exp.merchant || exp.category_name || exp.note || 'Spend'}
                      </p>
                      <p className="text-[11px] text-text-muted font-medium flex items-center gap-1.5">
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

                  <span className="text-sm font-heading font-black text-expense shrink-0">
                    -{formatCurrency(exp.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Campus & Student Hub (4-in-1 Tools Modal) */}
      <CampusHubModal
        isOpen={showCampusHub}
        onClose={() => setShowCampusHub(false)}
        onRefresh={loadHomeData}
      />
    </div>
  );
}
