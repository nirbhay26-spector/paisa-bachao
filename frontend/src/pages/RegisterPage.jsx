import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register, loginDemo } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) {
      setError(t('auth.error_short_password') || 'Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/onboarding');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setDemoLoading(true);
    try {
      await loginDemo();
      navigate('/');
    } catch (err) {
      console.error('Demo login error:', err);
      navigate('/');
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-bg relative">
      {/* Language switcher top right */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-surface border-2 border-border rounded-xl px-2.5 py-1 shadow-sticker text-xs font-heading font-bold">
        <Globe size={14} className="text-primary" />
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="bg-transparent border-none text-xs font-heading font-bold text-text focus:outline-none cursor-pointer"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} className="text-text bg-surface">
              {l.native}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary text-white rounded-2xl border-2 border-border shadow-sticker mx-auto flex items-center justify-center text-3xl mb-3">
            ✨
          </div>
          <h1 className="text-3xl font-heading font-black text-text tracking-tight">
            {t('auth.register')}
          </h1>
          <p className="text-xs text-text-muted font-bold">
            {t('tagline')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-brutal p-5 bg-surface space-y-4 shadow-sticker-lg">
          {error && (
            <div className="space-y-2">
              <div className="text-expense text-xs font-bold text-center bg-expense/10 border border-expense p-2.5 rounded-xl">
                {error}
              </div>
              <button
                type="button"
                onClick={handleDemo}
                className="w-full text-center text-xs font-heading font-black text-primary underline hover:opacity-80 py-1"
              >
                Or enter interactive dashboard directly as Guest →
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1">
              {t('auth.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nirbhay, Sneha"
              className="input-brutal text-sm"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className="input-brutal text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-brutal text-sm pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading}
            className="btn-brutal w-full py-3.5 text-base font-heading font-black shadow-sticker-lg bg-primary text-white"
          >
            {loading ? t('common.loading') : t('auth.register_btn')}
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border/50"></div>
            <span className="flex-shrink mx-3 text-[10px] font-heading font-bold text-text-muted uppercase">or</span>
            <div className="flex-grow border-t border-border/50"></div>
          </div>

          <button
            type="button"
            disabled={loading || demoLoading}
            onClick={handleDemo}
            className="btn-brutal-secondary w-full py-2.5 text-xs font-heading font-black border-2 border-border bg-highlight text-text shadow-sticker flex items-center justify-center gap-2 hover:bg-highlight/80 transition-all"
          >
            <span>⚡ {demoLoading ? 'Launching...' : 'Explore Interactive Dashboard (Guest Mode)'}</span>
          </button>
        </form>

        <p className="text-center text-xs font-bold text-text-muted">
          {t('auth.have_account')}{' '}
          <Link to="/login" className="text-primary underline font-black">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
