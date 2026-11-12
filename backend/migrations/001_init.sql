-- Paise Bachao Database Schema (Strict Multi-Tenant Isolation)
-- All IDs are UUID strings; all dates are ISO 8601 strings.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  monthly_income REAL DEFAULT 0,
  income_frequency TEXT DEFAULT 'monthly' CHECK(income_frequency IN ('monthly','weekly','irregular')),
  income_arrival_date TEXT DEFAULT '1', -- day of month (e.g. "1") or day of week ("monday")
  savings_goal REAL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  language TEXT DEFAULT 'en',
  pin_hash TEXT,
  theme TEXT DEFAULT 'mango_pop',
  onboarding_done INTEGER DEFAULT 0,
  sample_data_enabled INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('cash','upi','bank','wallet')),
  balance REAL DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Circle',
  color TEXT NOT NULL DEFAULT '#FF5C8A',
  is_custom INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  payment_method TEXT DEFAULT 'upi' CHECK(payment_method IN ('upi','cash','card','wallet')),
  date TEXT NOT NULL,
  note TEXT DEFAULT '',
  merchant TEXT DEFAULT '',
  tag TEXT CHECK(tag IS NULL OR tag IN ('need','want','savings')),
  is_recurring INTEGER DEFAULT 0,
  recurrence_rule TEXT,
  attachment_path TEXT,
  bank_ref TEXT,
  is_sample INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- View/Alias to support queries named either expenses or transactions
CREATE VIEW IF NOT EXISTS expenses AS
  SELECT * FROM transactions WHERE is_deleted = 0;

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK(amount > 0),
  period TEXT DEFAULT 'monthly' CHECK(period IN ('monthly','weekly')),
  start_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL CHECK(target_amount > 0),
  current_amount REAL DEFAULT 0,
  deadline TEXT,
  is_completed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'need_want' CHECK(question_type IN ('need_want','social','impulse','worth_it','category')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','answered','skipped')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_answers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES question_prompts(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  answer_value TEXT NOT NULL,
  tag TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS merchant_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_pattern TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  tag TEXT CHECK(tag IS NULL OR tag IN ('need','want','savings')),
  UNIQUE(user_id, merchant_pattern)
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS insights_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'overspend', 'impulse', 'late_night', 'chai_repeat', 'pacing', 'runout'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action TEXT,
  data_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  mood TEXT NOT NULL CHECK(mood IN ('great','okay','stressed','broke')),
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, week_start)
);

CREATE TABLE IF NOT EXISTS gamification (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  UNIQUE(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS splits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount REAL NOT NULL CHECK(total_amount > 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS split_members (
  id TEXT PRIMARY KEY,
  split_id TEXT NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_owed REAL NOT NULL,
  is_paid INTEGER DEFAULT 0
);

-- Performance & Isolation Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_sample ON transactions(user_id, is_sample);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_status ON question_prompts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_merchant_rules_user ON merchant_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_user ON insights_log(user_id);
