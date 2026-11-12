import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { HelpCircle, Check, MessageSquare, ArrowRight, Sparkles, CheckCircle2, Database, Smile } from 'lucide-react';

export default function QuestionsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('pending'); // 'pending' | 'answered'
  const [questions, setQuestions] = useState([]);
  const [answeredList, setAnsweredList] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, answered: 0 });
  const [loading, setLoading] = useState(true);
  const [customReply, setCustomReply] = useState({});
  const [lastReaction, setLastReaction] = useState(null);

  useEffect(() => {
    loadQuestions(tab);
  }, [tab]);

  async function loadQuestions(targetTab = tab) {
    try {
      setLoading(true);
      const res = await api.get(`/questions?status=${targetTab}`);
      const data = res.data;
      if (data && data.items) {
        if (targetTab === 'pending') {
          setQuestions(data.items);
        } else {
          setAnsweredList(data.items);
        }
        if (data.counts) setCounts(data.counts);
      } else if (Array.isArray(data)) {
        if (targetTab === 'pending') setQuestions(data);
        else setAnsweredList(data);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(qId, answerText, tag = null) {
    if (navigator.vibrate) navigator.vibrate(25);
    try {
      const res = await api.post(`/questions/${qId}/answer`, { answer: answerText, tag });
      
      // Show instant celebratory reaction
      setLastReaction({
        qId,
        reaction: res.data?.reaction || 'Answer saved permanently! 💾',
        habit: res.data?.habit_learned || ''
      });

      // Update local state
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      setCounts((prev) => ({
        pending: Math.max(0, prev.pending - 1),
        answered: prev.answered + 1
      }));

      // Auto dismiss reaction after 6s
      setTimeout(() => {
        setLastReaction((curr) => (curr?.qId === qId ? null : curr));
      }, 6000);
    } catch (err) {
      console.error('Answer error:', err);
      alert('Failed to save answer. Please check your network or try again.');
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-heading font-black text-text">Reflect & Learn</h1>
            <span className="text-[10px] font-heading font-extrabold bg-highlight text-text border border-border px-2 py-0.5 rounded-full flex items-center gap-1">
              <Database size={11} /> Saved in DB
            </span>
          </div>
          <p className="text-xs text-text-muted font-medium mt-0.5">
            Answer 1 quick question per spend so Paisa Bachao learns your habits.
          </p>
        </div>
      </div>

      {/* Tabs: Pending vs Answered History */}
      <div className="flex gap-2 p-1 bg-surface card-brutal border-2 border-border">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`flex-1 py-2 text-xs font-heading font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            tab === 'pending'
              ? 'bg-primary text-white border-2 border-border shadow-sticker'
              : 'text-text hover:bg-bg'
          }`}
        >
          <HelpCircle size={14} />
          <span>Pending</span>
          {counts.pending > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-primary font-black">
              {counts.pending}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab('answered')}
          className={`flex-1 py-2 text-xs font-heading font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            tab === 'answered'
              ? 'bg-accent text-white border-2 border-border shadow-sticker'
              : 'text-text hover:bg-bg'
          }`}
        >
          <CheckCircle2 size={14} />
          <span>Saved History</span>
          {counts.answered > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-accent font-black">
              {counts.answered}
            </span>
          )}
        </button>
      </div>

      {/* Instant Feedback / Reaction Banner */}
      {lastReaction && (
        <div className="card-brutal p-3.5 bg-highlight text-text border-2 border-border shadow-sticker animate-bounce-once space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <p className="text-xs font-heading font-black">{lastReaction.reaction}</p>
            </div>
            <button
              onClick={() => setLastReaction(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
          {lastReaction.habit && (
            <p className="text-[11px] font-medium text-text-muted pl-6">
              💡 {lastReaction.habit}
            </p>
          )}
        </div>
      )}

      {/* Tab 1: Pending Questions */}
      {tab === 'pending' && (
        <>
          {loading ? (
            <div className="card-brutal p-8 text-center bg-surface animate-pulse">
              <p className="text-xs font-heading font-bold text-text-muted">Loading questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="card-brutal p-8 text-center bg-surface space-y-3">
              <div className="w-16 h-16 rounded-2xl border-2 border-border shadow-sticker bg-highlight mx-auto flex items-center justify-center text-3xl">
                🎉
              </div>
              <h3 className="text-base font-heading font-black text-text">All caught up!</h3>
              <p className="text-xs text-text-muted font-medium max-w-xs mx-auto">
                No pending questions right now. Every time you log an expense, we'll ask 1 quick reflection question!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="card-brutal p-4.5 bg-surface border-2 border-border shadow-sticker space-y-3"
                >
                  {/* Context header */}
                  <div className="flex items-center justify-between text-xs font-bold text-text-muted pb-2 border-b border-border/50">
                    <div className="flex items-center gap-1.5 text-text">
                      <span className="font-heading font-black text-primary">
                        {formatCurrency(q.amount)}
                      </span>
                      {q.merchant && <span>• {q.merchant}</span>}
                    </div>
                    <span>{formatDate(q.expense_date)}</span>
                  </div>

                  {/* Chat bubble */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl border-2 border-border bg-accent text-white flex items-center justify-center shrink-0 text-sm font-bold shadow-sticker-hover">
                      💬
                    </div>
                    <div className="card-brutal p-3 bg-bg border-2 border-border text-xs font-heading font-bold text-text leading-snug flex-1">
                      {q.question_text}
                    </div>
                  </div>

                  {/* Tappable response chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-heading font-black uppercase text-text-muted tracking-wider block">
                      Tap Quick Answer:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {/* Need or Want */}
                      {(!q.question_type || q.question_type === 'need_want') && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id, 'Essential Need', 'need')}
                            className="btn-brutal-secondary py-1.5 px-3 text-xs bg-surface hover:bg-highlight"
                          >
                            🥦 Essential Need
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id, 'Treat / Want', 'want')}
                            className="btn-brutal-secondary py-1.5 px-3 text-xs bg-surface hover:bg-highlight"
                          >
                            🍩 Treat / Want
                          </button>
                        </>
                      )}

                      {/* Social vs Solo */}
                      {q.question_type === 'social' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id, 'With friends / gang', 'want')}
                            className="btn-brutal-secondary py-1.5 px-3 text-xs bg-surface hover:bg-highlight"
                          >
                            👥 With Friends
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id, 'Solo / Me-time', 'need')}
                            className="btn-brutal-secondary py-1.5 px-3 text-xs bg-surface hover:bg-highlight"
                          >
                            ☕ Solo / Me Time
                          </button>
                        </>
                      )}

                      {/* Impulse vs Planned */}
                      {q.question_type === 'impulse' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id, 'Planned purchase', 'need')}
                            className="btn-brutal-secondary py-1.5 px-3 text-xs bg-surface hover:bg-highlight"
                          >
                            🎯 Planned
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id, 'Impulse buy', 'want')}
                            className="btn-brutal-secondary py-1.5 px-3 text-xs bg-surface hover:bg-highlight"
                          >
                            ⚡ Impulse Buy
                          </button>
                        </>
                      )}

                      {/* Worth it */}
                      {q.question_type === 'worth_it' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id, 'Totally worth it!', 'need')}
                            className="btn-brutal-secondary py-1.5 px-3 text-xs bg-surface hover:bg-highlight"
                          >
                            😍 Totally Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id, 'Meh, could have skipped', 'want')}
                            className="btn-brutal-secondary py-1.5 px-3 text-xs bg-surface hover:bg-highlight"
                          >
                            😐 Meh
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id, 'Regret it', 'want')}
                            className="btn-brutal-secondary py-1.5 px-3 text-xs bg-surface hover:bg-highlight"
                          >
                            😞 Regret It
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Custom typed note input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={customReply[q.id] || ''}
                      onChange={(e) => setCustomReply({ ...customReply, [q.id]: e.target.value })}
                      placeholder="Or type custom answer (e.g. split with roommate)..."
                      className="input-brutal text-xs py-2 px-3 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customReply[q.id]?.trim()) {
                          handleAnswer(q.id, customReply[q.id].trim());
                        }
                      }}
                      className="btn-brutal py-2 px-3 text-xs shrink-0 flex items-center gap-1"
                    >
                      <span>Send</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Saved Answers History (Proof of real storage!) */}
      {tab === 'answered' && (
        <>
          {loading ? (
            <div className="card-brutal p-8 text-center bg-surface animate-pulse">
              <p className="text-xs font-heading font-bold text-text-muted">Loading saved answers...</p>
            </div>
          ) : answeredList.length === 0 ? (
            <div className="card-brutal p-8 text-center bg-surface space-y-3">
              <div className="w-16 h-16 rounded-2xl border-2 border-border shadow-sticker bg-surface mx-auto flex items-center justify-center text-3xl">
                📝
              </div>
              <h3 className="text-base font-heading font-black text-text">No answers yet</h3>
              <p className="text-xs text-text-muted font-medium max-w-xs mx-auto">
                When you answer reflection questions, they are permanently stored in your SQLite database and show up here!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-text-muted flex items-center justify-between">
                <span>{answeredList.length} reflections stored</span>
                <span className="text-income font-heading font-black">✓ 100% Persisted</span>
              </div>

              {answeredList.map((item) => (
                <div
                  key={item.id}
                  className="card-brutal p-3.5 bg-surface border-2 border-border shadow-sticker space-y-2"
                >
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black text-primary">
                        {formatCurrency(item.amount)}
                      </span>
                      {item.merchant && (
                        <span className="font-bold text-text">• {item.merchant}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-text-muted">{formatDate(item.answered_at || item.expense_date)}</span>
                  </div>

                  <p className="text-xs font-medium text-text-muted italic">
                    "{item.question_text}"
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-heading font-black uppercase tracking-wider text-text-muted">
                        Your Answer:
                      </span>
                      <span className="text-xs font-heading font-black text-text bg-highlight px-2.5 py-0.5 rounded-lg border border-border">
                        {item.answer_value}
                      </span>
                    </div>

                    {item.answered_tag && (
                      <span className={`text-[10px] font-heading font-black px-2 py-0.5 rounded-full border border-border uppercase ${
                        item.answered_tag === 'need'
                          ? 'bg-income/20 text-income'
                          : 'bg-accent/20 text-accent'
                      }`}>
                        {item.answered_tag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
