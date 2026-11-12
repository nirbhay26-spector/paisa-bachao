# Paise Bachao (पैसे बचाओ) 💰

> A student-friendly personal finance web app & installable PWA designed for teenagers, students, and young adults. Inspired by **FamPay**, **Walnut**, **Money Manager**, **Fold**, and **Splitwise**.

---

## ⚡ What's New & Core Principles

1. **Real Database, Purely Your Own Data (Zero Seeds)**:
   - **No fake data, no demo users, no pre-populated expenses.**
   - A fresh signup starts completely **EMPTY** (zero balance, zero transactions, empty charts with friendly empty states).
   - Every entry is stored permanently in a real SQL database (`backend/data/paisa-bachao.db`).
   - **Strict Multi-Tenant Isolation**: Every query filters by `user_id`. No user can ever see or train on another user's data.
   - **MockBankProvider is OFF by default**. If enabled from Settings, it displays a prominent `"SAMPLE DATA"` badge and can be cleared in one tap without mixing into your real insights.

2. **Gen-Z Neo-Brutalist Sticker Aesthetic**:
   - Chunky rounded cards (22px), thick 2px borders, bold offset shadows (`4px 4px 0px #1B1B2F`), sticker icons slightly tilted on hover, and oversized numbers.
   - **5 Themeable Styles (CSS Variables)**:
     - 🥭 **Mango Pop** (Default): `#FFF4D6` bg, `#FF5C8A` hot pink, `#7C5CFF` grape, `#C6F432` lime
     - 💜 **Lo-fi Lavender**: `#EDE7FF` bg, `#6C4CF1` purple, `#FF9ECD` pink
     - 🕹️ **Midnight Arcade** (Dark): `#0E0B1F` bg, `#00E5C3` neon cyan, `#FF4FA3` magenta
     - 🍵 **Matcha Chill**: `#E6F4E1` bg, `#2F8F5B` forest green, `#FF8A4C` warm orange
     - 🌅 **Sunset Street**: `#FFE3D3` bg, `#FF6B35` sunset orange, `#3A86FF` electric blue
   - **Interactive Money Mood Mascot**: Avatar expressions (😎 *Calm*, 🥳 *Proud*, 😬 *Nervous*, 😱 *Panicking*) with kind one-liners that adapt live to your budget health.
   - **Weekly Check-in**: Sunday mood picker (*Great*, *Okay*, *Stressed*, *Broke*).
   - **Spending Wrapped**: Story-style swipeable weekly recap cards.
   - **Undo Snackbar**: 5-second undo toast after deleting an expense.

3. **FamPay-Feel Quick Entry (< 5 seconds)**:
   - Big amount first, category sticker chips, payment method toggles, and 50/30/20 tag selector.
   - **Voice Entry** via Web Speech API (`"120 chai at canteen"`).
   - **User's Own Quick-Add Chips**: Dynamically generated from your own most frequent expenses (starts empty).

4. **Personal Insights & Baseline Engine**:
   - **Baseline Rule**: "Usual spending" = rolling average per category over the previous 4 weeks. Does **NOT** claim a baseline until there are at least 14 days of data (shows pacing against pocket money instead).
   - **Overspend Detection**: Flags a category if spend is > 30% above your baseline **AND** > ₹200 difference.
   - **Live Safe-to-Spend**: `(money left until next pocket money date) / (days left)`.
   - **Patterns Detected**: Impulse clusters (3+ wants in 48h), late-night spending (>10 PM), and repeated small spends (canteen/chai).

---

## 🖥️ Setup & Run Instructions for Windows & Mac

### Prerequisites
- Node.js (v18 or higher): Download from [nodejs.org](https://nodejs.org/)
- npm (comes with Node)

---

### Running on Windows (PowerShell or Command Prompt)

#### 1. Open Terminal 1 — Start Backend
```powershell
cd "paisa-bachao\backend"
npm install
npm start
```
> Server runs at `http://localhost:3001` with SQLite active.

#### 2. Open Terminal 2 — Start Frontend
```powershell
cd "paisa-bachao\frontend"
npm install
npm run dev
```
> Vite PWA runs at `http://localhost:5173`. Open in your browser or install as a PWA!

---

### Running on Mac / Linux
```bash
# Terminal 1: Backend
cd paisa-bachao/backend
npm install
npm start

# Terminal 2: Frontend
cd paisa-bachao/frontend
npm install
npm run dev
```

---

## 🔍 How to Inspect Your SQLite Database File

The database is stored locally in:
```
backend/data/paisa-bachao.db
```

To view, browse, or query your actual database tables:
1. **DB Browser for SQLite (Recommended Free Tool)**:
   - Download from [sqlitebrowser.org](https://sqlitebrowser.org/).
   - Click **Open Database** and select `backend/data/paisa-bachao.db`.
   - Go to **Browse Data** to view tables (`users`, `transactions`, `budgets`, `goals`, `question_prompts`, `merchant_rules`).
2. **VS Code SQLite Extension**:
   - Install the extension `SQLite Viewer` or `vscode-sqlite` in VS Code.
   - Click on `paisa-bachao.db` to explore tables visually inside your editor.

---

## 🧪 Running Automated Unit Tests

In `backend/`:
```bash
npm test
```
Runs 12 unit tests:
- Multi-tenant user data isolation test
- Rolling 4-week baseline & overspend detection test (>30% & >₹200)
- Safe-to-spend formula & allowance cycle calculation test
- Indian bank SMS parser test (SBI, HDFC, ICICI)
- Expense and email validators test

---

## 🚀 Free Deployment Guide

### Frontend (Vercel / Netlify)
1. Push repository to GitHub.
2. In Vercel, set **Root Directory** to `frontend`.
3. Build Command: `npm run build`, Output Directory: `dist`.
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`.

### Backend (Render / Railway / Supabase)
1. In Render, create a **Web Service** with root directory `backend`.
2. Build Command: `npm install`, Start Command: `npm start`.
3. Set environment variables from `.env.example`.
4. *To switch to Supabase/PostgreSQL later*: Replace `backend/src/utils/db.js` with the Postgres/Prisma connection string.
