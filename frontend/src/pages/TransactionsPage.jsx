import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { getIcon } from '../utils/icons';
import {
  Search,
  Filter,
  Trash2,
  X,
  Download,
  Receipt,
  RotateCcw,
} from 'lucide-react';

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Undo snackbar state
  const [undoItem, setUndoItem] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  useEffect(() => {
    loadCategories();
    loadExpenses();
  }, [selectedCategory, selectedTag]);

  async function loadCategories() {
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch {}
  }

  async function loadExpenses() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedTag) params.append('tag', selectedTag);
      if (search) params.append('search', search);

      const res = await api.get(`/expenses?${params.toString()}`);
      setExpenses(res.data.expenses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteExpense(exp) {
    try {
      await api.delete(`/expenses/${exp.id}`);
      setSelectedExpense(null);
      setExpenses((prev) => prev.filter((e) => e.id !== exp.id));

      // Show Undo Snackbar for 5 seconds
      setUndoItem(exp);
      if (undoTimer) clearTimeout(undoTimer);
      const timer = setTimeout(() => setUndoItem(null), 5000);
      setUndoTimer(timer);
    } catch {
      alert('Failed to delete expense');
    }
  }

  async function handleUndo() {
    if (!undoItem) return;
    try {
      await api.post(`/expenses/${undoItem.id}/restore`);
      setExpenses((prev) => [undoItem, ...prev]);
      setUndoItem(null);
      if (undoTimer) clearTimeout(undoTimer);
    } catch {
      alert('Failed to restore');
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-heading font-extrabold uppercase tracking-wider text-text-muted">
            History
          </span>
          <h1 className="text-xl font-heading font-black text-text">Activity Log</h1>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-1.5 rounded-xl border-2 border-border text-xs font-heading font-bold flex items-center gap-1 shadow-sticker-hover ${
            showFilters || selectedCategory || selectedTag
              ? 'bg-primary text-white'
              : 'bg-surface text-text'
          }`}
        >
          <Filter size={14} />
          <span>Filters</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadExpenses()}
          placeholder="Search by merchant or note..."
          className="input-brutal pl-10 text-xs py-2.5"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              loadExpenses();
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Box */}
      {showFilters && (
        <div className="card-brutal p-3 space-y-3 bg-surface">
          <div>
            <span className="text-[10px] font-heading font-extrabold uppercase text-text-muted block mb-1">
              Category
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                  !selectedCategory ? 'bg-primary text-white border-border' : 'bg-bg text-text border-border/60'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedCategory(selectedCategory === c.id ? '' : c.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                    selectedCategory === c.id ? 'bg-primary text-white border-border' : 'bg-bg text-text border-border/60'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-heading font-extrabold uppercase text-text-muted block mb-1">
              50/30/20 Tag
            </span>
            <div className="flex gap-1.5">
              {['need', 'want', 'savings'].map((tg) => (
                <button
                  type="button"
                  key={tg}
                  onClick={() => setSelectedTag(selectedTag === tg ? '' : tg)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase border ${
                    selectedTag === tg ? 'bg-primary text-white border-border' : 'bg-bg text-text border-border/60'
                  }`}
                >
                  {tg}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="card-brutal p-8 text-center bg-surface space-y-2">
          <div className="text-3xl mb-1">🏷️</div>
          <h3 className="font-heading font-black text-sm">No expenses found</h3>
          <p className="text-xs text-text-muted font-medium">
            Try resetting your filters or add your first spend.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => {
            const IconComp = getIcon(exp.category_icon || 'Circle');
            return (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className="card-brutal p-3 flex items-center justify-between cursor-pointer hover:translate-x-1 transition-transform bg-surface"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl border-2 border-border shadow-sticker-hover flex items-center justify-center text-white shrink-0 sticker-icon"
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

                <div className="text-right shrink-0">
                  <span className="font-heading font-black text-sm text-expense block">
                    -{formatCurrency(exp.amount)}
                  </span>
                  {exp.is_sample ? (
                    <span className="text-[9px] font-extrabold text-text bg-highlight px-1.5 py-0.2 rounded border border-border">
                      SAMPLE
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expense Detail Bottom Sheet */}
      {selectedExpense && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedExpense(null)} />
          <div className="sheet-brutal p-5 z-50 animate-slideUp">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />
            <div className="space-y-4">
              <div className="card-brutal text-center py-4 bg-highlight border-2 border-border shadow-sticker">
                <span className="text-[10px] font-heading font-extrabold uppercase text-text block mb-1">
                  Amount
                </span>
                <span className="text-3xl font-heading font-black text-expense">
                  -{formatCurrency(selectedExpense.amount)}
                </span>
              </div>

              <div className="space-y-2 text-xs font-semibold">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-text-muted">Category</span>
                  <span className="font-bold">{selectedExpense.category_name || 'None'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-text-muted">Merchant</span>
                  <span className="font-bold">{selectedExpense.merchant || 'None'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-text-muted">Method</span>
                  <span className="font-bold uppercase">{selectedExpense.payment_method}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-text-muted">Date</span>
                  <span className="font-bold">{new Date(selectedExpense.date).toLocaleString('en-IN')}</span>
                </div>
                {selectedExpense.tag && (
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-text-muted">50/30/20 Tag</span>
                    <span className="font-extrabold uppercase text-primary">{selectedExpense.tag}</span>
                  </div>
                )}
                {selectedExpense.note && (
                  <div className="py-1.5 border-b border-border/50">
                    <span className="text-text-muted block mb-0.5">Note</span>
                    <span className="font-medium">{selectedExpense.note}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDeleteExpense(selectedExpense)}
                className="btn-brutal-secondary w-full py-3 text-xs font-heading font-bold text-expense border-expense hover:bg-expense/10"
              >
                <Trash2 size={16} />
                <span>Delete Spend</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Undo Snackbar */}
      {undoItem && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 card-brutal p-3 bg-surface border-2 border-border shadow-sticker-lg flex items-center justify-between animate-bounce">
          <span className="text-xs font-bold text-text truncate">
            Deleted ₹{undoItem.amount} ({undoItem.merchant || 'Spend'})
          </span>
          <button
            onClick={handleUndo}
            className="btn-brutal py-1.5 px-3 text-xs flex items-center gap-1 shrink-0 ml-2"
          >
            <RotateCcw size={14} />
            <span>Undo</span>
          </button>
        </div>
      )}
    </div>
  );
}
