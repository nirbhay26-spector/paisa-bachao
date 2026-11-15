import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { Sparkles, X, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function PurchaseSimulatorModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSimulate(e) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    setLoading(true);
    try {
      const res = await api.post('/advisor/affordability-simulator', {
        amount: parsed,
        name: name.trim() || 'Purchase'
      });
      setResult(res.data);
    } catch (err) {
      alert('Could not simulate purchase');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setAmount('');
    setName('');
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-brutal w-full max-w-md bg-surface border-3 border-border shadow-sticker-lg overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-border flex items-center justify-between bg-bg">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤔</span>
            <div>
              <h3 className="text-sm font-heading font-black text-text">Purchase Impact Simulator</h3>
              <p className="text-[10px] font-bold text-text-muted">“Can I safely afford this right now?”</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center text-text-muted hover:text-text"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {!result ? (
            <form onSubmit={handleSimulate} className="space-y-3">
              <div>
                <label className="block text-xs font-heading font-black uppercase tracking-wider text-text-muted mb-1">
                  Item or Plan Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Shoes, Concert Ticket, Weekend Trip"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-brutal text-xs py-2 w-full font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-black uppercase tracking-wider text-text-muted mb-1">
                  Cost (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1999"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-brutal text-sm py-2 w-full font-black"
                  required
                />
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['299', '799', '1499', '2999', '4999'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className="text-[11px] font-heading font-bold px-2 py-0.5 rounded-lg border border-border bg-bg hover:bg-highlight transition-all"
                  >
                    ₹{parseInt(preset).toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-brutal w-full py-3 text-xs font-heading font-black mt-2"
              >
                {loading ? 'Simulating Buffer...' : 'Simulate Purchase Impact 🚀'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 animate-scale-in">
              {/* Verdict Banner */}
              <div className={`p-4 rounded-2xl border-2 border-border shadow-sticker text-center ${
                result.verdict === 'Comfortable'
                  ? 'bg-primary/10 text-primary'
                  : result.verdict === 'Possible but tight'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-expense/15 text-expense'
              }`}>
                <span className="text-2xl block mb-1">
                  {result.verdict === 'Comfortable' ? '✅ 🥳' : result.verdict === 'Possible but tight' ? '⚠️ 🤔' : '🛑 ✋'}
                </span>
                <span className="text-[10px] uppercase font-heading font-black tracking-wider block">
                  Simulator Verdict
                </span>
                <h4 className="text-lg font-heading font-black">{result.verdict}</h4>
                <p className="text-xs font-bold mt-1 text-text">
                  {result.advice}
                </p>
              </div>

              {/* Impact Comparison Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl border border-border bg-bg space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Safe Daily Spend</span>
                  <div className="flex items-center gap-1 font-heading font-black text-sm">
                    <span className="text-text-muted line-through">₹{result.current_safe_to_spend}</span>
                    <ArrowRight size={12} className="text-text-muted" />
                    <span className={result.new_safe_to_spend < 40 ? 'text-expense' : 'text-primary'}>
                      ₹{result.new_safe_to_spend}/day
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-border bg-bg space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Allowance Left</span>
                  <div className="flex items-center gap-1 font-heading font-black text-sm">
                    <span className="text-text-muted line-through">₹{Math.round(result.money_left_before)}</span>
                    <ArrowRight size={12} className="text-text-muted" />
                    <span className={result.money_left_after <= 0 ? 'text-expense' : 'text-primary'}>
                      ₹{Math.round(result.money_left_after)}
                    </span>
                  </div>
                </div>
              </div>

              {result.upcoming_bills_total > 0 && (
                <div className="p-2.5 rounded-xl border border-border bg-highlight text-text text-xs font-bold space-y-0.5">
                  <div className="flex justify-between items-center text-[11px] font-heading font-black">
                    <span>Upcoming Bills in next 14d:</span>
                    <span>₹{Math.round(result.upcoming_bills_total)}</span>
                  </div>
                  <p className="text-[10px] text-text-muted">
                    {result.upcoming_bills.map(b => b.name).join(', ')}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2.5 rounded-xl border border-border bg-surface text-xs font-bold text-text flex-1 hover:bg-bg"
                >
                  Test Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-brutal py-2.5 px-4 text-xs font-heading font-black flex-1"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

