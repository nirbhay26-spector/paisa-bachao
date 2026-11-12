const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');

function createBudgetsRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', (req, res) => {
    try {
      const user = db.prepare('SELECT sample_data_enabled FROM users WHERE id = ?').get(req.userId);
      const sampleFilter = user?.sample_data_enabled ? '' : 'AND is_sample = 0';

      const budgets = db.prepare(`
        SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM budgets b 
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = ?
      `).all(req.userId);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

      const enriched = budgets.map((b) => {
        const periodStart = b.period === 'weekly' ? weekStart : monthStart;
        let spentRow;
        if (b.category_id) {
          spentRow = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM transactions 
            WHERE user_id = ? AND category_id = ? AND is_deleted = 0 AND date >= ? ${sampleFilter}
          `).get(req.userId, b.category_id, periodStart);
        } else {
          spentRow = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM transactions 
            WHERE user_id = ? AND is_deleted = 0 AND date >= ? ${sampleFilter}
          `).get(req.userId, periodStart);
        }

        const spent = spentRow.total;
        const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
        let alert_level = null;
        if (percentage >= 100) alert_level = 'exceeded';
        else if (percentage >= 80) alert_level = 'warning';
        else if (percentage >= 50) alert_level = 'caution';

        return { ...b, spent, percentage, alert_level };
      });

      res.json(enriched);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load budgets' });
    }
  });

  router.post('/', (req, res) => {
    try {
      const { category_id, amount, period } = req.body;
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) return res.status(400).json({ error: 'Budget amount must be positive' });

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO budgets (id, user_id, category_id, amount, period, start_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.userId, category_id || null, amt, period || 'monthly', now, now);

      res.status(201).json(db.prepare('SELECT * FROM budgets WHERE id = ?').get(id));
    } catch (err) {
      res.status(500).json({ error: 'Failed to create budget' });
    }
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Budget not found' });
    res.json({ message: 'Deleted' });
  });

  return router;
}

module.exports = createBudgetsRouter;
