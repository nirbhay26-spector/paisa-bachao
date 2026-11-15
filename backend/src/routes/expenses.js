const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const { validateExpense } = require('../middleware/validate');
const { calculateDaysUntilNextIncome, computeSafeToSpend } = require('../services/insightsEngine');
const { suggestCategoryAndTag } = require('../../../shared/categories');

function createExpensesRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../uploads', req.userId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      cb(null, allowed.includes(file.mimetype));
    }
  });

  // Helper to generate 1 friendly contextual question prompt
  function createQuestionPrompt(userId, txn) {
    const qId = crypto.randomUUID();
    const now = new Date().toISOString();
    const hour = new Date(txn.date || now).getHours();
    const merchantLower = (txn.merchant || '').toLowerCase();
    const amountRound = Math.round(txn.amount);

    let questionText = '';
    let qType = 'need_want';

    if (hour >= 22 || hour <= 4) {
      questionText = `Late-night spend of ₹${amountRound}! Was this late-night fuel or craving? 🌙`;
      qType = 'impulse';
    } else if (txn.amount >= 500) {
      questionText = `Big spend alert (₹${amountRound})! Was this planned in advance or an impulse treat? 🎯`;
      qType = 'impulse';
    } else if (
      merchantLower.includes('zomato') || merchantLower.includes('swiggy') ||
      merchantLower.includes('canteen') || merchantLower.includes('chai') ||
      merchantLower.includes('coffee') || merchantLower.includes('food') ||
      merchantLower.includes('cafe') || merchantLower.includes('burger') ||
      merchantLower.includes('pizza')
    ) {
      questionText = `₹${amountRound} on food/drink! Was this solo or hanging out with friends? 🍔`;
      qType = 'social';
    } else if (txn.tag === 'want') {
      questionText = `You marked this ₹${amountRound} as a Treat/Want. How did it feel? Worth it? 🍩`;
      qType = 'worth_it';
    } else {
      questionText = `You spent ₹${amountRound}${txn.merchant ? ` at ${txn.merchant}` : ''}. Was this an essential need or a treat? ✨`;
      qType = 'need_want';
    }

    db.prepare(`
      INSERT INTO question_prompts (id, user_id, transaction_id, question_text, question_type, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(qId, userId, txn.id, questionText, qType, now);

    return { id: qId, question_text: questionText, question_type: qType };
  }

  // GET /api/expenses/frequent — User's OWN frequent quick-add chips
  router.get('/frequent', (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT merchant, category_id, tag, payment_method, 
               ROUND(AVG(amount)) as default_amount, COUNT(*) as frequency
        FROM transactions
        WHERE user_id = ? AND is_deleted = 0 AND (merchant != '' OR note != '')
        GROUP BY merchant, category_id
        ORDER BY frequency DESC LIMIT 6
      `).all(req.userId);

      const categories = db.prepare('SELECT id, name, icon, color FROM categories WHERE user_id = ?').all(req.userId);
      const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

      const chips = rows.map(r => ({
        label: r.merchant || 'Quick Spend',
        amount: r.default_amount,
        category_id: r.category_id,
        category_name: catMap[r.category_id]?.name || 'Expense',
        category_icon: catMap[r.category_id]?.icon || 'Circle',
        category_color: catMap[r.category_id]?.color || '#FF5C8A',
        tag: r.tag,
        payment_method: r.payment_method || 'upi'
      }));

      res.json(chips);
    } catch (err) {
      console.error(err);
      res.json([]);
    }
  });

  // GET /api/expenses/summary — Live summary numbers
  router.get('/summary', (req, res) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

      const sampleFilter = user.sample_data_enabled ? '' : 'AND is_sample = 0';

      const monthRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND is_deleted = 0 AND date >= ? ${sampleFilter}`).get(req.userId, currentMonthStart);
      const todayRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND is_deleted = 0 AND date >= ? ${sampleFilter}`).get(req.userId, todayStart);
      const weekRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND is_deleted = 0 AND date >= ? ${sampleFilter}`).get(req.userId, weekStart);

      const totalCountRow = db.prepare(`SELECT COUNT(*) as c FROM transactions WHERE user_id = ? AND is_deleted = 0 ${sampleFilter}`).get(req.userId);

      const income = user.monthly_income || 0;
      const spentMonth = monthRow.total;
      const moneyLeft = income - spentMonth;

      const daysUntilNext = calculateDaysUntilNextIncome(user.income_frequency, user.income_arrival_date, now);
      const safePerDay = computeSafeToSpend(income, spentMonth, daysUntilNext);

      // Pending questions count
      const pendingQ = db.prepare(`SELECT COUNT(*) as c FROM question_prompts WHERE user_id = ? AND status = 'pending'`).get(req.userId);

      // Mood Mascot status
      let mascotMood = 'calm';
      let mascotLine = "You're all set! Track your spends as they happen.";
      if (totalCountRow.c === 0) {
        mascotMood = 'calm';
        mascotLine = "Fresh canvas! Add your first spend whenever you buy something.";
      } else if (income > 0) {
        const pctUsed = (spentMonth / income) * 100;
        if (pctUsed >= 100) {
          mascotMood = 'panicking';
          mascotLine = "Emergency brake! Budget exceeded. Zero-spend mode recommended!";
        } else if (pctUsed >= 80) {
          mascotMood = 'nervous';
          mascotLine = `Whoa, ${Math.round(pctUsed)}% of your pocket money is gone. Watch out!`;
        } else if (pctUsed < 50 && now.getDate() > 15) {
          mascotMood = 'proud';
          mascotLine = "Killing it! You're pacing way under budget this month. 🥳";
        } else {
          mascotMood = 'calm';
          mascotLine = `Smooth sailing. You've got ₹${safePerDay}/day to spend safely.`;
        }
      }

      res.json({
        today: todayRow.total,
        week: weekRow.total,
        month: spentMonth,
        monthly_income: income,
        money_left: moneyLeft,
        safe_per_day: safePerDay,
        days_left: daysUntilNext,
        pending_questions: pendingQ.c,
        total_expenses_count: totalCountRow.c,
        mascot_mood: mascotMood,
        mascot_line: mascotLine,
        sample_data_enabled: !!user.sample_data_enabled
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load summary' });
    }
  });

  // GET /api/expenses — List user transactions
  router.get('/', (req, res) => {
    try {
      const user = db.prepare('SELECT sample_data_enabled FROM users WHERE id = ?').get(req.userId);
      const { category, tag, payment_method, search, limit = 50, offset = 0 } = req.query;

      let where = 'WHERE t.user_id = ? AND t.is_deleted = 0';
      const params = [req.userId];

      if (!user?.sample_data_enabled) {
        where += ' AND t.is_sample = 0';
      }

      if (category) { where += ' AND t.category_id = ?'; params.push(category); }
      if (tag) { where += ' AND t.tag = ?'; params.push(tag); }
      if (payment_method) { where += ' AND t.payment_method = ?'; params.push(payment_method); }
      if (search) { where += ' AND (t.note LIKE ? OR t.merchant LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

      const countRow = db.prepare(`SELECT COUNT(*) as total FROM transactions t ${where}`).get(...params);
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      const expenses = db.prepare(`
        SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        ${where}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params);

      res.json({ expenses, total: countRow.total });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to list expenses' });
    }
  });

  // GET /api/expenses/check-duplicate — Duplicate transaction pre-flight check
  router.get('/check-duplicate', (req, res) => {
    try {
      const { amount, merchant, date } = req.query;
      if (!amount || isNaN(parseFloat(amount))) {
        return res.json({ is_duplicate: false });
      }

      const numAmount = parseFloat(amount);
      const merchantTrimmed = (merchant || '').trim();
      const dateStr = (date || new Date().toISOString()).slice(0, 10);

      let query = `
        SELECT id, amount, merchant, date, note
        FROM transactions
        WHERE user_id = ? AND is_deleted = 0
          AND amount = ?
          AND date LIKE ?
      `;
      const params = [req.userId, numAmount, `${dateStr}%`];

      if (merchantTrimmed) {
        query += ` AND LOWER(merchant) = LOWER(?)`;
        params.push(merchantTrimmed);
      }

      const duplicate = db.prepare(`${query} ORDER BY created_at DESC LIMIT 1`).get(...params);

      res.json({
        is_duplicate: !!duplicate,
        duplicate: duplicate || null
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to check duplicate' });
    }
  });

  // POST /api/expenses — Fast FamPay entry with intelligence
  router.post('/', validateExpense, (req, res) => {
    try {
      let { amount, category_id, payment_method, date, note, merchant, tag, is_recurring, recurrence_rule } = req.body;

      amount = parseFloat(amount);
      if (!amount || amount <= 0 || amount > 10000000) {
        return res.status(400).json({ error: 'Please enter a valid amount' });
      }

      // Check user's own learned merchant rules first
      if (merchant && (!category_id || !tag)) {
        const rule = db.prepare('SELECT * FROM merchant_rules WHERE user_id = ? AND merchant_pattern = ?')
          .get(req.userId, merchant.toLowerCase().trim());
        if (rule) {
          if (!category_id && rule.category_id) category_id = rule.category_id;
          if (!tag && rule.tag) tag = rule.tag;
        }
      }

      // If still missing, apply built-in Indian merchant intelligence
      if (!category_id || !tag) {
        const fallback = suggestCategoryAndTag((merchant || '') + ' ' + (note || ''));
        if (!category_id && fallback.category !== 'other') category_id = fallback.category;
        if (!tag) tag = fallback.tag;
      }

      // If merchant and category are both present, learn the rule
      if (merchant && category_id) {
        try {
          db.prepare(`
            INSERT INTO merchant_rules (id, user_id, merchant_pattern, category_id, tag)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, merchant_pattern) DO UPDATE SET
              category_id = excluded.category_id,
              tag = COALESCE(excluded.tag, merchant_rules.tag)
          `).run(crypto.randomUUID(), req.userId, merchant.toLowerCase().trim(), category_id, tag || null);
        } catch (e) {
          // ignore conflict errors
        }
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const txnDate = date || now;

      db.prepare(`
        INSERT INTO transactions (id, user_id, amount, category_id, payment_method, date, note, merchant, tag, is_recurring, recurrence_rule, is_sample, is_deleted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
      `).run(
        id, req.userId, amount, category_id || null, payment_method || 'upi', txnDate,
        (note || '').trim().slice(0, 500), (merchant || '').trim().slice(0, 200),
        tag || null, is_recurring ? 1 : 0, recurrence_rule || null, now, now
      );

      const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);

      // Generate 1 smart follow-up question
      const question = createQuestionPrompt(req.userId, created);

      res.status(201).json({ expense: created, question });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  });

  // PUT /api/expenses/:id — Edit expense & learn corrections
  router.put('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ? AND is_deleted = 0').get(req.params.id, req.userId);
      if (!existing) return res.status(404).json({ error: 'Expense not found' });

      const { amount, category_id, payment_method, date, note, merchant, tag } = req.body;
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE transactions SET 
          amount = COALESCE(?, amount),
          category_id = COALESCE(?, category_id),
          payment_method = COALESCE(?, payment_method),
          date = COALESCE(?, date),
          note = COALESCE(?, note),
          merchant = COALESCE(?, merchant),
          tag = COALESCE(?, tag),
          updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(amount, category_id, payment_method, date, note, merchant, tag, now, req.params.id, req.userId);

      // Learn correction if merchant & category are provided
      const finalMerchant = merchant || existing.merchant;
      const finalCategory = category_id || existing.category_id;
      const finalTag = tag || existing.tag;

      if (finalMerchant && finalCategory) {
        try {
          db.prepare(`
            INSERT INTO merchant_rules (id, user_id, merchant_pattern, category_id, tag)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, merchant_pattern) DO UPDATE SET
              category_id = excluded.category_id,
              tag = COALESCE(excluded.tag, merchant_rules.tag)
          `).run(crypto.randomUUID(), req.userId, finalMerchant.toLowerCase().trim(), finalCategory, finalTag || null);
        } catch (e) {
          // ignore
        }
      }

      const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update' });
    }
  });

  // DELETE /api/expenses/:id — Soft delete for undo support
  router.delete('/:id', (req, res) => {
    const result = db.prepare('UPDATE transactions SET is_deleted = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Deleted', id: req.params.id, undo_available: true });
  });

  // POST /api/expenses/:id/restore — Undo delete
  router.post('/:id/restore', (req, res) => {
    const result = db.prepare('UPDATE transactions SET is_deleted = 0 WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Cannot restore' });
    res.json({ message: 'Restored successfully' });
  });

  // POST /api/expenses/:id/attachment
  router.post('/:id/attachment', upload.single('receipt'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Invalid file' });
      const relPath = `uploads/${req.userId}/${req.file.filename}`;

      db.prepare('UPDATE transactions SET attachment_path = ? WHERE id = ? AND user_id = ?')
        .run(relPath, req.params.id, req.userId);

      db.prepare(`
        INSERT INTO attachments (id, user_id, transaction_id, file_path, file_name, file_size, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), req.userId, req.params.id, relPath, req.file.originalname, req.file.size, req.file.mimetype, new Date().toISOString());

      res.json({ path: relPath });
    } catch (err) {
      res.status(500).json({ error: 'Failed to upload' });
    }
  });

  return router;
}

module.exports = createExpensesRouter;
