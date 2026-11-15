const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');
const { validateGoal } = require('../middleware/validate');

function createSavingsRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', (req, res) => {
    try {
      const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
      const enriched = goals.map((g) => {
        const percentage = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
        let weekly_suggestion = null;
        let projected_days_left = null;
        let pace_status = 'on_track'; // on_track, behind, completed

        const now = new Date();
        const remaining = Math.max(0, g.target_amount - g.current_amount);

        if (g.is_completed || remaining === 0) {
          pace_status = 'completed';
        } else if (g.deadline) {
          const deadline = new Date(g.deadline);
          const daysToDeadline = Math.max(1, Math.ceil((deadline - now) / (24 * 60 * 60 * 1000)));
          const weeksLeft = Math.max(1, Math.ceil(daysToDeadline / 7));
          weekly_suggestion = Math.ceil(remaining / weeksLeft);

          // Calculate historical savings pace (amount saved per day since goal creation)
          const createdAt = new Date(g.created_at);
          const daysSinceCreation = Math.max(1, Math.ceil((now - createdAt) / (24 * 60 * 60 * 1000)));
          const dailyPace = g.current_amount / daysSinceCreation;

          if (dailyPace > 0) {
            projected_days_left = Math.ceil(remaining / dailyPace);
            if (projected_days_left > daysToDeadline) {
              pace_status = 'behind';
            }
          }
        }

        return { ...g, percentage, weekly_suggestion, projected_days_left, pace_status };
      });
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load savings goals' });
    }
  });

  router.post('/', validateGoal, (req, res) => {
    try {
      const { name, target_amount, deadline } = req.body;
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

  router.put('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
      if (!existing) return res.status(404).json({ error: 'Goal not found' });

      const { name, target_amount, deadline } = req.body;
      const newTarget = target_amount !== undefined ? parseFloat(target_amount) : existing.target_amount;
      const isCompleted = existing.current_amount >= newTarget ? 1 : 0;

      db.prepare(`
        UPDATE goals SET
          name = COALESCE(?, name),
          target_amount = COALESCE(?, target_amount),
          deadline = COALESCE(?, deadline),
          is_completed = ?
        WHERE id = ? AND user_id = ?
      `).run(name ? name.trim() : null, newTarget, deadline !== undefined ? deadline : null, isCompleted, req.params.id, req.userId);

      res.json(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id));
    } catch (err) {
      res.status(500).json({ error: 'Failed to update goal' });
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
