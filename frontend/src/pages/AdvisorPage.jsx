import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Sparkles, Send, Bot, User, AlertCircle } from 'lucide-react';

export default function AdvisorPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Yo! I'm your Paise Bachao money buddy. Ask me anything about your pocket money, recent spends, or if you can afford a new purchase!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(textToSend) {
    const q = textToSend || input;
    if (!q.trim()) return;

    const userMsg = { id: Date.now().toString(), sender: 'user', text: q.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/advisor/chat', { message: q.trim() });
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.data.reply,
        disclaimer: res.data.disclaimer,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: "I had trouble pulling that up from your records. Try asking in another way!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const promptSuggestions = [
    'Where did I overspend?',
    'Can I afford ₹1,500 shoes?',
    'How much can I save by Dec?',
    'What is my safe daily limit?',
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-4 min-h-[calc(100vh-5rem)] flex flex-col justify-between pb-24">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <span className="text-[11px] font-heading font-extrabold uppercase tracking-wider text-text-muted">
            Personal Financial Coach
          </span>
          <h1 className="text-xl font-heading font-black text-text flex items-center gap-2">
            <span>Money Buddy</span>
            <span className="text-xs bg-highlight border border-border px-2 py-0.5 rounded-full font-bold">
              AI / Rules
            </span>
          </h1>
        </div>

        {/* Message Log */}
        <div className="space-y-3 pt-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl border-2 border-border shadow-sticker-hover flex items-center justify-center shrink-0 text-sm font-bold ${
                  m.sender === 'user' ? 'bg-primary text-white' : 'bg-highlight text-text'
                }`}
              >
                {m.sender === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>

              <div
                className={`p-3.5 rounded-2xl border-2 border-border shadow-sticker max-w-[85%] text-xs font-semibold leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs font-bold text-text-muted animate-pulse">
              <Bot size={16} />
              <span>Analyzing your database...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="space-y-3 pt-4 sticky bottom-16 bg-bg pb-2">
        {/* Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {promptSuggestions.map((s, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => handleSend(s)}
              className="px-3 py-1.5 rounded-xl border-2 border-border bg-surface text-[11px] font-heading font-bold text-text whitespace-nowrap shrink-0 shadow-sticker-hover active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your money..."
            className="input-brutal text-xs py-2.5 flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-brutal py-2.5 px-4 rounded-xl flex items-center justify-center shrink-0"
          >
            <Send size={16} />
          </button>
        </form>

        <p className="text-[10px] text-center text-text-muted font-medium flex items-center justify-center gap-1">
          <AlertCircle size={11} />
          <span>Guidance based strictly on your entries, not professional financial advice.</span>
        </p>
      </div>
    </div>
  );
}
