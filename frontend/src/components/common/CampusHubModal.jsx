import { useState, useEffect } from 'react';
import api from '../../services/api';
import { triggerConfetti } from '../../utils/confetti';
import { formatCurrency } from '../../utils/format';
import {
  MessageSquare,
  Coffee,
  Users,
  Trophy,
  X,
  Send,
  Plus,
  Check,
  Share2,
  Trash2,
  Sparkles,
  Zap
} from 'lucide-react';

export default function CampusHubModal({ isOpen, onClose, onRefresh }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('bot'); // 'bot' | 'mess' | 'split' | 'challenge'

  // --- 1. Quick Chat Bot State ---
  const [botInput, setBotInput] = useState('');
  const [botMessages, setBotMessages] = useState([
    {
      sender: 'bot',
      text: 'Hey! 🤖 Type any spend just like WhatsApp/Telegram (e.g. "120 chai at tapri" or "450 zomato want") and I\'ll log it into your database instantly!'
    }
  ]);
  const [isBotLogging, setIsBotLogging] = useState(false);

  // --- 2. Mess & Canteen State ---
  const [canteenBalance, setCanteenBalance] = useState(() => {
    return parseInt(localStorage.getItem('pb_canteen_balance') || '350', 10);
  });
  const [mealsRemaining, setMealsRemaining] = useState(() => {
    return parseInt(localStorage.getItem('pb_meals_remaining') || '24', 10);
  });

  // --- 3. Split Ledger State ---
  const [splitsList, setSplitsList] = useState(() => {
    const saved = localStorage.getItem('pb_roommate_splits');
    return saved ? JSON.parse(saved) : [
      { id: '1', person: 'Aman (Roommate)', amount: 150, forWhat: 'Yesterday Dinner', status: 'owes_you' },
      { id: '2', person: 'Priya', amount: 80, forWhat: 'Canteen Coffee & Patties', status: 'you_owe' }
    ];
  });
  const [newPerson, setNewPerson] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newForWhat, setNewForWhat] = useState('');
  const [newStatus, setNewStatus] = useState('owes_you');

  // --- 4. 30-Day No-Swiggy Challenge State ---
  const [challengeDays, setChallengeDays] = useState(() => {
    const saved = localStorage.getItem('pb_no_swiggy_days');
    return saved ? JSON.parse(saved) : [1, 2, 3];
  });

  // Save local states
  useEffect(() => {
    localStorage.setItem('pb_canteen_balance', String(canteenBalance));
  }, [canteenBalance]);

  useEffect(() => {
    localStorage.setItem('pb_meals_remaining', String(mealsRemaining));
  }, [mealsRemaining]);

  useEffect(() => {
    localStorage.setItem('pb_roommate_splits', JSON.stringify(splitsList));
  }, [splitsList]);

  useEffect(() => {
    localStorage.setItem('pb_no_swiggy_days', JSON.stringify(challengeDays));
  }, [challengeDays]);

  // Handler for Chat Bot
  async function handleSendBot() {
    const text = botInput.trim();
    if (!text) return;
    setBotInput('');

    const newMsgs = [...botMessages, { sender: 'user', text }];
    setBotMessages(newMsgs);
    setIsBotLogging(true);

    try {
      // Natural language regex parsing
      const amtMatch = text.match(/(\d+)/);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : 0;

      if (!amount || amount <= 0) {
        setBotMessages([
          ...newMsgs,
          {
            sender: 'bot',
            text: "Couldn't catch an amount! Try typing something with a number like: \"120 chai at tapri\""
          }
        ]);
        return;
      }

      const lower = text.toLowerCase();
      let merchant = 'Quick Spend';
      let tag = null;

      if (lower.includes('need')) tag = 'need';
      else if (lower.includes('want') || lower.includes('treat')) tag = 'want';

      if (lower.includes('zomato')) merchant = 'Zomato';
      else if (lower.includes('swiggy')) merchant = 'Swiggy';
      else if (lower.includes('chai') || lower.includes('tapri') || lower.includes('tea')) merchant = 'Chai Tapri';
      else if (lower.includes('canteen')) merchant = 'Campus Canteen';
      else if (lower.includes('metro') || lower.includes('bus')) merchant = 'Metro / Travel';
      else if (lower.includes('uber') || lower.includes('ola') || lower.includes('rapido')) merchant = 'Cab / Auto';
      else {
        // Remove number from text for note
        merchant = text.replace(/\d+/g, '').trim() || 'Quick Spend';
      }

      await api.post('/expenses', {
        amount,
        merchant,
        note: `Logged via Chat: "${text}"`,
        payment_method: 'upi',
        tag
      });

      triggerConfetti();
      if (onRefresh) onRefresh();

      setBotMessages([
        ...newMsgs,
        {
          sender: 'bot',
          text: `Boom! Logged ₹${amount} for "${merchant}" directly into your SQLite database. Reflection question generated! 🚀`
        }
      ]);
    } catch (err) {
      console.error(err);
      setBotMessages([
        ...newMsgs,
        { sender: 'bot', text: 'Error logging spend. Please try again!' }
      ]);
    } finally {
      setIsBotLogging(false);
    }
  }

  // Handler for Canteen Deductions
  function deductCanteen(amt) {
    if (canteenBalance < amt) {
      alert('Canteen card balance low! Please recharge.');
      return;
    }
    setCanteenBalance((prev) => prev - amt);
    triggerConfetti();
  }

  function deductMeal() {
    if (mealsRemaining <= 0) {
      alert('No mess meals left on pass!');
      return;
    }
    setMealsRemaining((prev) => prev - 1);
    triggerConfetti();
  }

  // Handler for adding split
  function handleAddSplit() {
    if (!newPerson.trim() || !newAmount) return;
    const item = {
      id: Date.now().toString(),
      person: newPerson.trim(),
      amount: parseFloat(newAmount),
      forWhat: newForWhat.trim() || 'Shared Bill',
      status: newStatus
    };
    setSplitsList([item, ...splitsList]);
    setNewPerson('');
    setNewAmount('');
    setNewForWhat('');
    triggerConfetti();
  }

  function handleDeleteSplit(id) {
    setSplitsList((prev) => prev.filter((s) => s.id !== id));
  }

  // Share reminder on WhatsApp
  function sendWhatsAppReminder(item) {
    const text = encodeURIComponent(
      `Hey ${item.person}! Just settling up our shared spend for ${item.forWhat} (₹${item.amount}). Whenever free, kindly UPI! 💸`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  // Toggle Challenge Day
  function toggleChallengeDay(d) {
    if (challengeDays.includes(d)) {
      setChallengeDays((prev) => prev.filter((day) => day !== d));
    } else {
      setChallengeDays((prev) => [...prev, d]);
      triggerConfetti();
    }
  }

  const savedFromChallenge = challengeDays.length * 200; // estimated ₹200 saved per home/mess cooked day

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="card-brutal w-full max-w-lg bg-surface border-3 border-border shadow-sticker-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-4 bg-primary text-white border-b-2 border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎒</span>
            <h2 className="text-base font-heading font-black">Campus & Student Hub</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white text-text border-2 border-border shadow-sticker flex items-center justify-center hover:bg-highlight font-bold"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 p-2 bg-bg border-b-2 border-border gap-1 text-center">
          {[
            { id: 'bot', label: 'Chat Bot', icon: MessageSquare },
            { id: 'mess', label: 'Mess Card', icon: Coffee },
            { id: 'split', label: 'Split Ledger', icon: Users },
            { id: 'challenge', label: '30D Save', icon: Trophy }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2 px-1 rounded-xl text-[11px] font-heading font-extrabold flex flex-col items-center gap-1 transition-all border-2 ${
                  activeTab === t.id
                    ? 'bg-highlight text-text border-border shadow-sticker'
                    : 'bg-surface text-text-muted border-transparent hover:border-border/40'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* 1. Quick Chat Bot */}
          {activeTab === 'bot' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-highlight border border-border text-xs font-bold text-text flex items-center gap-2">
                <Zap size={15} className="text-accent" />
                <span>Quick Log Spends via Chat (WhatsApp / Telegram style)</span>
              </div>

              {/* Chat Thread */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto p-1">
                {botMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`card-brutal p-2.5 max-w-[85%] text-xs font-medium border-2 border-border ${
                        m.sender === 'user'
                          ? 'bg-accent text-white shadow-sticker'
                          : 'bg-bg text-text shadow-sticker-hover'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder='e.g. "120 chai with friends", "350 zomato"'
                  value={botInput}
                  onChange={(e) => setBotInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendBot()}
                  className="input-brutal text-xs py-2 px-3 flex-1"
                />
                <button
                  type="button"
                  disabled={isBotLogging}
                  onClick={handleSendBot}
                  className="btn-brutal py-2 px-3.5 text-xs shrink-0 flex items-center gap-1"
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['40 chai tapri', '150 canteen lunch', '80 metro recharge', '300 zomato want'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => setBotInput(cmd)}
                    className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-md border border-border bg-bg hover:bg-highlight transition-colors"
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Mess & Canteen Card */}
          {activeTab === 'mess' && (
            <div className="space-y-4">
              <div className="card-brutal p-4 bg-highlight text-text border-2 border-border shadow-sticker space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-black uppercase tracking-wider text-text-muted">
                    Prepaid Campus Canteen Card
                  </span>
                  <Coffee size={18} />
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-heading font-black text-text">
                    ₹{canteenBalance}
                  </div>
                  <button
                    onClick={() => {
                      const add = prompt('Recharge Canteen Card by how much? (₹)', '500');
                      if (add && !isNaN(parseFloat(add))) {
                        setCanteenBalance((prev) => prev + parseFloat(add));
                        triggerConfetti();
                      }
                    }}
                    className="btn-brutal text-xs py-1 px-3"
                  >
                    + Recharge
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => deductCanteen(30)}
                    className="btn-brutal-secondary text-[11px] py-1.5 px-2 bg-surface"
                  >
                    -₹30 Chai
                  </button>
                  <button
                    onClick={() => deductCanteen(70)}
                    className="btn-brutal-secondary text-[11px] py-1.5 px-2 bg-surface"
                  >
                    -₹70 Snack
                  </button>
                  <button
                    onClick={() => deductCanteen(120)}
                    className="btn-brutal-secondary text-[11px] py-1.5 px-2 bg-surface"
                  >
                    -₹120 Meal
                  </button>
                </div>
              </div>

              {/* Hostel Mess Meals */}
              <div className="card-brutal p-4 bg-surface border-2 border-border shadow-sticker space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-heading font-black uppercase tracking-wider text-text-muted block">
                      Hostel Mess Meal Pass
                    </span>
                    <span className="text-2xl font-heading font-black text-primary">
                      {mealsRemaining} Meals Left
                    </span>
                  </div>
                  <button
                    onClick={deductMeal}
                    className="btn-brutal text-xs py-2 px-3.5 bg-primary text-white"
                  >
                    ✓ Ate a Meal (-1)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Split Ledger (Roommates & Gang) */}
          {activeTab === 'split' && (
            <div className="space-y-4">
              {/* Add Split Form */}
              <div className="card-brutal p-3 bg-bg border-2 border-border space-y-2">
                <span className="text-[11px] font-heading font-black uppercase text-text-muted block">
                  Log Shared Expense with Roommate / Friend
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Friend's Name"
                    value={newPerson}
                    onChange={(e) => setNewPerson(e.target.value)}
                    className="input-brutal text-xs py-1.5 px-2.5"
                  />
                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="input-brutal text-xs py-1.5 px-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="For what? (e.g. WiFi Bill)"
                    value={newForWhat}
                    onChange={(e) => setNewForWhat(e.target.value)}
                    className="input-brutal text-xs py-1.5 px-2.5"
                  />
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="input-brutal text-xs py-1.5 px-2.5"
                  >
                    <option value="owes_you">They owe you</option>
                    <option value="you_owe">You owe them</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddSplit}
                  className="btn-brutal w-full text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add to Ledger</span>
                </button>
              </div>

              {/* Splits List */}
              <div className="space-y-2">
                {splitsList.map((s) => (
                  <div
                    key={s.id}
                    className="card-brutal p-3 bg-surface border-2 border-border shadow-sticker flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-heading font-black text-text">{s.person}</p>
                      <p className="text-[11px] text-text-muted">
                        {s.forWhat} •{' '}
                        <span className={s.status === 'owes_you' ? 'text-income font-bold' : 'text-expense font-bold'}>
                          {s.status === 'owes_you' ? 'Owes you' : 'You owe'} ₹{s.amount}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {s.status === 'owes_you' && (
                        <button
                          type="button"
                          onClick={() => sendWhatsAppReminder(s)}
                          title="Remind on WhatsApp"
                          className="p-1.5 rounded-lg border border-border bg-income text-white hover:opacity-90"
                        >
                          <Share2 size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSplit(s.id)}
                        className="p-1.5 rounded-lg border border-border bg-bg text-text-muted hover:text-expense"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. 30-Day "No-Swiggy / Cook at Hostel" Challenge */}
          {activeTab === 'challenge' && (
            <div className="space-y-3">
              <div className="card-brutal p-4 bg-highlight text-text border-2 border-border shadow-sticker flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-heading font-black">30-Day No-Swiggy Challenge 🍳</h3>
                  <p className="text-[11px] text-text-muted font-medium">
                    {challengeDays.length} days checked off • ~₹{savedFromChallenge} estimated pocket money saved!
                  </p>
                </div>
                <Trophy size={28} className="text-accent shrink-0" />
              </div>

              <div className="grid grid-cols-6 gap-2 pt-1">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                  const done = challengeDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleChallengeDay(day)}
                      className={`h-11 rounded-xl border-2 text-xs font-heading font-bold transition-all flex flex-col items-center justify-center ${
                        done
                          ? 'bg-income text-white border-border shadow-sticker'
                          : 'bg-surface text-text-muted border-border/50 hover:border-border'
                      }`}
                    >
                      <span>D{day}</span>
                      {done && <Check size={12} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>

              {challengeDays.length >= 7 && (
                <div className="p-2.5 rounded-xl bg-accent text-white border-2 border-border flex items-center gap-2 text-xs font-heading font-black shadow-sticker">
                  <span>🎖️</span>
                  <span>Unlocked Badge: "Hostel MasterChef Level 1"</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

