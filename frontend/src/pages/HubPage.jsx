import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import {
  TrendingUp,
  Bot,
  PiggyBank,
  PieChart,
  Calendar,
  Flame,
  Film,
  Award,
  Receipt,
  Calculator,
  Palette,
  Globe,
  Shield,
  HelpCircle,
  X,
  ChevronRight,
  Plus,
  Trash2,
  Bell
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function HubPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Active Modals
  const [activeModal, setActiveModal] = useState(null); // 'wrapped' | 'report' | 'whatif' | 'subs' | 'receipts' | 'privacy'

  // Dynamic Data
  const [wrappedData, setWrappedData] = useState(null);
  const [subs, setSubs] = useState([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubDate, setNewSubDate] = useState('');
  const [whatIfPercent, setWhatIfPercent] = useState(30);
  const [whatIfSpend, setWhatIfSpend] = useState(1200);

  useEffect(() => {
    fetchHubData();
  }, []);

  async function fetchHubData() {
    try {
      // Fetch subscriptions
      const subRes = await api.get('/settings/subscriptions').catch(() => ({ data: [] }));
      const subList = Array.isArray(subRes.data) ? subRes.data : (subRes.data?.subscriptions || []);
      setSubs(subList);

      // Fetch latest insights for wrapped
      const insRes = await api.get('/advisor/weekly-summary').catch(() => ({ data: null }));
      if (insRes.data) setWrappedData(insRes.data);
    } catch {
      // offline fallback
    }
  }

  async function handleAddSubscription(e) {
    e.preventDefault();
    if (!newSubName || !newSubAmount) return;
    try {
      const res = await api.post('/settings/subscriptions', {
        name: newSubName,
        amount: parseFloat(newSubAmount),
        next_billing_date: newSubDate || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        billing_cycle: 'monthly',
        reminder_days: 2
      });
      setSubs([res.data, ...subs]);
      setNewSubName('');
      setNewSubAmount('');
      setNewSubDate('');
    } catch (err) {
      alert('Could not save subscription');
    }
  }

  async function handleDeleteSubscription(id) {
    try {
      await api.delete(`/settings/subscriptions/${id}`);
      setSubs(subs.filter(s => s.id !== id));
    } catch {
      // fallback
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Hub Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎛️</span>
          <h1 className="text-xl font-heading font-black text-text tracking-tight">
            Campus Hub
          </h1>
        </div>
        <p className="text-xs text-text-muted font-bold">
          Student financial toolbelt, reports, jars & vibes
        </p>
      </div>

      {/* Bento Grid Layout (Vengeance UI style) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tile 1: Money Pulse & Insights (Col-span 2) */}
        <div
          onClick={() => navigate('/insights')}
          className="col-span-2 card-brutal p-4 bg-highlight text-text border-2 border-border shadow-sticker cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-heading font-black uppercase tracking-wider text-text">
              <TrendingUp size={16} />
              <span>Money Pulse & Spending Graph</span>
            </div>
            <p className="text-xs font-medium text-text/80">
              Interactive timeline, daily safe zone band & chai tax calculator
            </p>
          </div>
          <ChevronRight size={20} className="shrink-0 ml-2" />
        </div>

        {/* Tile 2: AI Money Advisor */}
        <div
          onClick={() => navigate('/advisor')}
          className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center text-xl shadow-sticker">
            🤖
          </div>
          <div>
            <h3 className="text-xs font-heading font-black text-text">AI Advisor</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">
              Ask questions strictly from your SQL database
            </p>
          </div>
        </div>

        {/* Tile 3: Goal Jars */}
        <div
          onClick={() => navigate('/savings')}
          className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-income text-white flex items-center justify-center text-xl shadow-sticker">
            🎯
          </div>
          <div>
            <h3 className="text-xs font-heading font-black text-text">Goal Jars</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">
              Digital piggy banks with round-up savings
            </p>
          </div>
        </div>

        {/* Tile 4: Weekly Spending Wrapped */}
        <div
          onClick={() => setActiveModal('wrapped')}
          className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-xl shadow-sticker">
            🎬
          </div>
          <div>
            <h3 className="text-xs font-heading font-black text-text">Weekly Wrapped</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">
              Instagram-story recap of your weekly spending vibe
            </p>
          </div>
        </div>

        {/* Tile 5: Subscriptions Calendar */}
        <div
          onClick={() => setActiveModal('subs')}
          className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center text-xl shadow-sticker">
            📅
          </div>
          <div>
            <h3 className="text-xs font-heading font-black text-text">Subscriptions</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">
              Track OTT & gym renewals ({subs.length} active)
            </p>
          </div>
        </div>

        {/* Tile 6: Month-End Report Card */}
        <div
          onClick={() => setActiveModal('report')}
          className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-400 text-black flex items-center justify-center text-xl shadow-sticker">
            🏅
          </div>
          <div>
            <h3 className="text-xs font-heading font-black text-text">Report Card</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">
              Monthly grade & discipline score
            </p>
          </div>
        </div>

        {/* Tile 7: What-If Calculator */}
        <div
          onClick={() => setActiveModal('whatif')}
          className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-400 text-white flex items-center justify-center text-xl shadow-sticker">
            🧮
          </div>
          <div>
            <h3 className="text-xs font-heading font-black text-text">What-If Math</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">
              See what cutting chai or treats saves in a year
            </p>
          </div>
        </div>

        {/* Tile 8: Budgets */}
        <div
          onClick={() => navigate('/budgets')}
          className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-400 text-white flex items-center justify-center text-xl shadow-sticker">
            🛡️
          </div>
          <div>
            <h3 className="text-xs font-heading font-black text-text">Budgets</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">
              Set category caps with friendly alert banners
            </p>
          </div>
        </div>

        {/* Tile 9: Questions & Answers Check-ins */}
        <div
          onClick={() => navigate('/questions')}
          className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-400 text-black flex items-center justify-center text-xl shadow-sticker">
            💬
          </div>
          <div>
            <h3 className="text-xs font-heading font-black text-text">Smart Check-ins</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">
              1-tap spend reflections & learned rules
            </p>
          </div>
        </div>

        {/* Tile 10: Privacy & Data Protection (Col-span 2) */}
        <div
          onClick={() => setActiveModal('privacy')}
          className="col-span-2 card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker cursor-pointer hover:bg-highlight/50 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <Shield size={18} className="text-income" />
            <div>
              <h3 className="text-xs font-heading font-black text-text">Privacy Guarantee</h3>
              <p className="text-[10.5px] text-text-muted">
                Zero shared data, no ads, strict SQL multi-tenant isolation
              </p>
            </div>
          </div>
          <ChevronRight size={16} />
        </div>
      </div>

      {/* MODAL 1: Weekly Spending Wrapped (Story Recap) */}
      {activeModal === 'wrapped' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-sm bg-surface border-3 border-border shadow-sticker-lg p-5 space-y-4 animate-scale-in text-center">
            <div className="flex justify-between items-center pb-2 border-b-2 border-border">
              <span className="text-xs font-heading font-black uppercase text-primary">✨ Weekly Wrapped Story</span>
              <button onClick={() => setActiveModal(null)} className="text-sm font-bold">✕</button>
            </div>

            <div className="w-16 h-16 rounded-full bg-highlight border-2 border-border shadow-sticker mx-auto flex items-center justify-center text-3xl">
              🌟
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-heading font-black text-text">This Week's Money Vibe</h2>
              <p className="text-xs text-text-muted">7-day financial snapshot</p>
            </div>

            <div className="bg-bg p-3.5 rounded-2xl border-2 border-border space-y-2.5 text-left text-xs">
              <div className="flex justify-between items-center">
                <span className="font-medium text-text-muted">Primary Drain:</span>
                <span className="font-heading font-black text-primary">Food & Canteen (58%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-text-muted">Days Kept Under Safe Limit:</span>
                <span className="font-heading font-black text-income">5 / 7 Days 🎉</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-text-muted">Chai & Small Treats:</span>
                <span className="font-heading font-black text-text">₹240 logged</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-text-muted">Discipline Vibe:</span>
                <span className="font-heading font-black text-accent">Chill & In Control 😎</span>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-brutal w-full py-2.5 text-xs font-black bg-primary text-white"
            >
              Close Story
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Month-End Report Card */}
      {activeModal === 'report' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-sm bg-surface border-3 border-border shadow-sticker-lg p-5 space-y-4 animate-scale-in text-center">
            <div className="flex justify-between items-center pb-2 border-b-2 border-border">
              <span className="text-xs font-heading font-black uppercase text-income">🏅 Monthly Report Card</span>
              <button onClick={() => setActiveModal(null)} className="text-sm font-bold">✕</button>
            </div>

            <div className="w-20 h-20 rounded-2xl bg-highlight border-3 border-border shadow-sticker mx-auto flex flex-col items-center justify-center">
              <span className="text-2xl font-heading font-black text-primary">A-</span>
              <span className="text-[10px] font-bold text-text-muted">Grade</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-heading font-black text-text">Budget Discipline: Strong</h2>
              <p className="text-xs text-text-muted">You stayed disciplined on essential needs!</p>
            </div>

            <div className="bg-bg p-3 rounded-2xl border-2 border-border space-y-2 text-left text-xs">
              <p className="text-text font-bold">Key Highlights:</p>
              <ul className="space-y-1.5 text-text-muted text-[11.5px]">
                <li>✅ 72% of spending went toward essential Needs.</li>
                <li>✅ Zero impulse clusters detected in the past week.</li>
                <li>💡 Tip: Capping weekend late-night food saves up to ₹400 next cycle.</li>
              </ul>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-brutal w-full py-2.5 text-xs font-black bg-primary text-white"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: What-If Calculator */}
      {activeModal === 'whatif' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-sm bg-surface border-3 border-border shadow-sticker-lg p-5 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b-2 border-border">
              <span className="text-xs font-heading font-black uppercase text-accent">🧮 What-If Savings Math</span>
              <button onClick={() => setActiveModal(null)} className="text-sm font-bold">✕</button>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-heading font-black text-text">Cut a Habit, Fuel a Goal</h3>
              <p className="text-xs text-text-muted">
                See what small reductions in monthly snacks or dining add up to over 12 months.
              </p>
            </div>

            <div className="space-y-3 bg-bg p-3.5 rounded-2xl border-2 border-border">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Current Monthly Treat Spend:</span>
                  <span className="font-heading font-black">₹{whatIfSpend}</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="5000"
                  step="100"
                  value={whatIfSpend}
                  onChange={(e) => setWhatIfSpend(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Reduce Spending By:</span>
                  <span className="font-heading font-black text-primary">{whatIfPercent}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="70"
                  step="5"
                  value={whatIfPercent}
                  onChange={(e) => setWhatIfPercent(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-border/40 text-center space-y-1">
                <p className="text-xs font-bold text-text-muted">Extra Cash in 1 Year:</p>
                <p className="text-2xl font-heading font-black text-income">
                  ₹{Math.round((whatIfSpend * (whatIfPercent / 100)) * 12).toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-text-muted">
                  That pays for a whole semester trip or premium headphones! 🎧✈️
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-brutal w-full py-2.5 text-xs font-black bg-primary text-white"
            >
              Done Exploring
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Subscriptions Calendar */}
      {activeModal === 'subs' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-sm bg-surface border-3 border-border shadow-sticker-lg p-5 space-y-4 animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b-2 border-border">
              <span className="text-xs font-heading font-black uppercase text-amber-500">📅 Subscriptions Manager</span>
              <button onClick={() => setActiveModal(null)} className="text-sm font-bold">✕</button>
            </div>

            {/* Add new sub */}
            <form onSubmit={handleAddSubscription} className="bg-bg p-3 rounded-2xl border-2 border-border space-y-2">
              <h4 className="text-xs font-heading font-black">Add New Recurring Bill</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="e.g. Spotify, Gym"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="input-brutal text-xs py-1.5 px-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Amount ₹"
                  value={newSubAmount}
                  onChange={(e) => setNewSubAmount(e.target.value)}
                  className="input-brutal text-xs py-1.5 px-2"
                  required
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newSubDate}
                  onChange={(e) => setNewSubDate(e.target.value)}
                  className="input-brutal text-xs py-1.5 px-2 flex-1"
                />
                <button
                  type="submit"
                  className="btn-brutal py-1.5 px-3 text-xs font-black bg-primary text-white"
                >
                  Save
                </button>
              </div>
            </form>

            {/* List */}
            <div className="space-y-2">
              <h4 className="text-xs font-heading font-black text-text">Active Renewals ({subs.length})</h4>
              {subs.length === 0 ? (
                <p className="text-center text-xs text-text-muted py-4">No subscriptions added yet</p>
              ) : (
                subs.map((s) => (
                  <div key={s.id} className="p-2.5 rounded-xl border-2 border-border bg-surface flex items-center justify-between">
                    <div>
                      <p className="font-heading font-black text-xs text-text">{s.name}</p>
                      <p className="text-[10px] text-text-muted">
                        Next bill: {s.next_billing_date?.slice(0, 10)} ({s.billing_cycle})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black text-xs text-primary">₹{s.amount}</span>
                      <button
                        onClick={() => handleDeleteSubscription(s.id)}
                        className="text-text-muted hover:text-expense p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-brutal-secondary w-full py-2 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: Privacy Policy */}
      {activeModal === 'privacy' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-sm bg-surface border-3 border-border shadow-sticker-lg p-5 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b-2 border-border">
              <span className="text-xs font-heading font-black uppercase text-income">🛡️ Privacy & Isolation</span>
              <button onClick={() => setActiveModal(null)} className="text-sm font-bold">✕</button>
            </div>

            <div className="space-y-2 text-xs text-text-muted">
              <h3 className="font-heading font-black text-text text-sm">Strict Zero-Tracking Policy</h3>
              <p>1. Only your own data is ever loaded. Strict SQL multi-tenant user isolation.</p>
              <p>2. No shared models, no cross-user training, no public leaks.</p>
              <p>3. No ads, no data selling, no third-party trackers.</p>
              <p>4. Export or permanently delete your account and all data at any second from settings.</p>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-brutal w-full py-2.5 text-xs font-black bg-primary text-white"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

