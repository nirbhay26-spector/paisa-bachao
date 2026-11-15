import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getIcon } from '../utils/icons';
import { parseNaturalLanguageTransaction } from '../utils/nlpParser';
import { formatCurrency, formatDate } from '../utils/format';
import {
  Mic,
  ArrowLeft,
  Check,
  Repeat,
  Camera,
  X,
  Sparkles,
  Zap,
  AlertTriangle,
  Users,
  Edit2,
  Calendar,
  CreditCard
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', icon: 'UtensilsCrossed', color: '#FF5C8A' },
  { id: 'snacks_cafe', name: 'Chai & Snacks', icon: 'Coffee', color: '#E8A317' },
  { id: 'travel', name: 'Travel & Metro', icon: 'Bus', color: '#7C5CFF' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#C6F432' },
  { id: 'education', name: 'College & Books', icon: 'GraduationCap', color: '#19B37A' },
  { id: 'entertainment', name: 'Outings & Fun', icon: 'Gamepad2', color: '#FF4D4D' },
  { id: 'recharge_bills', name: 'Recharge & Bills', icon: 'Smartphone', color: '#3A86FF' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'RefreshCw', color: '#9B59B6' },
  { id: 'savings', name: 'Savings Goal', icon: 'PiggyBank', color: '#2F8F5B' },
  { id: 'other', name: 'Other', icon: 'MoreHorizontal', color: '#6B746E' },
];

export default function AddExpensePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const smartInputRef = useRef(null);
  const amountInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Parse query params (e.g. from Gang Split tool)
  const searchParams = new URLSearchParams(location.search);
  const initialAmount = searchParams.get('amount') || '';
  const initialNote = searchParams.get('note') || '';

  // Mode: 'smart' (natural language + voice) or 'form' (manual fields)
  const [mode, setMode] = useState(initialAmount ? 'form' : 'smart');
  const [smartText, setSmartText] = useState('');
  const [parsedCandidate, setParsedCandidate] = useState(null);

  // Form fields
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [amount, setAmount] = useState(initialAmount);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [tag, setTag] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState(initialNote);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [splitInfo, setSplitInfo] = useState(null);

  const [receiptFile, setReceiptFile] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
    if (mode === 'smart') {
      smartInputRef.current?.focus();
    } else {
      amountInputRef.current?.focus();
    }
  }, [mode]);

  async function loadCategories() {
    try {
      const res = await api.get('/categories');
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    } catch {}
  }

  // Pre-flight duplicate transaction check
  async function checkForDuplicate(checkAmt, checkMerchant, checkDate) {
    if (!checkAmt || isNaN(parseFloat(checkAmt))) return;
    try {
      const res = await api.get('/expenses/check-duplicate', {
        params: {
          amount: checkAmt,
          merchant: checkMerchant || '',
          date: checkDate || date
        }
      });
      if (res.data.is_duplicate) {
        setDuplicateWarning(res.data.duplicate);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // ignore check error
    }
  }

  // Natural Language input handler
  function handleSmartInputChange(text) {
    setSmartText(text);
    if (!text.trim()) {
      setParsedCandidate(null);
      setDuplicateWarning(null);
      return;
    }

    const candidate = parseNaturalLanguageTransaction(text);
    if (candidate) {
      setParsedCandidate(candidate);
      if (candidate.amount && candidate.merchant) {
        checkForDuplicate(candidate.amount, candidate.merchant, candidate.date);
      }
    }
  }

  // Voice input handler — uses same NLP pipeline
  function handleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSmartText(transcript);
      handleSmartInputChange(transcript);
    };

    recognition.start();
  }

  // Commit Candidate into Form Mode for fine-tuning
  function applyCandidateToForm(candidate) {
    if (!candidate) return;
    setAmount(candidate.amount ? String(candidate.amount) : '');
    setMerchant(candidate.merchant || '');
    setSelectedCategory(candidate.category_id || null);
    setPaymentMethod(candidate.payment_method || 'upi');
    setTag(candidate.tag || 'need');
    setDate(candidate.date || new Date().toISOString().slice(0, 10));
    setNote(candidate.note || '');
    setIsRecurring(candidate.is_recurring || false);
    setRecurrenceRule(candidate.recurrence_rule || '');
    setSplitInfo(candidate.split_info || null);
    setMode('form');
  }

  // Submit Handler (Used by both Smart confirmation and Classic form)
  async function handleFinalSubmit(dataToSave) {
    setError('');
    const finalAmount = parseFloat(dataToSave.amount);
    if (!finalAmount || finalAmount <= 0 || finalAmount > 10000000) {
      setError('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    if (navigator.vibrate) navigator.vibrate(20);

    try {
      const res = await api.post('/expenses', {
        amount: finalAmount,
        category_id: dataToSave.category_id || selectedCategory,
        payment_method: dataToSave.payment_method || paymentMethod,
        date: dataToSave.date ? new Date(dataToSave.date).toISOString() : new Date().toISOString(),
        merchant: (dataToSave.merchant || merchant || '').trim(),
        note: (dataToSave.note || note || '').trim(),
        tag: dataToSave.tag || tag || null,
        is_recurring: dataToSave.is_recurring || isRecurring,
        recurrence_rule: dataToSave.recurrence_rule || recurrenceRule || null
      });

      const newId = res.data.expense?.id;
      if (receiptFile && newId) {
        const fd = new FormData();
        fd.append('receipt', receiptFile);
        await api.post(`/expenses/${newId}/attachment`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // If a smart question was generated, route to questions, otherwise home
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
    <div className="max-w-lg mx-auto px-4 py-4 min-h-screen pb-24 space-y-4">
      {/* Top Bar with Mode Switcher */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border-2 border-border bg-surface text-text font-bold shadow-sticker-hover active:scale-95"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Mode Pill Toggle */}
        <div className="flex bg-bg p-1 rounded-xl border-2 border-border shadow-xs">
          <button
            type="button"
            onClick={() => setMode('smart')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-heading font-black transition-all ${
              mode === 'smart'
                ? 'bg-primary text-white shadow-sticker'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Zap size={13} />
            <span>Smart Add</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('form')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-heading font-black transition-all ${
              mode === 'form'
                ? 'bg-primary text-white shadow-sticker'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Edit2 size={13} />
            <span>Classic Form</span>
          </button>
        </div>

        <button
          onClick={handleVoiceInput}
          className={`p-2 rounded-xl border-2 border-border shadow-sticker-hover font-bold transition-all ${
            isListening ? 'bg-expense text-white animate-pulse' : 'bg-highlight text-text'
          }`}
          title="Voice entry"
        >
          <Mic size={16} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-expense/15 text-expense border-2 border-expense font-bold text-xs">
          {error}
        </div>
      )}

      {/* =========================================================================
          MODE 1: SMART NATURAL LANGUAGE & VOICE ADD (GEN-Z SPEED HERO)
          ========================================================================= */}
      {mode === 'smart' && (
        <div className="space-y-4 animate-fade-in">
          {/* Smart Input Bar */}
          <div className="card-brutal p-4 bg-surface border-3 border-border shadow-sticker space-y-2">
            <label className="text-xs font-heading font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              <span>Type or speak naturally</span>
            </label>

            <div className="relative">
              <textarea
                ref={smartInputRef}
                rows={2}
                value={smartText}
                onChange={(e) => handleSmartInputChange(e.target.value)}
                placeholder='e.g. "250 zomato yesterday upi" or "1200 electricity split with 3 people"'
                className="w-full bg-bg border-2 border-border rounded-xl p-3 text-sm font-heading font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              {isListening && (
                <div className="absolute right-3 bottom-3 flex items-center gap-1 text-xs text-expense font-black animate-pulse">
                  <Mic size={14} />
                  <span>Listening...</span>
                </div>
              )}
            </div>

            {/* Quick Presets / Examples Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                '250 zomato yesterday upi',
                '80 chai today cash',
                '299 spotify monthly',
                '1200 wifi split with 3 people'
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleSmartInputChange(ex)}
                  className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-lg border border-border bg-bg text-text hover:bg-highlight transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* DUPLICATE WARNING BANNER */}
          {duplicateWarning && (
            <div className="card-brutal p-3 bg-accent/15 border-2 border-accent text-accent text-xs font-bold shadow-sticker flex items-start gap-2.5 animate-scale-in">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-heading font-black">Possible Duplicate Detected</p>
                <p className="text-[11px] text-text font-medium mt-0.5">
                  You already logged ₹{duplicateWarning.amount} for {duplicateWarning.merchant || 'this purchase'} today. You can still confirm if this was a separate spend!
                </p>
              </div>
            </div>
          )}

          {/* EDITABLE CONFIRMATION CARD (Never silently save uncertain results!) */}
          {parsedCandidate && parsedCandidate.amount ? (
            <div className="card-brutal p-4 bg-highlight/30 border-3 border-border shadow-sticker-lg space-y-3 animate-scale-in">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-heading font-black text-text flex items-center gap-1.5">
                  <Check size={15} className="text-primary" />
                  <span>Review & Confirm Parsed Spend</span>
                </span>
                <button
                  type="button"
                  onClick={() => applyCandidateToForm(parsedCandidate)}
                  className="text-[11px] font-heading font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Edit2 size={11} />
                  <span>Edit in full form</span>
                </button>
              </div>

              {/* Amount & Merchant Hero */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase block">Merchant / Note</span>
                  <input
                    type="text"
                    value={parsedCandidate.merchant}
                    onChange={(e) => setParsedCandidate({ ...parsedCandidate, merchant: e.target.value })}
                    className="font-heading font-black text-lg text-text bg-transparent border-b border-dashed border-border focus:outline-none"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-text-muted uppercase block">Amount</span>
                  <div className="text-3xl font-heading font-black text-expense flex items-center justify-end">
                    <span>₹</span>
                    <input
                      type="number"
                      value={parsedCandidate.amount}
                      onChange={(e) => setParsedCandidate({ ...parsedCandidate, amount: e.target.value })}
                      className="w-24 text-right font-heading font-black text-3xl bg-transparent border-b border-dashed border-border focus:outline-none text-expense"
                    />
                  </div>
                </div>
              </div>

              {/* Candidate Attributes Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                {/* Category Pill */}
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <span className="text-[9px] font-bold text-text-muted uppercase block">Category</span>
                  <span className="font-heading font-black text-primary capitalize truncate block mt-0.5">
                    {parsedCandidate.category_id}
                  </span>
                </div>

                {/* Payment Method Pill */}
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <span className="text-[9px] font-bold text-text-muted uppercase block">Payment</span>
                  <span className="font-heading font-black text-text uppercase truncate block mt-0.5">
                    {parsedCandidate.payment_method}
                  </span>
                </div>

                {/* 50/30/20 Tag */}
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <span className="text-[9px] font-bold text-text-muted uppercase block">Classification</span>
                  <span className="font-heading font-black text-accent uppercase truncate block mt-0.5">
                    {parsedCandidate.tag || 'Need'}
                  </span>
                </div>
              </div>

              {/* Split info banner if detected */}
              {parsedCandidate.split_info && (
                <div className="p-2 rounded-xl bg-highlight border border-border text-xs flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>Split with {parsedCandidate.split_info.num_people} friends:</span>
                  </span>
                  <span className="font-heading font-black text-primary">
                    Your share: ₹{parsedCandidate.split_info.per_person}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setParsedCandidate(null)}
                  className="p-3 rounded-xl border border-border bg-surface text-xs font-bold text-text-muted hover:text-text"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinalSubmit(parsedCandidate)}
                  className="btn-brutal flex-1 py-3 text-sm font-heading font-black shadow-sticker"
                >
                  {submitting ? 'Logging...' : 'Confirm & Log Spend (Done!) ✨'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card-brutal p-6 text-center bg-surface border-2 border-dashed border-border space-y-1">
              <span className="text-2xl block mb-1">⚡</span>
              <p className="text-xs font-heading font-bold text-text">
                Type above or tap the microphone to dictate your spend.
              </p>
              <p className="text-[11px] text-text-muted">
                Our student intelligence parser will extract amount, merchant, and category instantly!
              </p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: CLASSIC FULL FORM ENTRY
          ========================================================================= */}
      {mode === 'form' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFinalSubmit({
              amount,
              category_id: selectedCategory,
              payment_method: paymentMethod,
              merchant,
              note,
              tag,
              date,
              is_recurring: isRecurring,
              recurrence_rule: recurrenceRule
            });
          }}
          className="space-y-4 animate-fade-in"
        >
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
                onChange={(e) => {
                  setAmount(e.target.value);
                  checkForDuplicate(e.target.value, merchant, date);
                }}
                placeholder="0"
                className="text-5xl font-heading font-black bg-transparent text-center text-text focus:outline-none w-52 tracking-tight"
                required
              />
            </div>
          </div>

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="card-brutal p-3 bg-accent/15 border-2 border-accent text-accent text-xs font-bold shadow-sticker flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-heading font-black">Possible Duplicate</p>
                <p className="text-[11px] text-text font-medium mt-0.5">
                  You already logged ₹{duplicateWarning.amount} for {duplicateWarning.merchant || 'this merchant'} today.
                </p>
              </div>
            </div>
          )}

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
                onChange={(e) => {
                  setMerchant(e.target.value);
                  checkForDuplicate(amount, e.target.value, date);
                }}
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

          {/* Big Save Button */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-brutal w-full py-4 text-base font-heading font-black shadow-sticker-lg"
          >
            {submitting ? 'Saving...' : 'Save Spend (Done!)'}
          </button>
        </form>
      )}
    </div>
  );
}
