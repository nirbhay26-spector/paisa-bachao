const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');

function createSavingsRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', (req, res) => {
    try {
      const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
      const enriched = goals.map((g) => {
        const percentage = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
        let weekly_suggestion = null;
        if (g.deadline) {
          const now = new Date();
          const deadline = new Date(g.deadline);
          const weeksLeft = Math.max(1, Math.ceil((deadline - now) / (7 * 24 * 60 * 60 * 1000)));
          const remaining = Math.max(0, g.target_amount - g.current_amount);
          weekly_suggestion = Math.ceil(remaining / weeksLeft);
        }
        return { ...g, percentage, weekly_suggestion };
      });
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load savings goals' });
    }
  });

  router.post('/', (req, res) => {
    try {
      const { name, target_amount, deadline } = req.body;
      if (!name || !target_amount || parseFloat(target_amount) <= 0) {
        return res.status(400).json({ error: 'Name and positive target amount are required' });
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, is_completed, created_at)
        VALUES (?, ?, ?, ?, 0, ?, 0, ?)
      `).run(id, req.userId, name.trim(), parseFloat(target_amount), deadline || null, now);

      res.status(201).json(db.prepare('SELECT * FROM goals WHERE id = ?').get(id));
    } catch (err) {
      res.status(500).json({ error: 'Failed to create savings goal' });
    }
  });

  router.post('/:id/contribute', (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Positive amount required' });
      const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
      if (!goal) return res.status(404).json({ error: 'Goal not found' });

      const newAmount = goal.current_amount + parseFloat(amount);
      const isCompleted = newAmount >= goal.target_amount ? 1 : 0;

      db.prepare('UPDATE goals SET current_amount = ?, is_completed = ? WHERE id = ?').run(newAmount, isCompleted, req.params.id);

      res.json({ ...goal, current_amount: newAmount, is_completed: isCompleted, just_completed: isCompleted && !goal.is_completed });
    } catch (err) {
      res.status(500).json({ error: 'Failed to contribute' });
    }
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Deleted' });
  });

  return router;
}

module.exports = createSavingsRouter;
