import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Please request a new link.');
      return;
    }
    if (password.length < 6) {
      setError(t('auth.error_short_password') || 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-bg">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-income/20 text-income rounded-2xl border-2 border-border shadow-sticker mx-auto flex items-center justify-center text-3xl mb-3">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-heading font-black text-text tracking-tight">
            {t('auth.reset_password')}
          </h1>
          <p className="text-xs text-text-muted font-bold">
            Choose a strong new password for your account
          </p>
        </div>

        {success ? (
          <div className="card-brutal p-6 bg-surface text-center space-y-3 shadow-sticker-lg">
            <CheckCircle2 size={36} className="text-income mx-auto" />
            <h2 className="text-base font-heading font-black text-text">Password Reset Complete!</h2>
            <p className="text-xs text-text-muted font-medium">Redirecting you to sign in...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-brutal p-5 bg-surface space-y-4 shadow-sticker-lg">
            {error && (
              <div className="text-expense text-xs font-bold text-center bg-expense/10 border border-expense p-2.5 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1">
                {t('auth.new_password')}
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

            <div>
              <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1">
                {t('auth.confirm_password')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input-brutal text-sm"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-brutal w-full py-3.5 text-sm font-heading font-black shadow-sticker-lg bg-primary text-white"
            >
              {loading ? t('common.loading') : t('auth.reset_btn')}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link
            to="/login"
            className="text-xs font-heading font-bold text-text-muted hover:text-text underline"
          >
            {t('auth.back_to_login')}
          </Link>
        </div>
      </div>
    </div>
  );
}

