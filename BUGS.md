# Bug Audit & Resolution Report (Update 3)

### Bug 1: Sign-in & Authentication State Persistence
- **Symptoms**: Page reload loops between `/` and `/login`, token clearing on unhandled catches, double submissions on button clicks, no "Forgot Password" or "Show Password" toggles.
- **Root Cause**:
  1. `api.js` had an overly aggressive response interceptor wiping `localStorage.getItem('pb_token')` on any 401 or network hiccup.
  2. `LoginPage.jsx` did not persist user state synchronously before redirecting.
  3. No rate-limited forgot password flow with console dev-link fallback existed.
- **Fix**:
  1. Refactored `api.js` request interceptor to dynamically inject the bearer token from `localStorage`.
  2. Persisted `pb_user` directly alongside `pb_token` in `localStorage` for zero-flicker reloads.
  3. Implemented token-based forgot password & password reset (`/api/auth/forgot-password`, `/api/auth/reset-password`).
  4. Added show/hide password toggle (Eye/EyeOff icon) on all auth forms and disabled buttons during submission.
  5. Tested with automated unit test suite (`tests/auth.test.js`) covering login, register, refresh, invalid credentials, and password reset.

### Bug 2: Partial Language Translation & Missing Indian Locales
- **Symptoms**: Changing language only translated partial text; only 4 languages existed; missing ₹ Indian numbering grouping (lakh/crore).
- **Root Cause**: Translation files only had high-level headings, lacked 8 major Indian languages, and had no automated test enforcing parity with English reference keys.
- **Fix**:
  1. Expanded to all 12 required languages: English, Hindi, Hinglish (Roman), Punjabi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, and Urdu.
  2. Added dynamic `dir="rtl"` layout mirroring and `rtl-layout` class for Urdu (`ur`).
  3. Updated `format.js` with `Intl.NumberFormat` localized per script (₹, lakh/crore commas).
  4. Created `frontend/scripts/test-i18n.cjs` verifying 100% key parity (254 keys across all 12 languages).

### Bug 3: Pocket Money History Rewriting & Incomplete Profile Editing
- **Symptoms**: Changing monthly pocket money rewrote historical months' budgets; avatar and email updates were not versioned or validated; no confirmation guard on account deletion.
- **Root Cause**:
  1. User update query overwritten `monthly_income` in place without an audit log.
  2. Account deletion was immediate without a typed confirmation.
- **Fix**:
  1. Created `allowance_history` table in `002_update3.sql` tracking `(user_id, amount, frequency, arrival_date, effective_date, created_at)`.
  2. Updated `PUT /api/auth/me` to version changes with effective date `YYYY-MM-01`.
  3. Added photo compression (<2MB via HTML5 Canvas) + fun presets (🐼, 🦊, 🐱, 🦁, 🚀, 🤖, 🍕, ⚡).
  4. Added `DELETE /api/auth/account` requiring exact typed confirmation keyword `DELETE`.

### Bug 4: Obsolete Backup / JSON Controls
- **Symptoms**: Settings and Profile contained "Export JSON" and backup buttons that violated the new clean-slate SQL specification.
- **Root Cause**: Legacy routes from prototype remained in `settings.js` and `ProfilePage.jsx`.
- **Fix**: Removed all JSON export/import routes and UI controls. Retained only "Download My Data (CSV)" and permanent deletion.

### Bug 5: Navigation & Mobile Ergonomics
- **Symptoms**: 5 cramped tabs with Profile taking up bottom navigation space.
- **Root Cause**: Legacy bottom bar placed Profile in the primary tab list.
- **Fix**:
  1. Standardized bottom bar to 5 items: **Home | Activity | (+) | Split | Hub**.
  2. Moved Profile avatar to the top-right of the top navigation bar across all screens.
  3. Built Desktop Spotlight search command palette (`Cmd+K`).
