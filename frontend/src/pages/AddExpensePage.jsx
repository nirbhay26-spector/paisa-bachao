import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getIcon } from '../utils/icons';
import {
  Mic,
  ArrowLeft,
  Check,
  Repeat,
  Camera,
  X,
  Sparkles,
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', icon: 'UtensilsCrossed', color: '#FF5C8A' },
  { id: 'snacks', name: 'Chai & Snacks', icon: 'Coffee', color: '#E8A317' },
  { id: 'travel', name: 'Travel & Metro', icon: 'Bus', color: '#7C5CFF' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#C6F432' },
  { id: 'education', name: 'College & Books', icon: 'GraduationCap', color: '#19B37A' },
  { id: 'fun', name: 'Outings & Fun', icon: 'Gamepad2', color: '#FF4D4D' },
  { id: 'bills', name: 'Recharge & Bills', icon: 'Smartphone', color: '#3A86FF' },
  { id: 'subs', name: 'Subscriptions', icon: 'RefreshCw', color: '#9B59B6' },
  { id: 'savings', name: 'Savings Goal', icon: 'PiggyBank', color: '#2F8F5B' },
  { id: 'other', name: 'Other', icon: 'MoreHorizontal', color: '#6B746E' },
];

export default function AddExpensePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const amountInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Parse query params (e.g. from Gang Split tool)
  const searchParams = new URLSearchParams(location.search);
  const initialAmount = searchParams.get('amount') || '';
  const initialNote = searchParams.get('note') || '';

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [amount, setAmount] = useState(initialAmount);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [tag, setTag] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState(initialNote);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptFile, setReceiptFile] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    amountInputRef.current?.focus();
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await api.get('/categories');
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    } catch {}
  }

  function handleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      // Extract amount: e.g. "120 chai" or "spent 300 at dominos"
      const numMatch = transcript.match(/(\d+)/);
      if (numMatch) {
        setAmount(numMatch[1]);
      }

      if (transcript.includes('swiggy') || transcript.includes('zomato') || transcript.includes('food')) {
        const cat = categories.find(c => c.name.toLowerCase().includes('food'));
        if (cat) setSelectedCategory(cat.id);
        if (transcript.includes('swiggy')) setMerchant('Swiggy');
        if (transcript.includes('zomato')) setMerchant('Zomato');
      } else if (transcript.includes('chai') || transcript.includes('coffee') || transcript.includes('snack')) {
        const cat = categories.find(c => c.name.toLowerCase().includes('snack') || c.name.toLowerCase().includes('chai'));
        if (cat) setSelectedCategory(cat.id);
        setMerchant('Chai Stall');
      } else if (transcript.includes('metro') || transcript.includes('uber') || transcript.includes('auto')) {
        const cat = categories.find(c => c.name.toLowerCase().includes('travel'));
        if (cat) setSelectedCategory(cat.id);
        if (transcript.includes('metro')) setMerchant('Metro');
        if (transcript.includes('uber')) setMerchant('Uber');
      }

      setNote(transcript);
    };

    recognition.start();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0 || parsed > 10000000) {
      setError('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    if (navigator.vibrate) navigator.vibrate(20);

    try {
      const res = await api.post('/expenses', {
        amount: parsed,
        category_id: selectedCategory,
        payment_method: paymentMethod,
        date: new Date(date).toISOString(),
        merchant: merchant.trim(),
        note: note.trim(),
        tag: tag || null,
      });

      const newId = res.data.expense?.id;
      if (receiptFile && newId) {
        const fd = new FormData();
        fd.append('receipt', receiptFile);
        await api.post(`/expenses/${newId}/attachment`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // If smart question generated, route to questions, otherwise home
      if (res.data.question) {
        navigate('/questions');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save expense');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 min-h-screen pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl border-2 border-border bg-surface text-text font-bold shadow-sticker-hover active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-heading font-black">Quick Spend Entry</h1>
        <button
          onClick={handleVoiceInput}
          className={`p-2.5 rounded-xl border-2 border-border shadow-sticker-hover font-bold transition-all ${
            isListening ? 'bg-expense text-white animate-pulse' : 'bg-highlight text-text'
          }`}
          title="Voice entry"
        >
          <Mic size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-2xl bg-expense/15 text-expense border-2 border-expense font-bold text-xs">
            {error}
          </div>
        )}

        {/* Big Amount Card */}
        <div className="card-brutal p-6 text-center bg-surface space-y-1">
          <span className="text-[11px] font-heading font-extrabold uppercase text-text-muted tracking-wider block">
            Amount
          </span>
          <div className="inline-flex items-center justify-center gap-1">
            <span className="text-4xl font-heading font-black text-primary">₹</span>
            <input
              ref={amountInputRef}
              type="number"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="text-5xl font-heading font-black bg-transparent text-center text-text focus:outline-none w-52 tracking-tight"
              required
            />
          </div>
          {isListening && (
            <p className="text-xs text-expense font-bold animate-bounce mt-1">
              Listening... "120 chai at canteen"
            </p>
          )}
        </div>

        {/* Category Sticker Chips */}
        <div>
          <label className="block text-xs font-heading font-black uppercase tracking-wider text-text-muted mb-2">
            Category Sticker
          </label>
          <div className="grid grid-cols-5 gap-2">
            {categories.map((cat) => {
              const IconComp = getIcon(cat.icon);
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                  className={`p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all min-h-[68px] ${
                    isSelected
                      ? 'border-border bg-highlight shadow-sticker scale-105 font-bold ring-2 ring-primary'
                      : 'border-border/70 bg-surface text-text hover:border-border active:scale-95'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-white sticker-icon"
                    style={{ backgroundColor: cat.color || '#FF5C8A' }}
                  >
                    <IconComp size={16} />
                  </div>
                  <span className="text-[10px] font-heading font-bold truncate max-w-full text-center">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 50/30/20 Tag Selection */}
        <div>
          <label className="block text-xs font-heading font-black uppercase tracking-wider text-text-muted mb-2">
            Type (50/30/20 Rule)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'need', label: '🟢 Need (50%)' },
              { id: 'want', label: '🟡 Want (30%)' },
              { id: 'savings', label: '🔵 Savings (20%)' },
            ].map((tg) => (
              <button
                type="button"
                key={tg.id}
                onClick={() => setTag(tag === tg.id ? '' : tg.id)}
                className={`py-2 px-2 rounded-xl border-2 text-xs font-heading font-bold transition-all ${
                  tag === tg.id
                    ? 'bg-primary text-white border-border shadow-sticker'
                    : 'bg-surface text-text border-border/70'
                }`}
              >
                {tg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-heading font-black uppercase tracking-wider text-text-muted mb-2">
            Paid Via
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['upi', 'cash', 'card', 'wallet'].map((pm) => (
              <button
                type="button"
                key={pm}
                onClick={() => setPaymentMethod(pm)}
                className={`py-2 rounded-xl border-2 text-xs font-heading font-black uppercase transition-all ${
                  paymentMethod === pm
                    ? 'bg-accent text-white border-border shadow-sticker'
                    : 'bg-surface text-text border-border/70'
                }`}
              >
                {pm}
              </button>
            ))}
          </div>
        </div>

        {/* Merchant & Date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-text-muted mb-1">
              Where / Merchant
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Swiggy, Metro, Canteen"
              className="input-brutal text-xs py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-brutal text-xs py-2"
            />
          </div>
        </div>

        {/* Optional Note & Student Vibe Tags */}
        <div>
          <label className="block text-xs font-bold text-text-muted mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Chai with friends, textbooks..."
            className="input-brutal text-xs py-2"
          />

          {/* Quick Vibe Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['#Canteen', '#ChaiBreak', '#LateNight', '#HostelStuff', '#SplitBill', '#TreatMyself'].map((vibe) => (
              <button
                key={vibe}
                type="button"
                onClick={() => {
                  if (!note.includes(vibe)) {
                    setNote((prev) => (prev ? `${prev} ${vibe}` : vibe));
                  }
                }}
                className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-lg border border-border bg-surface text-text hover:bg-highlight transition-all"
              >
                {vibe}
              </button>
            ))}
          </div>
        </div>

        {/* Attachment */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-border bg-surface text-xs font-bold text-text-muted flex items-center justify-center gap-2 hover:border-primary active:scale-98"
        >
          <Camera size={16} />
          <span>{receiptFile ? `Attached: ${receiptFile.name}` : 'Attach Receipt / Screenshot'}</span>
        </button>

        {/* Big Save Button (<5s execution) */}
        <button
          type="submit"
          disabled={submitting}
          className="btn-brutal w-full py-4 text-base font-heading font-black shadow-sticker-lg"
        >
          {submitting ? 'Saving...' : 'Save Spend (Done!)'}
        </button>
      </form>
    </div>
  );
}
