const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');

const BADGES = [
  { id: 'first_expense', name: 'First Step', description: 'Logged your first real expense', icon: '🎉' },
  { id: 'streak_3', name: '3-Day Streak', description: 'Logged expenses 3 days in a row', icon: '🔥' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Logged expenses 7 days in a row', icon: '💪' },
  { id: 'no_spend_weekend', name: 'No-Spend Weekend', description: 'Spent nothing on a weekend', icon: '🏆' },
  { id: 'budget_keeper', name: 'Budget Boss', description: 'Stayed within all budgets', icon: '🎯' },
  { id: 'savings_goal_hit', name: 'Goal Crusher', description: 'Completed a savings goal!', icon: '⭐' },
  { id: 'categorizer', name: 'Organized', description: 'Answered all pending question prompts', icon: '📁' },
  { id: 'thrifty_week', name: 'Thrifty Week', description: 'Spent under ₹500 in a week', icon: '💰' },
];

function createGamificationRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/badges', (req, res) => {
    const earned = db.prepare('SELECT badge_id, earned_at FROM gamification WHERE user_id = ?').all(req.userId);
    const earnedMap = {};
    earned.forEach((e) => { earnedMap[e.badge_id] = e.earned_at; });

    const badges = BADGES.map((b) => ({
      ...b,
      earned: !!earnedMap[b.id],
      earned_at: earnedMap[b.id] || null,
    }));
    res.json(badges);
  });

  router.post('/check', (req, res) => {
    try {
      const now = new Date();
      const userId = req.userId;
      const newBadges = [];

      const alreadyEarned = new Set(
        db.prepare('SELECT badge_id FROM gamification WHERE user_id = ?').all(userId).map((r) => r.badge_id)
      );

      function award(badgeId) {
        if (alreadyEarned.has(badgeId)) return;
        db.prepare('INSERT INTO gamification (id, user_id, badge_id, earned_at) VALUES (?, ?, ?, ?)')
          .run(crypto.randomUUID(), userId, badgeId, now.toISOString());
        newBadges.push(BADGES.find((b) => b.id === badgeId));
        alreadyEarned.add(badgeId);
      }

      const expCount = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE user_id = ? AND is_deleted = 0').get(userId);
      if (expCount.c >= 1) award('first_expense');

      const completedGoals = db.prepare('SELECT COUNT(*) as c FROM goals WHERE user_id = ? AND is_completed = 1').get(userId);
      if (completedGoals.c >= 1) award('savings_goal_hit');

      res.json({ new_badges: newBadges, total_earned: alreadyEarned.size });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to check badges' });
    }
  });

  return router;
}

module.exports = createGamificationRouter;
