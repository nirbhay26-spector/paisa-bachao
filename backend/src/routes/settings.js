const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');
const { enableSampleData, clearSampleData } = require('../services/sampleData');

function createSettingsRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  // PUT /api/settings/theme
  router.put('/theme', (req, res) => {
    const { theme } = req.body;
    const allowed = [
      'mango_pop', 'lofi_lavender', 'midnight_arcade', 'matcha_chill', 
      'sunset_street', 'cherry_soda', 'citrus_punch', 'aurora_night', 'custom'
    ];
    if (!allowed.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }
    db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.userId);
    res.json({ theme, message: 'Theme updated' });
  });

  // POST /api/settings/sample-data/enable
  router.post('/sample-data/enable', (req, res) => {
    const result = enableSampleData(db, req.userId);
    res.json(result);
  });

  // POST /api/settings/sample-data/clear
  router.post('/sample-data/clear', (req, res) => {
    const result = clearSampleData(db, req.userId);
    res.json(result);
  });

  // GET /api/settings/export/csv
  router.get('/export/csv', (req, res) => {
    try {
      const txns = db.prepare(`
        SELECT t.date, t.amount, c.name as category, t.payment_method, t.merchant, t.note, t.tag, t.is_sample
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.is_deleted = 0
        ORDER BY t.date DESC
      `).all(req.userId);

      let csv = 'Date,Amount,Category,Payment Method,Merchant,Note,Tag,Is Sample\n';
      for (const t of txns) {
        csv += `"${t.date}",${t.amount},"${t.category || ''}","${t.payment_method}","${(t.merchant || '').replace(/"/g, '""')}","${(t.note || '').replace(/"/g, '""')}","${t.tag || ''}",${t.is_sample}\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=paise-bachao-transactions.csv');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: 'Export failed' });
    }
  });

  // Subscriptions API
  router.get('/subscriptions', (req, res) => {
    try {
      const subs = db.prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY next_billing_date ASC').all(req.userId);
      res.json(subs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load subscriptions' });
    }
  });

  router.post('/subscriptions', (req, res) => {
    try {
      const { name, amount, category_id, billing_cycle, next_billing_date, reminder_days } = req.body;
      if (!name || !amount) return res.status(400).json({ error: 'Name and amount are required' });

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO subscriptions (id, user_id, name, amount, category_id, billing_cycle, next_billing_date, status, reminder_days, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(
        id, req.userId, name.trim(), parseFloat(amount), category_id || null, 
        billing_cycle || 'monthly', next_billing_date || now.slice(0, 10), reminder_days || 2, now
      );

      const created = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  router.delete('/subscriptions/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM subscriptions WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
      res.json({ message: 'Subscription removed' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete subscription' });
    }
  });

  // DELETE /api/settings/data — Permanent one-click wipe of all data for THIS user
  router.delete('/data', (req, res) => {
    try {
      const userId = req.userId;
      db.prepare('DELETE FROM group_expense_shares WHERE expense_id IN (SELECT id FROM group_expenses WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM group_expenses WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM group_members WHERE group_id IN (SELECT id FROM split_groups WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM split_groups WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM goal_jars WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM allowance_history WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM question_answers WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM question_prompts WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM merchant_rules WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM weekly_checkins WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM insights_log WHERE user_id = ?').run(userId);

      // Reset balance on accounts
      db.prepare('UPDATE accounts SET balance = 0 WHERE user_id = ?').run(userId);

      res.json({ message: 'All personal data deleted permanently.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to wipe data' });
    }
  });

  return router;
}

module.exports = createSettingsRouter;
