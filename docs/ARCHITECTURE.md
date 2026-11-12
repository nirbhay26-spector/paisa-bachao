# Paise Bachao — Architecture Guide (For a First-Year Student) 🎓

Welcome! If you are learning web development or building your first full-stack application, this guide explains how **Paise Bachao** works from the inside out — using real-world analogies.

---

## 1. The Big Picture: How the App Works

Imagine a restaurant:
- **The Customer (You/User)**: Interacts with the visual menu and makes requests.
- **The Waiter (Frontend - React + Vite + PWA)**: Takes your orders quickly (in under 5 seconds!), confirms what you want, shows your food status, and stores your offline preferences in a pocket notebook.
- **The Kitchen (Backend - Node.js + Express)**: Prepares the actual calculations, runs security checks (hashes passwords), and figures out who owes what.
- **The Pantry / Storage (Database - SQLite / sql.js)**: Where all your expenses, goals, budgets, and receipts are safely kept in organized shelves (tables).

```
[ PWA / React Browser App ]
         │
         │ HTTP / JSON (REST API) + JWT Token
         ▼
[ Express.js Backend Server (Port 3001) ]
   ├── Auth Middleware (JWT & bcrypt)
   ├── Smart Question Engine
   ├── SMS & CSV Regex Parsers
   └── Bank Provider Interface (Mock / Setu AA)
         │
         ▼
[ SQLite Database (paisa-bachao.db) ]
```

---

## 2. Core Concepts Explained Simply

### A. Progressive Web App (PWA)
Instead of forcing you to download a 100MB app from an app store, Paise Bachao is a **PWA**.
- It opens instantly in your browser (Chrome/Safari).
- You can tap **"Add to Home Screen"** and it gets its own icon on your mobile phone, opens fullscreen without browser bars, and feels like a native Android/iOS app.
- A **Service Worker** acts like a mini-caching proxy: it stores app assets so it opens even when you're in a college basement with zero mobile signal.

### B. The 5-Second Expense Entry Flow (FamPay Style)
Accounting tools are boring because they ask for 15 form fields before you can save a ₹20 chai.
Paise Bachao flips this:
1. **Amount first**: Focuses immediately on a big number pad (`₹`).
2. **Category chip**: One tap (`Food`, `Travel`, `Snacks & Cafe`).
3. **Save**: Done in under 5 seconds!
4. **Follow-up question**: If the app doesn't know whether Domino's was a "Need" or a "Want", it puts a short question in your **Pending Questions** inbox for later. It never blocks you!

### C. The 50/30/20 Rule
We tag expenses into three simple buckets:
- **Needs (50%)**: Bus passes, textbooks, medicine, essential meals.
- **Wants (30%)**: Weekend pizza, gaming, Starbucks, movies.
- **Savings (20%)**: Pocket money put away towards goals (e.g. new headphones).

### D. Smart Learning (Merchant Rules)
When you answer: *"Zomato is a Want"*, the app records a rule in the `merchant_rules` table. Next time you enter Zomato, the app auto-categorizes it as Food and tags it as a Want automatically!

### E. Account Aggregator (Bank Connection in India)
In India, RBI created the **Account Aggregator (AA)** system. It is a secure bridge where:
- Your bank sends read-only data directly through encrypted channels.
- **No passwords, No PINs, No card numbers** are ever asked or stored.
- For student development, we provide a **MockBankProvider** that simulates real UPI transactions (Swiggy, Amazon, Uber, Pocket money credits) and a **SetuAAProvider** ready for real sandbox credentials.

---

## 3. Directory Structure

```
paisa-bachao/
├── backend/
│   ├── src/
│   │   ├── app.js               # Server entry point
│   │   ├── routes/              # Express API endpoints (auth, expenses, budgets, etc.)
│   │   ├── middleware/          # JWT auth verification
│   │   ├── bank/                # BankProvider, MockBankProvider, SetuAAProvider
│   │   └── utils/               # smsParser, database helper
│   ├── migrations/              # SQL schema definitions
│   ├── seeds/                   # Realistic demo dataset (Aarav, 60+ expenses)
│   └── tests/                   # Automated unit tests
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router & layout
│   │   ├── pages/               # Home, Add, Transactions, Insights, Budgets, etc.
│   │   ├── contexts/            # AuthContext & ThemeContext
│   │   ├── i18n/                # English, Hindi, Punjabi, Bengali translations
│   │   └── components/          # Reusable UI widgets
│   ├── public/                  # PWA manifest, icons
│   └── vite.config.js           # Vite + PWA build configuration
└── shared/                      # Shared validators and constants
```

