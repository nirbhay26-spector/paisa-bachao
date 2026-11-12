const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { initDb } = require('../src/utils/db');

test('Question Generation, Answering, and Merchant Learning', async () => {
  const db = await initDb(':memory:');
  const migration = fs.readFileSync(path.join(__dirname, '../migrations/001_init.sql'), 'utf-8');
  db.exec(migration);

  const userId = 'user_student_1';
  const now = new Date().toISOString();

  // Create user with ₹3,000 pocket money
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, monthly_income, income_frequency, income_arrival_date, created_at, updated_at)
    VALUES (?, 'student@college.edu', 'hash', 'Aman', 3000, 'monthly', '1', ?, ?)
  `).run(userId, now, now);

  // 1. Log an expense at Chai Tapri (₹80)
  const txnId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, merchant, note, payment_method, date, created_at, updated_at)
    VALUES (?, ?, 80, 'Chai Tapri', '#ChaiBreak', 'upi', ?, ?, ?)
  `).run(txnId, userId, now, now, now);

  // 2. Generate question prompt
  const qId = crypto.randomUUID();
  const qText = 'You spent ₹80 at Chai Tapri. Was this an essential need or a treat?';
  db.prepare(`
    INSERT INTO question_prompts (id, user_id, transaction_id, question_text, question_type, status, created_at)
    VALUES (?, ?, ?, ?, 'need_want', 'pending', ?)
  `).run(qId, userId, txnId, qText, now);

  // Verify pending question is listed
  const pending = db.prepare('SELECT * FROM question_prompts WHERE user_id = ? AND status = "pending"').all(userId);
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].id, qId);

  // 3. Answer the question
  const ansId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO question_answers (id, user_id, question_id, transaction_id, answer_value, tag, created_at)
    VALUES (?, ?, ?, ?, 'Treat / Want', 'want', ?)
  `).run(ansId, userId, qId, txnId, now);

  db.prepare('UPDATE question_prompts SET status = "answered" WHERE id = ?').run(qId);
  db.prepare('UPDATE transactions SET tag = "want" WHERE id = ?').run(txnId);

  // Learn merchant rule for THIS user
  db.prepare(`
    INSERT INTO merchant_rules (id, user_id, merchant_pattern, tag)
    VALUES (?, ?, 'chai tapri', 'want')
  `).run(crypto.randomUUID(), userId);

  // 4. Verify question is now marked answered
  const pendingAfter = db.prepare('SELECT * FROM question_prompts WHERE user_id = ? AND status = "pending"').all(userId);
  assert.strictEqual(pendingAfter.length, 0);

  // 5. Verify answer is stored in question_answers
  const answers = db.prepare('SELECT * FROM question_answers WHERE user_id = ?').all(userId);
  assert.strictEqual(answers.length, 1);
  assert.strictEqual(answers[0].answer_value, 'Treat / Want');
  assert.strictEqual(answers[0].tag, 'want');

  // 6. Verify merchant rule learned
  const rule = db.prepare('SELECT * FROM merchant_rules WHERE user_id = ? AND merchant_pattern = "chai tapri"').get(userId);
  assert.ok(rule);
  assert.strictEqual(rule.tag, 'want');

  // 7. Verify transaction updated
  const txn = db.prepare('SELECT tag FROM transactions WHERE id = ?').get(txnId);
  assert.strictEqual(txn.tag, 'want');

  db.close();
});
