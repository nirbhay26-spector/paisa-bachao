import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import {
  Palette,
  FileSpreadsheet,
  Trash2,
  LogOut,
  Check,
  Edit2,
  X,
  Save,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n';

const AVATAR_PRESETS = ['🐼', '🦊', '🐱', '🦁', '🚀', '🤖', '🍕', '⚡'];

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const { theme, setTheme, themes, customColors, setCustomTheme, getContrastRatio, isWcagAA } = useTheme();
  const navigate = useNavigate();

  // Edit Profile Modal
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editIncome, setEditIncome] = useState(user?.monthly_income !== undefined ? String(user.monthly_income) : '');
  const [editFrequency, setEditFrequency] = useState(user?.income_frequency || 'monthly');
  const [editArrivalDate, setEditArrivalDate] = useState(user?.income_arrival_date || '1');
  const [editSavingsGoal, setEditSavingsGoal] = useState(user?.savings_goal !== undefined ? String(user.savings_goal) : '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '🐼');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Email Change Modal
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Delete Account Confirmation Modal
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Custom Theme Generator State
  const [showCustomTheme, setShowCustomTheme] = useState(false);
  const [customPrimary, setCustomPrimary] = useState(customColors?.primary || '#FF5C8A');
  const [customBg, setCustomBg] = useState(customColors?.bg || '#FFF4D6');

  const fileInputRef = useRef(null);

  function openEditModal() {
    setEditName(user?.name || '');
    setEditIncome(user?.monthly_income !== undefined ? String(user.monthly_income) : '');
    setEditFrequency(user?.income_frequency || 'monthly');
    setEditArrivalDate(user?.income_arrival_date || '1');
    setEditSavingsGoal(user?.savings_goal !== undefined ? String(user.savings_goal) : '');
    setEditAvatar(user?.avatar || '🐼');
    setSaveError('');
    setIsEditing(true);
  }

  // Handle Photo Upload with HTML5 Canvas Compression (<2MB limit)
  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setEditAvatar(compressedDataUrl);
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(e) {
    if (e) e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      await updateProfile({
        name: editName.trim() || user?.name || 'Friend',
        monthly_income: parseFloat(editIncome) || 0,
        income_frequency: editFrequency,
        income_arrival_date: editArrivalDate,
        savings_goal: parseFloat(editSavingsGoal) || 0,
        avatar: editAvatar,
        onboarding_done: 1,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSaveError(err.response?.data?.error || 'Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    setEmailSaving(true);
    try {
      const res = await api.put('/auth/email', {
        new_email: newEmail,
        current_password: currentPassword
      });
      setEmailSuccess(res.data.message || 'Email updated successfully!');
      setTimeout(() => {
        setIsChangingEmail(false);
        setEmailSuccess('');
        setNewEmail('');
        setCurrentPassword('');
      }, 1500);
    } catch (err) {
      setEmailError(err.response?.data?.error || 'Failed to update email');
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE exactly to confirm.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete('/auth/account', {
        data: { confirmation: 'DELETE' }
      });
      logout();
      navigate('/register');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account');
      setDeleteLoading(false);
    }
  }

  function handleExportCSV() {
    const token = localStorage.getItem('pb_token');
    window.open(`${api.defaults.baseURL}/export/csv?token=${token}`, '_blank');
  }

  const contrast = getContrastRatio(customPrimary, customBg);
  const passesWcag = isWcagAA(customPrimary, customBg);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="card-brutal p-3 bg-highlight text-text border-2 border-border shadow-sticker flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-income" />
            <p className="text-xs font-heading font-black">
              Profile, avatar & allowance version saved to database!
            </p>
          </div>
          <button onClick={() => setSaveSuccess(false)} className="text-xs font-bold">✕</button>
        </div>
      )}

      {/* User Header Card */}
      <div className="card-brutal p-4 bg-surface border-2 border-border shadow-sticker flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl border-2 border-border bg-highlight shadow-sticker flex items-center justify-center text-3xl overflow-hidden shrink-0">
            {user?.avatar?.startsWith('data:') ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.avatar || '🐼'}</span>
            )}
          </div>
          <div>
            <h1 className="font-heading font-black text-base text-text">
              {user?.name || 'Friend'}
            </h1>
            <p className="text-xs text-text-muted font-medium">{user?.email}</p>
            <p className="text-[11px] font-bold text-primary mt-0.5">
              Pocket Money: ₹{((user?.monthly_income) || 0).toLocaleString('en-IN')} / {user?.income_frequency || 'month'}
            </p>
          </div>
        </div>

        <button
          onClick={openEditModal}
          className="btn-brutal py-1.5 px-3.5 text-xs font-heading font-black flex items-center gap-1.5 bg-primary text-white"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-md bg-surface border-3 border-border shadow-sticker-lg overflow-hidden animate-scale-in">
            <div className="p-4 bg-primary text-white border-b-2 border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h2 className="text-base font-heading font-black">Edit Profile & Allowance</h2>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="w-8 h-8 rounded-xl bg-white text-text border-2 border-border shadow-sticker flex items-center justify-center hover:bg-highlight font-bold"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {saveError && (
                <div className="text-expense text-xs font-bold text-center bg-expense/10 border border-expense p-2 rounded-xl">
                  {saveError}
                </div>
              )}

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                  Choose Your Avatar
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {AVATAR_PRESETS.map((av) => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setEditAvatar(av)}
                      className={`w-10 h-10 rounded-xl border-2 text-xl flex items-center justify-center transition-all shrink-0 ${
                        editAvatar === av
                          ? 'border-border bg-highlight shadow-sticker scale-105'
                          : 'border-border/50 bg-bg hover:bg-surface'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl border-2 border-dashed border-border bg-bg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface shrink-0"
                    title="Upload custom photo (<2MB)"
                  >
                    <Camera size={16} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1">
                  Your Name / Nickname
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Nirbhay"
                  className="input-brutal text-sm py-2 px-3"
                  required
                />
              </div>

              {/* Pocket Money */}
              <div>
                <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1">
                  Pocket Money / Allowance (₹)
                </label>
                <input
                  type="number"
                  value={editIncome}
                  onChange={(e) => setEditIncome(e.target.value)}
                  placeholder="e.g. 3500"
                  className="input-brutal text-lg font-heading font-black text-primary py-2 px-3"
                  required
                />
                <p className="text-[10px] text-text-muted mt-1">
                  💡 Changing pocket money versions your history — past months keep their original budget!
                </p>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                  How often does it arrive?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'monthly', label: 'Monthly' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'irregular', label: 'Irregular' }
                  ].map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => setEditFrequency(f.id)}
                      className={`py-2 rounded-xl border-2 text-xs font-heading font-bold transition-all ${
                        editFrequency === f.id
                          ? 'bg-primary text-white border-border shadow-sticker'
                          : 'bg-bg text-text border-border/60 hover:bg-surface'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of Month */}
              {editFrequency === 'monthly' && (
                <div>
                  <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1">
                    Day of month it usually arrives
                  </label>
                  <select
                    value={editArrivalDate}
                    onChange={(e) => setEditArrivalDate(e.target.value)}
                    className="input-brutal text-xs py-2 px-3"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>
                        {d}st / {d}th of the month
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Savings Goal Target */}
              <div>
                <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-text-muted mb-1">
                  Monthly Savings Goal Target (₹)
                </label>
                <input
                  type="number"
                  value={editSavingsGoal}
                  onChange={(e) => setEditSavingsGoal(e.target.value)}
                  placeholder="e.g. 500"
                  className="input-brutal text-sm py-2 px-3"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-brutal-secondary py-2.5 px-4 text-xs font-heading font-bold flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-brutal py-2.5 px-4 text-xs font-heading font-black flex-1 flex items-center justify-center gap-1.5"
                >
                  <Save size={14} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Theme Picker Card (8 Preset Palettes + Custom 2-Color Generator) */}
      <div className="card-brutal p-4 bg-surface border-2 border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-primary" />
            <h2 className="text-xs font-heading font-black uppercase tracking-wider text-text">
              8 Gen-Z Themes
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomTheme(!showCustomTheme)}
            className="text-[11px] font-heading font-bold text-primary flex items-center gap-1 hover:underline"
          >
            <Sliders size={12} />
            <span>Custom Generator</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {themes.map((th) => (
            <button
              type="button"
              key={th.id}
              onClick={() => {
                setTheme(th.id);
                updateProfile({ theme: th.id });
              }}
              className={`p-2.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                theme === th.id
                  ? 'border-border bg-highlight shadow-sticker font-bold ring-2 ring-primary'
                  : 'border-border/60 bg-bg text-text font-medium'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: th.dot }} />
                <span className="text-xs font-heading font-bold">{th.name}</span>
              </div>
              {theme === th.id && <Check size={14} className="text-primary" />}
            </button>
          ))}
        </div>

        {/* Custom 2-Color Generator with WCAG AA Check */}
        {showCustomTheme && (
          <div className="p-3 bg-bg rounded-xl border-2 border-border space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text">
                Custom 2-Color Palette
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                passesWcag ? 'bg-income/20 text-income border-income' : 'bg-expense/20 text-expense border-expense'
              }`}>
                {passesWcag ? `WCAG AA Pass (${contrast.toFixed(1)}:1)` : `Low Contrast (${contrast.toFixed(1)}:1)`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-text-muted mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border"
                  />
                  <span className="font-mono text-xs">{customPrimary}</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-text-muted mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border"
                  />
                  <span className="font-mono text-xs">{customBg}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCustomTheme(customPrimary, customBg)}
              className="btn-brutal w-full py-2 text-xs font-heading font-black bg-primary text-white"
            >
              Apply Custom Theme
            </button>
          </div>
        )}
      </div>

      {/* Language Switcher (12 Languages) */}
      <div className="card-brutal p-4 bg-surface border-2 border-border space-y-3">
        <h2 className="text-xs font-heading font-black uppercase tracking-wider text-text">
          Language / भाषा ({SUPPORTED_LANGUAGES.length} Languages)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              type="button"
              key={l.code}
              onClick={() => {
                i18n.changeLanguage(l.code);
                updateProfile({ language: l.code });
              }}
              className={`p-2 rounded-xl border-2 text-xs font-bold flex items-center justify-between ${
                i18n.language === l.code
                  ? 'border-border bg-highlight shadow-sticker text-text'
                  : 'border-border/60 bg-bg text-text-muted'
              }`}
            >
              <span>{l.native}</span>
              {i18n.language === l.code && <Check size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Account Security & Email Change */}
      <div className="card-brutal p-4 bg-surface border-2 border-border space-y-2.5">
        <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text flex items-center gap-1.5">
          <KeyRound size={14} className="text-primary" />
          <span>Security & Email</span>
        </h3>
        <button
          onClick={() => setIsChangingEmail(true)}
          className="btn-brutal-secondary w-full py-2.5 text-xs font-heading font-bold"
        >
          Change Account Email
        </button>
      </div>

      {/* Change Email Modal */}
      {isChangingEmail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-sm bg-surface border-3 border-border shadow-sticker-lg p-4 space-y-3 animate-scale-in">
            <div className="flex items-center justify-between border-b-2 border-border pb-2">
              <h3 className="text-sm font-heading font-black text-text">Change Email Address</h3>
              <button onClick={() => setIsChangingEmail(false)} className="text-text font-bold">✕</button>
            </div>

            {emailError && (
              <div className="text-expense text-xs font-bold bg-expense/10 border border-expense p-2 rounded-xl">
                {emailError}
              </div>
            )}
            {emailSuccess && (
              <div className="text-income text-xs font-bold bg-income/10 border border-income p-2 rounded-xl">
                {emailSuccess}
              </div>
            )}

            <form onSubmit={handleChangeEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">New Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  className="input-brutal text-xs py-2 px-3"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-brutal text-xs py-2 px-3"
                  required
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsChangingEmail(false)}
                  className="btn-brutal-secondary py-2 text-xs flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailSaving}
                  className="btn-brutal py-2 text-xs font-black flex-1 bg-primary text-white"
                >
                  {emailSaving ? 'Updating...' : 'Update Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data Export (CSV Only - JSON Removed) */}
      <div className="card-brutal p-4 bg-surface border-2 border-border space-y-2.5">
        <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text">
          Data Export & Transparency
        </h3>
        <button
          onClick={handleExportCSV}
          className="btn-brutal-secondary w-full py-2.5 text-xs font-heading font-bold flex items-center justify-center gap-1.5"
        >
          <FileSpreadsheet size={15} />
          <span>Download My Data (CSV)</span>
        </button>
      </div>

      {/* Sign Out & Permanent Account Deletion */}
      <div className="space-y-2 pt-2">
        <button
          onClick={logout}
          className="btn-brutal-secondary w-full py-3 text-sm font-heading font-bold flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          <span>{t('auth.logout')}</span>
        </button>

        <button
          onClick={() => setIsDeleting(true)}
          className="w-full py-2.5 text-xs font-heading font-extrabold text-expense hover:underline flex items-center justify-center gap-1.5"
        >
          <Trash2 size={14} />
          <span>Delete my account & all data permanently</span>
        </button>
      </div>

      {/* Delete Confirmation Modal (Type DELETE) */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-sm bg-surface border-3 border-expense shadow-sticker-lg p-5 space-y-4 animate-scale-in">
            <div className="w-12 h-12 bg-expense/10 text-expense rounded-2xl border-2 border-expense flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-heading font-black text-expense">Delete Account Permanently</h3>
              <p className="text-xs text-text-muted">
                This will instantly delete every expense, category, split, jar, and record from the SQL database. This action CANNOT be undone.
              </p>
            </div>

            {deleteError && (
              <div className="text-expense text-xs font-bold bg-expense/10 border border-expense p-2 rounded-xl text-center">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-heading font-extrabold uppercase tracking-wider text-text mb-1">
                Type <span className="text-expense font-black font-mono">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="input-brutal text-sm py-2 px-3 uppercase text-center font-black tracking-widest text-expense"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleting(false);
                  setDeleteConfirmation('');
                  setDeleteError('');
                }}
                className="btn-brutal-secondary py-2.5 text-xs font-heading font-bold flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmation !== 'DELETE' || deleteLoading}
                onClick={handleDeleteAccount}
                className="btn-brutal py-2.5 text-xs font-heading font-black flex-1 bg-expense text-white border-expense disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
