import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatCurrency } from '../utils/format';
import { Target, Plus, AlertTriangle, Trash2 } from 'lucide-react';

export default function BudgetsPage() {
  const { t } = useTranslation();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBudgets();
    loadCategories();
  }, []);

  async function loadBudgets() {
    try {
      setLoading(true);
      const res = await api.get('/budgets');
      setBudgets(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch {}
  }

  async function handleCreateBudget(e) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setSubmitting(true);
    try {
      await api.post('/budgets', {
        amount: parseFloat(amount),
        category_id: categoryId || null,
        period,
      });
      setShowAddModal(false);
      setAmount('');
      setCategoryId('');
      loadBudgets();
    } catch {
      alert('Failed to create budget');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteBudget(id) {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert('Failed to delete');
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-heading font-extrabold uppercase tracking-wider text-text-muted">
            Limits & Ceilings
          </span>
          <h1 className="text-xl font-heading font-black text-text">Budgets</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-brutal text-xs py-2 px-3.5 flex items-center gap-1.5"
        >
          <Plus size={15} strokeWidth={3} />
          <span>New Budget</span>
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="card-brutal p-8 text-center bg-surface space-y-2">
          <div className="text-3xl mb-1">🎯</div>
          <h3 className="font-heading font-black text-sm">No budgets set</h3>
          <p className="text-xs text-text-muted font-medium max-w-xs mx-auto">
            Set an overall monthly cap or category limits to get auto-alerts at 50%, 80%, and 100%.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-brutal text-xs py-2 px-4 mt-2"
          >
            Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const pct = b.percentage || 0;
            const isExceeded = pct >= 100;
            const isWarning = pct >= 80 && pct < 100;

            return (
              <div key={b.id} className="card-brutal p-4 bg-surface border-2 border-border shadow-sticker space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading font-black text-sm text-text">
                      {b.category_name || 'Overall Budget'}
                    </h2>
                    <span className="text-[11px] uppercase font-bold text-text-muted">
                      {b.period}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-heading font-black px-2.5 py-0.5 rounded-full border-2 border-border ${
                        isExceeded
                          ? 'bg-expense text-white'
                          : isWarning
                          ? 'bg-accent text-white'
                          : 'bg-highlight text-text'
                      }`}
                    >
                      {pct}%
                    </span>
                    <button
                      onClick={() => handleDeleteBudget(b.id)}
                      className="text-text-muted hover:text-expense p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="h-3 w-full bg-bg rounded-full border-2 border-border overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExceeded ? 'bg-expense' : isWarning ? 'bg-accent' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs font-bold text-text-muted">
                  <span>Spent: {formatCurrency(b.spent)}</span>
                  <span>Limit: {formatCurrency(b.amount)}</span>
                </div>

                {isExceeded && (
                  <div className="flex items-center gap-1.5 text-xs text-white font-heading font-bold bg-expense p-2 rounded-xl border border-border">
                    <AlertTriangle size={14} />
                    <span>Budget exceeded! Over by {formatCurrency(b.spent - b.amount)}</span>
                  </div>
                )}
                {isWarning && (
                  <div className="flex items-center gap-1.5 text-xs text-text font-heading font-bold bg-accent/20 p-2 rounded-xl border border-border">
                    <AlertTriangle size={14} />
                    <span>80% mark crossed! Watch your upcoming spends.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddModal(false)} />
          <div className="sheet-brutal p-5 z-50 animate-slideUp">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />
            <h2 className="text-base font-heading font-black mb-4">Create Budget</h2>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase text-text-muted mb-1">
                  Category (Optional - leave empty for Overall)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input-brutal text-sm"
                >
                  <option value="">Overall Monthly Budget</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase text-text-muted mb-1">
                  Budget Amount (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 3000"
                  className="input-brutal text-xl font-heading font-black"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase text-text-muted mb-1.5">
                  Period
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['monthly', 'weekly'].map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`py-2 rounded-xl border-2 text-xs font-heading font-bold capitalize ${
                        period === p ? 'bg-primary text-white border-border shadow-sticker' : 'bg-surface text-text border-border'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submitting} className="btn-brutal w-full py-3.5 text-base">
                {submitting ? 'Creating...' : 'Save Budget'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
