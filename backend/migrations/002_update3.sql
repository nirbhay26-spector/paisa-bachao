-- Update 3: Password Resets, Allowance History, Goal Jars, Subscriptions, Groups & Avatars

-- 1. Add avatar to users if not present
-- (SQLite supports ALTER TABLE ADD COLUMN)
-- We wrap in pragma / safe check or try-catch in JS if needed.

CREATE TABLE IF NOT EXISTS allowance_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK(amount >= 0),
  frequency TEXT DEFAULT 'monthly',
  arrival_date TEXT DEFAULT '1',
  effective_date TEXT NOT NULL, -- "YYYY-MM-DD"
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_allowance_user_date ON allowance_history(user_id, effective_date);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

CREATE TABLE IF NOT EXISTS split_groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '👥',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_split_groups_user ON split_groups(user_id);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  upi_id TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS group_expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
  payer_name TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  description TEXT NOT NULL,
  split_type TEXT DEFAULT 'equal' CHECK(split_type IN ('equal', 'exact', 'percentage', 'shares')),
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_group_expenses_group ON group_expenses(group_id);

CREATE TABLE IF NOT EXISTS group_expense_shares (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  share_amount REAL NOT NULL,
  is_settled INTEGER DEFAULT 0,
  settled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_group_shares_expense ON group_expense_shares(expense_id);

CREATE TABLE IF NOT EXISTS goal_jars (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#FF5C8A',
  target_amount REAL NOT NULL CHECK(target_amount > 0),
  current_amount REAL DEFAULT 0,
  target_date TEXT,
  round_up_enabled INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goal_jars_user ON goal_jars(user_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  billing_cycle TEXT DEFAULT 'monthly' CHECK(billing_cycle IN ('weekly','monthly','quarterly','yearly')),
  next_billing_date TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','cancelled')),
  reminder_days INTEGER DEFAULT 2,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

