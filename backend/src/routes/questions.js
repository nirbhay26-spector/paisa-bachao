const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');

function createQuestionsRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  // GET /api/questions — List questions (pending or answered)
  router.get('/', (req, res) => {
    try {
      const status = req.query.status || 'pending';

      const pendingCount = db.prepare(`
        SELECT COUNT(*) as c FROM question_prompts q
        JOIN transactions t ON q.transaction_id = t.id
        WHERE q.user_id = ? AND q.status = 'pending' AND t.is_deleted = 0
      `).get(req.userId).c;

      const answeredCount = db.prepare(`
        SELECT COUNT(*) as c FROM question_prompts q
        JOIN transactions t ON q.transaction_id = t.id
        WHERE q.user_id = ? AND q.status = 'answered' AND t.is_deleted = 0
      `).get(req.userId).c;

      if (status === 'answered') {
        const answered = db.prepare(`
          SELECT q.*, a.id as answer_id, a.answer_value, a.tag as answered_tag, a.created_at as answered_at,
                 t.amount, t.merchant, t.note, t.date as expense_date, t.payment_method,
                 c.name as category_name, c.icon as category_icon, c.color as category_color
          FROM question_prompts q
          JOIN question_answers a ON q.id = a.question_id
          JOIN transactions t ON q.transaction_id = t.id
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE q.user_id = ? AND q.status = 'answered' AND t.is_deleted = 0
          ORDER BY a.created_at DESC
          LIMIT 50
        `).all(req.userId);

        return res.json({
          status: 'answered',
          counts: { pending: pendingCount, answered: answeredCount },
          items: answered
        });
      }

      // Default: pending
      const pending = db.prepare(`
        SELECT q.*, t.amount, t.merchant, t.note, t.date as expense_date, t.payment_method,
               c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM question_prompts q
        JOIN transactions t ON q.transaction_id = t.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE q.user_id = ? AND q.status = 'pending' AND t.is_deleted = 0
        ORDER BY q.created_at DESC
      `).all(req.userId);

      res.json({
        status: 'pending',
        counts: { pending: pendingCount, answered: answeredCount },
        items: pending
      });
    } catch (err) {
      console.error('Error fetching questions:', err);
      res.status(500).json({ error: 'Failed to load questions' });
    }
  });

  // POST /api/questions/:id/answer — Record answer & learn merchant rule for this user
  router.post('/:id/answer', (req, res) => {
    try {
      const { answer, tag, category_id } = req.body;
      const question = db.prepare('SELECT * FROM question_prompts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
      if (!question) return res.status(404).json({ error: 'Question not found' });

      const now = new Date().toISOString();
      const ansId = crypto.randomUUID();

      // Effective tag calculation
      const ansLower = (answer || '').toLowerCase();
      let effectiveTag = tag || null;
      if (!effectiveTag) {
        if (ansLower.includes('need') || ansLower.includes('essential')) effectiveTag = 'need';
        else if (ansLower.includes('want') || ansLower.includes('treat') || ansLower.includes('impulse')) effectiveTag = 'want';
      }

      // Record answer
      db.prepare(`
        INSERT INTO question_answers (id, user_id, question_id, transaction_id, answer_value, tag, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(ansId, req.userId, question.id, question.transaction_id, answer || '', effectiveTag, now);

      // Mark prompt answered
      db.prepare('UPDATE question_prompts SET status = ? WHERE id = ?').run('answered', req.params.id);

      // Fetch transaction details for contextual reaction
      const txn = db.prepare('SELECT amount, merchant, category_id FROM transactions WHERE id = ?').get(question.transaction_id);
      const amount = txn ? Math.round(txn.amount) : 0;
      const merchant = txn?.merchant || 'this spend';

      // Smart Gen-Z reaction
      let reaction = 'Answer saved permanently to your database! 💾';
      let habitLearned = '';

      if (effectiveTag === 'need' || ansLower.includes('essential')) {
        reaction = `Essential spend locked in! Staying disciplined on the basics. 🥦`;
        habitLearned = `Tagged as Need. Won't trigger impulse spending alerts.`;
      } else if (effectiveTag === 'want' || ansLower.includes('treat')) {
        reaction = `Logged as a Treat/Want (₹${amount})! Life is short, enjoy it responsibly. 🍩`;
        habitLearned = `Tagged as Want. Tracking your treat-to-need ratio.`;
      } else if (ansLower.includes('friend') || ansLower.includes('gang') || ansLower.includes('social')) {
        reaction = `Hanging out with friends is always worth the memories! 🍕👥`;
        habitLearned = `Social hangout noted. Watch group spending pace.`;
      } else if (ansLower.includes('solo') || ansLower.includes('me time')) {
        reaction = `Solo self-care treat recorded! ☕`;
      } else if (ansLower.includes('planned')) {
        reaction = `Smart planning! Planned spends keep your monthly budget chill. 🎯`;
        habitLearned = `Budget discipline +10 XP!`;
      } else if (ansLower.includes('impulse')) {
        reaction = `Honesty is key! Flagged so you can see where pocket money slips away. ⚡`;
        habitLearned = `Impulse spend tracked in weekly insights.`;
      } else if (ansLower.includes('worth') || ansLower.includes('yes')) {
        reaction = `100% money well spent! Joy-per-rupee is top tier. ✨`;
      } else if (ansLower.includes('meh') || ansLower.includes('regret') || ansLower.includes('no')) {
        reaction = `Valuable reflection! Skipping this next time keeps ₹${amount} safe for your goals. 💡`;
        habitLearned = `Reflection logged to improve future advice.`;
      }

      // Update the transaction tag or category if supplied
      if (effectiveTag || category_id) {
        db.prepare(`
          UPDATE transactions SET 
            tag = COALESCE(?, tag),
            category_id = COALESCE(?, category_id),
            updated_at = ?
          WHERE id = ? AND user_id = ?
        `).run(effectiveTag || null, category_id || null, now, question.transaction_id, req.userId);

        if (txn && txn.merchant) {
          const pattern = txn.merchant.toLowerCase().trim();
          db.prepare(`
            INSERT INTO merchant_rules (id, user_id, merchant_pattern, category_id, tag)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, merchant_pattern) DO UPDATE SET
              category_id = COALESCE(excluded.category_id, merchant_rules.category_id),
              tag = COALESCE(excluded.tag, merchant_rules.tag)
          `).run(crypto.randomUUID(), req.userId, pattern, category_id || null, effectiveTag || null);
        }
      }

      res.json({
        message: 'Answer saved permanently!',
        reaction,
        habit_learned: habitLearned,
        answer_id: ansId,
        question_id: question.id,
        saved_answer: answer,
        tag: effectiveTag
      });
    } catch (err) {
      console.error('Error answering question:', err);
      res.status(500).json({ error: 'Failed to answer question' });
    }
  });

  // POST /api/questions/weekly-checkin — Sunday mood check-in
  router.post('/weekly-checkin', (req, res) => {
    try {
      const { mood, note } = req.body;
      if (!['great', 'okay', 'stressed', 'broke'].includes(mood)) {
        return res.status(400).json({ error: 'Invalid mood' });
      }

      const now = new Date();
      // Week start (Monday of current week)
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff)).toISOString().slice(0, 10);

      db.prepare(`
        INSERT INTO weekly_checkins (id, user_id, week_start, mood, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, week_start) DO UPDATE SET
          mood = excluded.mood,
          note = excluded.note
      `).run(crypto.randomUUID(), req.userId, weekStart, mood, note || '', now.toISOString());

      res.json({ message: 'Weekly check-in saved', mood, week_start: weekStart });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save weekly check-in' });
    }
  });

  // GET /api/questions/weekly-checkin — Get latest check-in
  router.get('/weekly-checkin', (req, res) => {
    try {
      const checkin = db.prepare(`SELECT * FROM weekly_checkins WHERE user_id = ? ORDER BY week_start DESC LIMIT 1`).get(req.userId);
      res.json(checkin || null);
    } catch (err) {
      res.json(null);
    }
  });

  return router;
}

module.exports = createQuestionsRouter;
