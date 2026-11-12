import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { PiggyBank, Plus, Target, Sparkles, Trash2, CheckCircle2 } from 'lucide-react';

export default function SavingsPage() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [justCompletedGoal, setJustCompletedGoal] = useState(null);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      setLoading(true);
      const res = await api.get('/savings');
      setGoals(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGoal(e) {
    e.preventDefault();
    if (!name || !targetAmount) return;
    setSubmitting(true);
    try {
      await api.post('/savings', {
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      setShowAddModal(false);
      setName('');
      setTargetAmount('');
      setDeadline('');
      loadGoals();
    } catch {
      alert('Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContribute(e) {
    e.preventDefault();
    const amt = parseFloat(contributeAmount);
    if (!amt || amt <= 0) return;
    try {
      const res = await api.post(`/savings/${selectedGoal.id}/contribute`, { amount: amt });
      if (res.data.just_completed) {
        setJustCompletedGoal(selectedGoal.name);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setTimeout(() => setJustCompletedGoal(null), 4000);
      }
      setSelectedGoal(null);
      setContributeAmount('');
      loadGoals();
    } catch {
      alert('Failed to contribute');
    }
  }

  async function handleDeleteGoal(id) {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await api.delete(`/savings/${id}`);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch {
      alert('Failed to delete');
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Confetti Celebration Banner */}
      {justCompletedGoal && (
        <div className="card-brutal p-4 bg-highlight text-text border-2 border-border shadow-sticker-lg text-center animate-bounce">
          <span className="text-2xl block mb-1">🎉 🥳 🏅</span>
          <h2 className="text-base font-heading font-black">GOAL CRUSHED!</h2>
          <p className="text-xs font-bold">You hit 100% on "{justCompletedGoal}"! Amazing discipline!</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-heading font-extrabold uppercase tracking-wider text-text-muted">
            Wishes & Targets
          </span>
          <h1 className="text-xl font-heading font-black text-text">Savings Goals</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-brutal text-xs py-2 px-3.5 flex items-center gap-1.5"
        >
          <Plus size={15} strokeWidth={3} />
          <span>New Goal</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="card-brutal p-8 text-center bg-surface space-y-2">
          <div className="text-3xl mb-1">🐷</div>
          <h3 className="font-heading font-black text-sm">No savings goals yet</h3>
          <p className="text-xs text-text-muted font-medium max-w-xs mx-auto">
            Got an eye on new headphones, a Goa trip, or a gaming mouse? Add a goal and we'll calculate your weekly target.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-brutal text-xs py-2 px-4 mt-2"
          >
            Create a Goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const isCompleted = g.current_amount >= g.target_amount;
            return (
              <div key={g.id} className="card-brutal p-4 bg-surface border-2 border-border shadow-sticker space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl border-2 border-border bg-highlight flex items-center justify-center text-text font-bold shadow-sticker-hover">
                      🎯
                    </div>
                    <div>
                      <h2 className="font-heading font-black text-sm text-text flex items-center gap-1.5">
                        <span>{g.name}</span>
                        {isCompleted && (
                          <span className="text-[10px] font-extrabold bg-income text-white px-2 py-0.2 rounded-full border border-border">
                            COMPLETED
                          </span>
                        )}
                      </h2>
                      {g.deadline && (
                        <span className="text-[11px] text-text-muted font-medium">
                          Target: {formatDate(g.deadline)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteGoal(g.id)}
                    className="text-text-muted hover:text-expense p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-bg rounded-full border-2 border-border overflow-hidden p-0.5">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, g.percentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-text-muted">
                    <span>{formatCurrency(g.current_amount)} saved</span>
                    <span>{g.percentage}% of {formatCurrency(g.target_amount)}</span>
                  </div>
                </div>

                {/* Suggested weekly savings */}
                {g.weekly_suggestion > 0 && !isCompleted && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text bg-bg border-2 border-border p-2 rounded-xl">
                    <Sparkles size={14} className="text-primary" />
                    <span>Save ₹{g.weekly_suggestion.toLocaleString('en-IN')}/week to hit your target date</span>
                  </div>
                )}

                {!isCompleted && (
                  <button
                    type="button"
                    onClick={() => setSelectedGoal(g)}
                    className="btn-brutal-secondary w-full py-2 text-xs font-heading font-bold"
                  >
                    + Add Money Towards Goal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddModal(false)} />
          <div className="sheet-brutal p-5 z-50 animate-slideUp">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />
            <h2 className="text-base font-heading font-black mb-4">Set a Savings Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase text-text-muted mb-1">
                  What are you saving for?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Headphones, Goa Trip"
                  className="input-brutal text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase text-text-muted mb-1">
                  Target Amount (₹)
                </label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="e.g. 3000"
                  className="input-brutal text-xl font-heading font-black"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase text-text-muted mb-1">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-brutal text-sm"
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-brutal w-full py-3.5 text-base">
                {submitting ? 'Creating...' : 'Save Goal'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Contribute Modal */}
      {selectedGoal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedGoal(null)} />
          <div className="sheet-brutal p-5 z-50 animate-slideUp">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />
            <h2 className="text-base font-heading font-black mb-2">
              Add Money to {selectedGoal.name}
            </h2>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase text-text-muted mb-1">
                  Amount to put into savings (₹)
                </label>
                <input
                  type="number"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="e.g. 200"
                  className="input-brutal text-2xl font-heading font-black text-primary"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="btn-brutal w-full py-3.5 text-base">
                Confirm Contribution
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
