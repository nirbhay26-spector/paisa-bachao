const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', icon: 'UtensilsCrossed', color: '#FF5C8A', sort: 0 },
  { id: 'snacks', name: 'Chai & Snacks', icon: 'Coffee', color: '#E8A317', sort: 1 },
  { id: 'travel', name: 'Travel & Metro', icon: 'Bus', color: '#7C5CFF', sort: 2 },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#C6F432', sort: 3 },
  { id: 'education', name: 'College & Books', icon: 'GraduationCap', color: '#19B37A', sort: 4 },
  { id: 'fun', name: 'Outings & Fun', icon: 'Gamepad2', color: '#FF4D4D', sort: 5 },
  { id: 'bills', name: 'Recharge & Bills', icon: 'Smartphone', color: '#3A86FF', sort: 6 },
  { id: 'subs', name: 'Subscriptions', icon: 'RefreshCw', color: '#9B59B6', sort: 7 },
  { id: 'savings', name: 'Savings Goal', icon: 'PiggyBank', color: '#2F8F5B', sort: 8 },
  { id: 'other', name: 'Other', icon: 'MoreHorizontal', color: '#6B746E', sort: 9 },
];

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userTokenData = decoded;

    // Self-healing serverless database sync:
    // If a request lands on a serverless container where the SQLite in-memory/tmp database
    // was wiped or freshly spun up, automatically re-provision the user record so queries never 404 or fail!
    const db = req.app?.locals?.db;
    if (db && req.userId) {
      try {
        const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
        if (!existing) {
          const now = new Date().toISOString();
          const email = decoded.email || `${req.userId.slice(0, 8)}@student.pb`;
          const name = decoded.name || 'Friend';
          const income = decoded.monthly_income || 3000;
          const theme = decoded.theme || 'mango_pop';

          db.prepare(`
            INSERT OR IGNORE INTO users (id, email, password_hash, name, monthly_income, income_frequency, income_arrival_date, savings_goal, currency, language, theme, onboarding_done, sample_data_enabled, created_at, updated_at)
            VALUES (?, ?, 'ephemeral-session', ?, ?, 'monthly', '1', 500, 'INR', 'en', ?, 1, 0, ?, ?)
          `).run(req.userId, email, name, income, theme, now, now);

          db.prepare(`INSERT OR IGNORE INTO accounts (id, user_id, name, type, balance, is_default, created_at) VALUES (?, ?, 'UPI / Bank', 'upi', ?, 1, ?)`).run(crypto.randomUUID(), req.userId, income, now);
          db.prepare(`INSERT OR IGNORE INTO accounts (id, user_id, name, type, balance, is_default, created_at) VALUES (?, ?, 'Cash Wallet', 'cash', 0, 0, ?)`).run(crypto.randomUUID(), req.userId, now);

          for (const cat of DEFAULT_CATEGORIES) {
            db.prepare(`
              INSERT OR IGNORE INTO categories (id, user_id, name, icon, color, is_custom, sort_order)
              VALUES (?, ?, ?, ?, ?, 0, ?)
            `).run(`${cat.id}_${req.userId.slice(0, 8)}`, req.userId, cat.name, cat.icon, cat.color, cat.sort);
          }
        }
      } catch (dbErr) {
        // Non-fatal, let route proceed
        console.warn('Auto-provisioning check notice:', dbErr.message);
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function generateToken(userOrId) {
  let payload = {};
  if (typeof userOrId === 'string') {
    payload = { userId: userOrId };
  } else if (userOrId && typeof userOrId === 'object') {
    payload = {
      userId: userOrId.id,
      email: userOrId.email,
      name: userOrId.name,
      monthly_income: userOrId.monthly_income,
      theme: userOrId.theme,
      onboarding_done: userOrId.onboarding_done
    };
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { authMiddleware, generateToken };
