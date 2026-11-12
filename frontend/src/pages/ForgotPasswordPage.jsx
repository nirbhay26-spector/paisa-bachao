import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'Reset link generated!');
      if (res.data.dev_link) {
        setDevLink(res.data.dev_link);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request reset link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-bg">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-highlight rounded-2xl border-2 border-border shadow-sticker mx-auto flex items-center justify-center text-3xl mb-3">
            <KeyRound size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-black text-text tracking-tight">
            {t('auth.forgot_password')}
          </h1>
          <p className="text-xs text-text-muted font-bold">
            Enter your account email to receive a password reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-brutal p-5 bg-surface space-y-4 shadow-sticker-lg">
          {error && (
            <div className="text-expense text-xs font-bold text-center bg-expense/10 border border-expense p-2.5 rounded-xl">
              {error}
            </div>
          )}

          {message && (
            <div className="text-income text-xs font-bold bg-income/10 border border-income p-3 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{message}</span>
              </div>
              {devLink && (
                <div className="pt-2 border-t border-income/30">
                  <p className="text-[11px] text-text-muted mb-1 font-mono">Dev Test Link:</p>
                  <a
                    href={devLink}
                    className="text-primary font-black underline text-xs break-all"
                  >
                    Click to Open Reset Page →
                  </a>
                </div>
              )}
            </div>
          )}

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
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-brutal w-full py-3.5 text-sm font-heading font-black shadow-sticker-lg bg-primary text-white"
          >
            {loading ? t('common.loading') : t('auth.send_reset_link')}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-text-muted hover:text-text"
          >
            <ArrowLeft size={14} />
            <span>{t('auth.back_to_login')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

