const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { runInsightsEngine, computeMoneyPulseScore } = require('../services/insightsEngine');

function createAdvisorRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  // GET /api/advisor/pulse — Deterministic Money Pulse wellness score (0-100)
  router.get('/pulse', (req, res) => {
    try {
      const pulse = computeMoneyPulseScore(db, req.userId);
      res.json(pulse);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to calculate Money Pulse' });
    }
  });

  // POST /api/advisor/affordability-simulator — "Can I afford this?"
  router.post('/affordability-simulator', (req, res) => {
    try {
      const { amount, name } = req.body;
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid purchase amount' });
      }

      const pulse = computeMoneyPulseScore(db, req.userId);
      const moneyLeft = pulse.moneyLeft;
      const daysUntilNext = pulse.daysUntilNext || 1;
      const currentSafePerDay = pulse.safePerDay;

      // Check upcoming subscriptions in next 14 days
      const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const todayStr = new Date().toISOString().slice(0, 10);
      const upcomingSubs = db.prepare(`
        SELECT name, amount, next_billing_date 
        FROM subscriptions 
        WHERE user_id = ? AND status = 'active'
          AND next_billing_date >= ? AND next_billing_date <= ?
      `).all(req.userId, todayStr, in14Days);

      const upcomingBillsTotal = upcomingSubs.reduce((s, b) => s + b.amount, 0);
      const moneyLeftAfter = moneyLeft - numAmount;
      const newSafePerDay = Math.max(0, Math.round(moneyLeftAfter / daysUntilNext));

      let verdict = 'Comfortable';
      let badgeColor = 'bg-primary';
      let advice = '';

      if (moneyLeftAfter <= 0) {
        verdict = 'Risky right now';
        badgeColor = 'bg-expense';
        advice = `This purchase exceeds your remaining allowance by ₹${Math.abs(Math.round(moneyLeftAfter))}. You would enter a deficit.`;
      } else if (moneyLeftAfter < upcomingBillsTotal) {
        verdict = 'Risky right now';
        badgeColor = 'bg-expense';
        advice = `You have ₹${Math.round(upcomingBillsTotal)} in upcoming bills due soon. Buying this leaves insufficient buffer for your bills.`;
      } else if (newSafePerDay < 40) {
        verdict = 'Possible but tight';
        badgeColor = 'bg-accent';
        advice = `You can afford it, but it drops your daily safe spend to just ₹${newSafePerDay}/day for the next ${daysUntilNext} days.`;
      } else if (newSafePerDay < currentSafePerDay * 0.7) {
        verdict = 'Possible but tight';
        badgeColor = 'bg-accent';
        advice = `Your daily safe spend will decrease from ₹${currentSafePerDay} to ₹${newSafePerDay}/day. Manageable with light spending.`;
      } else {
        verdict = 'Comfortable';
        badgeColor = 'bg-primary';
        advice = `Go for it! You'll still have ₹${Math.round(moneyLeftAfter)} left (about ₹${newSafePerDay}/day safe spend).`;
      }

      res.json({
        verdict,
        badgeColor,
        advice,
        amount: numAmount,
        name: name || 'Purchase',
        current_safe_to_spend: currentSafePerDay,
        new_safe_to_spend: newSafePerDay,
        money_left_before: moneyLeft,
        money_left_after: moneyLeftAfter,
        days_until_next: daysUntilNext,
        upcoming_bills_total: upcomingBillsTotal,
        upcoming_bills: upcomingSubs
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Affordability calculation failed' });
    }
  });

  // GET /api/advisor/insights — Real calculated personal insights
  router.get('/insights', (req, res) => {
    try {
      const user = db.prepare('SELECT language FROM users WHERE id = ?').get(req.userId);
      const result = runInsightsEngine(db, req.userId, user?.language || 'en');
      res.json(result.insights);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  });

  // POST /api/advisor/chat — Answers strictly from user's database
  router.post('/chat', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: 'Message is required' });

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
      const engineData = runInsightsEngine(db, req.userId, user.language || 'en');

      const q = message.toLowerCase();
      let reply = '';

      // 1. Where did my money go?
      if (q.includes('where') || q.includes('overspend') || q.includes('spend')) {
        const topCats = db.prepare(`
          SELECT c.name, SUM(t.amount) as total, COUNT(*) as count
          FROM transactions t
          JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = ? AND t.is_deleted = 0
          GROUP BY t.category_id
          ORDER BY total DESC LIMIT 5
        `).all(req.userId);

        if (topCats.length === 0) {
          reply = "You haven't logged any expenses yet! Tap the big '+' button to add your first spend, and I'll start tracking where your money goes.";
        } else {
          reply = `Here is your spending breakdown based on your entries:\n\n`;
          topCats.forEach((c, idx) => {
            reply += `${idx + 1}. ${c.name}: ₹${Math.round(c.total).toLocaleString('en-IN')} (${c.count} spends)\n`;
          });
          reply += `\nTotal recorded: ₹${Math.round(engineData.monthSpend).toLocaleString('en-IN')} this month.`;
        }
      }
      // 2. Can I afford X?
      else if (q.includes('afford') || q.includes('can i buy')) {
        const match = q.match(/₹?\s*([\d,]+)/);
        if (match) {
          const itemCost = parseFloat(match[1].replace(/,/g, ''));
          if (engineData.moneyLeft <= 0) {
            reply = `Your pocket money for this cycle is currently depleted (₹0 left). Spending ₹${itemCost.toLocaleString('en-IN')} right now would push you into debt or deficit. Try waiting for your next allowance reload!`;
          } else if (itemCost > engineData.moneyLeft) {
            reply = `You have ₹${Math.round(engineData.moneyLeft).toLocaleString('en-IN')} left until your next pocket money date. ₹${itemCost.toLocaleString('en-IN')} is higher than what you have left. I'd recommend holding off or saving up for it.`;
          } else {
            const remainingAfter = engineData.moneyLeft - itemCost;
            const newSafePerDay = Math.round(remainingAfter / (engineData.daysUntilNext || 1));
            reply = `You have ₹${Math.round(engineData.moneyLeft).toLocaleString('en-IN')} left. If you spend ₹${itemCost.toLocaleString('en-IN')}, you'll have ₹${Math.round(remainingAfter).toLocaleString('en-IN')} remaining (about ₹${newSafePerDay}/day for ${engineData.daysUntilNext} days). You can afford it if you're comfortable with that daily buffer!`;
          }
        } else {
          reply = `You have ₹${Math.round(engineData.moneyLeft).toLocaleString('en-IN')} left this cycle. How much does the item cost? (e.g. "Can I afford ₹1,500?")`;
        }
      }
      // 3. How to save or goal
      else if (q.includes('save') || q.includes('goal')) {
        const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(req.userId);
        if (goals.length > 0) {
          reply = `Here is your savings progress:\n\n`;
          goals.forEach(g => {
            const pct = Math.round((g.current_amount / g.target_amount) * 100);
            reply += `• ${g.name}: ₹${Math.round(g.current_amount)} / ₹${Math.round(g.target_amount)} (${pct}%)\n`;
          });
          reply += `\nPutting aside your recommended safe daily amount (₹${engineData.safePerDay}/day) helps you reach goals faster!`;
        } else {
          const suggested = Math.round((user.monthly_income || 0) * 0.2);
          reply = `You don't have an active savings goal yet. A great rule of thumb is setting aside 20% (about ₹${suggested.toLocaleString('en-IN')}/month). You can set a goal anytime in the Savings tab!`;
        }
      }
      // 4. General tips & baseline honesty
      else {
        if (!engineData.hasBaseline) {
          reply = `You currently have ${engineData.daysOfData} day(s) of spending recorded. I need at least 14 days of data to establish your personal baseline and pinpoint your exact overspending habits. In the meantime, your daily safe-to-spend target is ₹${engineData.safePerDay} per day!`;
        } else {
          reply = `You've spent ₹${Math.round(engineData.monthSpend).toLocaleString('en-IN')} this month with ₹${Math.round(engineData.moneyLeft).toLocaleString('en-IN')} remaining. Ask me "Where did my money go?" or "Can I afford ₹..." anytime!`;
        }
      }

      res.json({
        reply,
        disclaimer: 'This is educational guidance based on your recorded entries, not professional financial advice.'
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Advisor error' });
    }
  });

  return router;
}

module.exports = createAdvisorRouter;
