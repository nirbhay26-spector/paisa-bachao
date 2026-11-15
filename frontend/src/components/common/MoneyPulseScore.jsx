import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Activity, ShieldCheck, AlertTriangle, ChevronRight, X, Sparkles, TrendingUp, Info } from 'lucide-react';

export default function MoneyPulseScore({ onScoreLoaded }) {
  const { t } = useTranslation();
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPulse();
  }, []);

  async function loadPulse() {
    try {
      setLoading(true);
      const res = await api.get('/advisor/pulse');
      setPulse(res.data);
      if (onScoreLoaded) onScoreLoaded(res.data);
    } catch (err) {
      console.error('Failed to load pulse score:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !pulse) return null;

  const score = pulse.score;
  const isGreat = score >= 85;
  const isGood = score >= 70;
  const isWarning = score < 50;

  const scoreColor = isGreat ? 'text-primary' : isGood ? 'text-primary' : isWarning ? 'text-expense' : 'text-accent';
  const badgeBg = isGreat ? 'bg-primary/10 text-primary border-primary/30' : isGood ? 'bg-primary/10 text-primary border-primary/30' : isWarning ? 'bg-expense/10 text-expense border-expense/30' : 'bg-accent/10 text-accent border-accent/30';

  return (
    <>
      {/* Tappable Hero Mini-Widget */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="card-brutal w-full p-3.5 bg-surface border-2 border-border shadow-sticker hover:shadow-sticker-lg transition-all flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl border-2 border-border bg-highlight flex items-center justify-center font-heading font-black text-lg text-text shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            {score}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-heading font-black uppercase tracking-wider text-text-muted">
                Money Pulse Score
              </span>
              <span className={`text-[10px] font-heading font-black px-1.5 py-0.2 rounded-md border ${badgeBg}`}>
                {pulse.status}
              </span>
            </div>
            <p className="text-xs font-bold text-text truncate max-w-[240px] sm:max-w-xs mt-0.5">
              {pulse.oneLiner}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-text-muted group-hover:text-primary transition-colors shrink-0">
          <span className="text-[11px] font-heading font-extrabold hidden sm:inline">Breakdown</span>
          <ChevronRight size={16} />
        </div>
      </button>

      {/* Itemized Point Breakdown Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card-brutal w-full max-w-md bg-surface border-3 border-border shadow-sticker-lg overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b-2 border-border flex items-center justify-between bg-bg">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩺</span>
                <div>
                  <h3 className="text-sm font-heading font-black text-text">Money Pulse Breakdown</h3>
                  <p className="text-[10px] font-bold text-text-muted">Deterministic 100-Point Financial Health</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center text-text-muted hover:text-text"
              >
                <X size={15} />
              </button>
            </div>

            {/* Score Ring Display */}
            <div className="p-5 text-center bg-surface border-b-2 border-border space-y-1">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-3 border-border bg-highlight shadow-sticker mb-1">
                <span className="text-3xl font-heading font-black text-text">{score}</span>
              </div>
              <h4 className="text-base font-heading font-black text-text">{pulse.status}</h4>
              <p className="text-xs font-medium text-text-muted max-w-xs mx-auto">
                {pulse.oneLiner}
              </p>
            </div>

            {/* Point Categories */}
            <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto">
              {pulse.breakdown.map((item, idx) => {
                const pct = Math.round((item.score / item.max) * 100);
                return (
                  <div key={idx} className="p-2.5 rounded-xl border border-border bg-bg space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-heading font-bold">
                      <span className="text-text">{item.category}</span>
                      <span className="text-primary font-black">
                        {item.score} / {item.max} pts
                      </span>
                    </div>

                    <div className="h-2 w-full bg-surface rounded-full border border-border overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <p className="text-[10px] font-medium text-text-muted">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t-2 border-border bg-bg text-center">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-brutal w-full py-2.5 text-xs font-heading font-black"
              >
                Got It! Keep Pacing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

