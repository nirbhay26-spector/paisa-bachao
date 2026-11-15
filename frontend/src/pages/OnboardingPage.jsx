import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowRight, Check, Sparkles, Wallet } from 'lucide-react';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const { theme, setTheme, themes } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name || '');
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthly_income ? String(user.monthly_income) : '');
  const [incomeFrequency, setIncomeFrequency] = useState(user?.income_frequency || 'monthly');
  const [incomeArrivalDate, setIncomeArrivalDate] = useState(user?.income_arrival_date || '1');
  const [savingsGoal, setSavingsGoal] = useState(user?.savings_goal ? String(user.savings_goal) : '');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim() || user?.name || 'Friend',
        monthly_income: parseFloat(monthlyIncome) || 0,
        income_frequency: incomeFrequency,
        income_arrival_date: incomeArrivalDate,
        savings_goal: parseFloat(savingsGoal) || 0,
        theme,
        onboarding_done: 1,
      });
    } catch (err) {
      console.error('Onboarding update error:', err);
    } finally {
      setSaving(false);
      navigate('/', { replace: true });
    }
  }

  function handleSkip() {
    updateProfile({ onboarding_done: 1 }).catch(() => {});
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between p-5 max-w-md mx-auto">
      <div>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 pt-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2.5 flex-1 rounded-full border-2 border-border transition-all ${
                s <= step ? 'bg-primary' : 'bg-surface'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Name & Theme */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <span className="text-xs font-heading font-extrabold uppercase px-2.5 py-1 rounded-full border border-border bg-highlight text-text inline-block mb-2">
                Step 1 of 3
              </span>
              <h1 className="text-2xl font-heading font-black text-text">Welcome to Paisa Bachao! 💸</h1>
              <p className="text-xs text-text-muted mt-1 font-medium">Let's set up your personal student money tracker.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                What should we call you?
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name or nickname"
                className="input-brutal text-base"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Choose Your Vibe (Theme)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {themes.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id)}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all ${
                      theme === th.id
                        ? 'border-border bg-surface shadow-sticker'
                        : 'border-border/40 bg-surface/60 hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: th.colors.primary }} />
                        <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: th.colors.accent }} />
                        <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: th.colors.highlight }} />
                      </div>
                      <span className="text-xs font-heading font-bold text-text">{th.name}</span>
                    </div>
                    {theme === th.id && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Pocket Money & Arrival Cycle */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <span className="text-xs font-heading font-extrabold uppercase px-2.5 py-1 rounded-full border border-border bg-highlight text-text inline-block mb-2">
                Step 2 of 3
              </span>
              <h1 className="text-2xl font-heading font-black text-text">Pocket Money / Allowance 👛</h1>
              <p className="text-xs text-text-muted mt-1 font-medium">
                Enter what you actually receive from parents or side-hustles.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                How much pocket money do you receive? (₹)
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="e.g. 2000"
                className="input-brutal text-2xl font-heading font-black text-primary"
              />

              {/* Quick Preset Chips for Students */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {['1000', '2000', '3500', '5000', '8000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMonthlyIncome(amt)}
                    className={`px-3 py-1 rounded-full border-2 text-xs font-heading font-bold transition-all ${
                      monthlyIncome === amt
                        ? 'bg-primary text-white border-border shadow-sticker'
                        : 'bg-surface text-text border-border hover:bg-highlight'
                    }`}
                  >
                    ₹{parseInt(amt).toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                How often does it arrive?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'irregular', label: 'Irregular' },
                ].map((freq) => (
                  <button
                    type="button"
                    key={freq.id}
                    onClick={() => setIncomeFrequency(freq.id)}
                    className={`py-2.5 rounded-xl border-2 text-xs font-heading font-bold transition-all ${
                      incomeFrequency === freq.id
                        ? 'bg-primary text-white border-border shadow-sticker'
                        : 'bg-surface text-text border-border'
                    }`}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>

            {incomeFrequency === 'monthly' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Day of the month it usually arrives
                </label>
                <select
                  value={incomeArrivalDate}
                  onChange={(e) => setIncomeArrivalDate(e.target.value)}
                  className="input-brutal text-sm"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>
                      {d}st / {d}th of the month
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Optional Savings Goal */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <span className="text-xs font-heading font-extrabold uppercase px-2.5 py-1 rounded-full border border-border bg-highlight text-text inline-block mb-2">
                Step 3 of 3
              </span>
              <h1 className="text-2xl font-heading font-black text-text">One Savings Goal (Optional) 🎯</h1>
              <p className="text-xs text-text-muted mt-1 font-medium">
                Got a trip, new sneakers, festival passes or emergency fund in mind?
              </p>
            </div>

            <div className="card-brutal p-4 space-y-3 bg-surface">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Monthly Target (₹)
                </label>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  placeholder="e.g. 500"
                  className="input-brutal text-xl font-heading font-bold"
                />
              </div>

              {parseFloat(monthlyIncome) > 0 && (
                <p className="text-xs text-text-muted font-medium">
                  Suggested 20% rule: ₹{Math.round((parseFloat(monthlyIncome) || 0) * 0.2).toLocaleString('en-IN')}/mo
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="pt-6 space-y-2.5">
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="btn-brutal w-full py-3.5 text-base"
          >
            <span>Continue</span>
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={handleFinish}
            className="btn-brutal w-full py-3.5 text-base"
          >
            <span>{saving ? 'Saving...' : 'Start Tracking!'}</span>
            <Sparkles size={18} />
          </button>
        )}

        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="btn-brutal-secondary w-full py-2.5 text-xs text-text-muted hover:text-text"
          >
            Back
          </button>
        )}

        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-center text-xs font-heading font-extrabold text-text-muted hover:text-text underline pt-1"
        >
          Skip setup for now & go straight to dashboard →
        </button>
      </div>
    </div>
  );
}
