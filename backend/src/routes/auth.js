const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authMiddleware, generateToken } = require('../middleware/auth');

function createAuthRouter(db) {
  const router = express.Router();

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

  router.post('/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const existing = db.prepare('SELECT id, onboarding_done FROM users WHERE email = ?').get(cleanEmail);
      const now = new Date().toISOString();

      if (existing) {
        const txnCount = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE user_id = ?').get(existing.id)?.c || 0;
        if (existing.onboarding_done && txnCount > 0) {
          return res.status(409).json({ error: 'An account with this email already exists. Please Sign In!' });
        }
        // Fresh or uncompleted account: update credentials and allow direct access!
        const passwordHash = await bcrypt.hash(password, 10);
        db.prepare('UPDATE users SET password_hash = ?, name = COALESCE(NULLIF(?, ""), name), updated_at = ? WHERE id = ?')
          .run(passwordHash, (name || '').trim(), now, existing.id);
        const token = generateToken(existing.id);
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
        delete user.password_hash;
        delete user.pin_hash;
        return res.status(200).json({ token, user, message: 'Welcome back! Account ready.' });
      }

      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);

      // Create empty user
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, monthly_income, income_frequency, income_arrival_date, savings_goal, currency, language, theme, onboarding_done, sample_data_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, 'monthly', '1', 0, 'INR', 'en', 'mango_pop', 0, 0, ?, ?)
      `).run(userId, cleanEmail, passwordHash, (name || '').trim(), now, now);

      // Create default accounts
      db.prepare(`INSERT INTO accounts (id, user_id, name, type, balance, is_default, created_at) VALUES (?, ?, 'UPI / Bank', 'upi', 0, 1, ?)`).run(crypto.randomUUID(), userId, now);
      db.prepare(`INSERT INTO accounts (id, user_id, name, type, balance, is_default, created_at) VALUES (?, ?, 'Cash Wallet', 'cash', 0, 0, ?)`).run(crypto.randomUUID(), userId, now);

      // Create default category stickers
      const insertCat = db.prepare(`INSERT INTO categories (id, user_id, name, icon, color, is_custom, sort_order) VALUES (?, ?, ?, ?, ?, 0, ?)`);
      for (const cat of DEFAULT_CATEGORIES) {
        insertCat.run(`${cat.id}_${userId.slice(0, 8)}`, userId, cat.name, cat.icon, cat.color, cat.sort);
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      delete user.password_hash;
      delete user.pin_hash;
      const token = generateToken(user);

      res.status(201).json({ token, user });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  router.post('/demo', async (req, res) => {
    try {
      const demoEmail = 'student.demo@paisabachao.app';
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(demoEmail);
      const now = new Date().toISOString();
      if (!user) {
        const userId = crypto.randomUUID();
        const hash = await bcrypt.hash('demopass123', 10);
        db.prepare(`
          INSERT INTO users (id, email, password_hash, name, monthly_income, income_frequency, income_arrival_date, savings_goal, currency, language, theme, onboarding_done, sample_data_enabled, created_at, updated_at)
          VALUES (?, ?, ?, 'Student Explorer', 3500, 'monthly', '1', 500, 'INR', 'en', 'mango_pop', 1, 0, ?, ?)
        `).run(userId, demoEmail, hash, now, now);

        db.prepare(`INSERT INTO accounts (id, user_id, name, type, balance, is_default, created_at) VALUES (?, ?, 'UPI / Bank', 'upi', 1500, 1, ?)`).run(crypto.randomUUID(), userId, now);
        db.prepare(`INSERT INTO accounts (id, user_id, name, type, balance, is_default, created_at) VALUES (?, ?, 'Cash Wallet', 'cash', 500, 0, ?)`).run(crypto.randomUUID(), userId, now);

        const insertCat = db.prepare(`INSERT INTO categories (id, user_id, name, icon, color, is_custom, sort_order) VALUES (?, ?, ?, ?, ?, 0, ?)`);
        for (const cat of DEFAULT_CATEGORIES) {
          insertCat.run(`${cat.id}_${userId.slice(0, 8)}`, userId, cat.name, cat.icon, cat.color, cat.sort);
        }
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      }
      delete user.password_hash;
      delete user.pin_hash;
      const token = generateToken(user.id);
      res.json({ token, user, message: 'Welcome to Student Demo Mode!' });
    } catch (err) {
      console.error('Demo auth error:', err);
      res.status(500).json({ error: 'Failed to initialize demo mode' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const cleanEmail = email.toLowerCase().trim();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const token = generateToken(user.id);
      delete user.password_hash;
      delete user.pin_hash;
      res.json({ token, user });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.get('/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    delete user.password_hash;
    delete user.pin_hash;
    res.json(user);
  });

  router.put('/me', authMiddleware, (req, res) => {
    try {
      const { 
        name, monthly_income, income_frequency, income_arrival_date, 
        savings_goal, currency, language, theme, onboarding_done, avatar 
      } = req.body;
      const now = new Date().toISOString();

      const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
      if (!currentUser) return res.status(404).json({ error: 'User not found' });

      const updatedName = name !== undefined && name.trim() !== '' ? name.trim() : currentUser.name;
      const updatedIncome = monthly_income !== undefined && !isNaN(parseFloat(monthly_income)) ? parseFloat(monthly_income) : currentUser.monthly_income;
      const updatedFrequency = income_frequency || currentUser.income_frequency || 'monthly';
      const updatedArrival = income_arrival_date || currentUser.income_arrival_date || '1';
      const updatedGoal = savings_goal !== undefined && !isNaN(parseFloat(savings_goal)) ? parseFloat(savings_goal) : currentUser.savings_goal;
      const updatedCurrency = currency || currentUser.currency || 'INR';
      const updatedLanguage = language || currentUser.language || 'en';
      const updatedTheme = theme || currentUser.theme || 'mango_pop';
      const updatedOnboarding = onboarding_done !== undefined ? (onboarding_done ? 1 : 0) : currentUser.onboarding_done;
      const updatedAvatar = avatar !== undefined ? avatar : (currentUser.avatar || '🐼');

      // If pocket money changed or was never logged, record in allowance_history for historical accuracy
      if (monthly_income !== undefined && parseFloat(monthly_income) !== currentUser.monthly_income) {
        const effectiveDate = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01
        db.prepare(`
          INSERT INTO allowance_history (id, user_id, amount, frequency, arrival_date, effective_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), req.userId, updatedIncome, updatedFrequency, updatedArrival, effectiveDate, now);
      }

      db.prepare(`
        UPDATE users SET 
          name = ?,
          monthly_income = ?,
          income_frequency = ?,
          income_arrival_date = ?,
          savings_goal = ?,
          currency = ?,
          language = ?,
          theme = ?,
          onboarding_done = ?,
          avatar = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        updatedName, updatedIncome, updatedFrequency, updatedArrival, updatedGoal,
        updatedCurrency, updatedLanguage, updatedTheme, updatedOnboarding, updatedAvatar, now, req.userId
      );

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
      delete user.password_hash;
      delete user.pin_hash;
      res.json(user);
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // POST /api/auth/forgot-password
  router.post('/forgot-password', (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      const cleanEmail = email.toLowerCase().trim();
      const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(cleanEmail);
      if (!user) {
        // Return friendly message without leaking account existence
        return res.json({ message: 'If an account exists with this email, a reset link has been dispatched.' });
      }

      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO password_resets (id, user_id, token, expires_at, used, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `).run(crypto.randomUUID(), user.id, token, expiresAt, now);

      const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:5173';
      const resetUrl = `${origin}/reset-password?token=${token}`;

      console.log(`\n==================================================`);
      console.log(`🔑 [DEV] Password Reset Link for ${cleanEmail}:`);
      console.log(`👉 ${resetUrl}`);
      console.log(`==================================================\n`);

      res.json({
        message: 'Password reset link sent! Check your developer console for the reset link.',
        dev_token: token,
        dev_link: resetUrl
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Failed to generate reset link' });
    }
  });

  // POST /api/auth/reset-password
  router.post('/reset-password', async (req, res) => {
    try {
      const { token, new_password } = req.body;
      if (!token || !new_password) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }
      if (new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const record = db.prepare(`SELECT * FROM password_resets WHERE token = ? AND used = 0`).get(token);
      if (!record) {
        return res.status(400).json({ error: 'Invalid or already used reset token' });
      }

      if (new Date(record.expires_at) < new Date()) {
        return res.status(400).json({ error: 'This reset token has expired. Please request a new one.' });
      }

      const passwordHash = await bcrypt.hash(new_password, 10);
      const now = new Date().toISOString();

      db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(passwordHash, now, record.user_id);
      db.prepare(`UPDATE password_resets SET used = 1 WHERE id = ?`).run(record.id);

      res.json({ message: 'Password updated successfully! You can now log in.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // PUT /api/auth/email
  router.put('/email', authMiddleware, async (req, res) => {
    try {
      const { new_email, current_password } = req.body;
      if (!new_email || !current_password) {
        return res.status(400).json({ error: 'New email and current password are required' });
      }

      const cleanEmail = new_email.toLowerCase().trim();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }

      const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(cleanEmail, req.userId);
      if (conflict) {
        return res.status(409).json({ error: 'This email is already in use by another account' });
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?').run(cleanEmail, now, req.userId);

      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
      delete updated.password_hash;
      delete updated.pin_hash;
      res.json({ message: 'Email address updated successfully', user: updated });
    } catch (err) {
      console.error('Change email error:', err);
      res.status(500).json({ error: 'Failed to update email' });
    }
  });

  // DELETE /api/auth/account — Delete account and all associated user data permanently
  router.delete('/account', authMiddleware, (req, res) => {
    try {
      const { confirmation } = req.body;
      if (confirmation !== 'DELETE') {
        return res.status(400).json({ error: 'Please type DELETE to confirm account deletion' });
      }

      // Explicitly delete user rows across all tables
      const tables = [
        'group_expense_shares', 'group_expenses', 'group_members', 'split_groups',
        'goal_jars', 'subscriptions', 'allowance_history', 'password_resets',
        'question_answers', 'question_prompts', 'merchant_rules', 'weekly_checkins',
        'insights_log', 'transactions', 'budgets', 'goals', 'accounts', 'categories',
        'user_settings', 'users'
      ];

      for (const table of tables) {
        try {
          if (table === 'group_expense_shares') {
            db.prepare(`
              DELETE FROM group_expense_shares 
              WHERE expense_id IN (SELECT id FROM group_expenses WHERE user_id = ?)
            `).run(req.userId);
          } else if (table === 'group_members') {
            db.prepare(`
              DELETE FROM group_members 
              WHERE group_id IN (SELECT id FROM split_groups WHERE user_id = ?)
            `).run(req.userId);
          } else if (table === 'users') {
            db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
          } else {
            db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(req.userId);
          }
        } catch (tableErr) {
          // Table might not exist or empty
        }
      }

      res.json({ message: 'Account and all data deleted permanently.' });
    } catch (err) {
      console.error('Delete account error:', err);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  return router;
}

module.exports = createAuthRouter;
