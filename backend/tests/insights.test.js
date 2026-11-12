const test = require('node:test');
const assert = require('node:assert');
const { calculateDaysUntilNextIncome, computeSafeToSpend, runInsightsEngine } = require('../src/services/insightsEngine');
const { initDb } = require('../src/utils/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

test('Safe to spend formula calculation', () => {
  // ₹4,000 left with 10 days until next allowance = ₹400/day
  assert.strictEqual(computeSafeToSpend(10000, 6000, 10), 400);
  // ₹0 left = ₹0/day (no negative quota)
  assert.strictEqual(computeSafeToSpend(5000, 5500, 5), 0);
});

test('Days until next allowance calculation', () => {
  const midMonth = new Date(2026, 10, 15); // Nov 15
  // Next 1st of month: 16 days left
  const daysLeft = calculateDaysUntilNextIncome('monthly', '1', midMonth);
  assert.ok(daysLeft > 10 && daysLeft <= 17);
});

test('Baseline & Overspend Detection Logic (<14 days vs >=14 days)', async () => {
  const testDbPath = path.join(__dirname, 'test-insights.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const db = await initDb(testDbPath);
  const migrationSQL = fs.readFileSync(path.join(__dirname, '../migrations/001_init.sql'), 'utf-8');
  db.exec(migrationSQL);

  const userId = crypto.randomUUID();
  const now = new Date();
  const nowISO = now.toISOString();

  // Create user with ₹10,000 monthly allowance
  db.prepare(`
    INSERT INTO users (id, email, password_hash, monthly_income, income_frequency, income_arrival_date, created_at, updated_at)
    VALUES (?, 'student@test.com', 'hash', 10000, 'monthly', '1', ?, ?)
  `).run(userId, nowISO, nowISO);

  // User category: Food
  const catId = crypto.randomUUID();
  db.prepare(`INSERT INTO categories (id, user_id, name, icon, color) VALUES (?, ?, 'Food', 'UtensilsCrossed', '#FF5C8A')`).run(catId, userId);

  // 1. Test with only 2 days of data: MUST NOT claim baseline!
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO transactions (id, user_id, category_id, amount, payment_method, date, merchant, created_at, updated_at)
    VALUES (?, ?, ?, 300, 'upi', ?, 'Swiggy', ?, ?)
  `).run(crypto.randomUUID(), userId, catId, twoDaysAgo, nowISO, nowISO);

  let result = runInsightsEngine(db, userId, 'en');
  assert.strictEqual(result.hasBaseline, false);
  assert.ok(result.insights.some(i => i.type === 'pacing'));

  // 2. Add historical data 20 days ago (now >= 14 days of data!)
  const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO transactions (id, user_id, category_id, amount, payment_method, date, merchant, created_at, updated_at)
    VALUES (?, ?, ?, 200, 'upi', ?, 'College Canteen', ?, ?)
  `).run(crypto.randomUUID(), userId, catId, twentyDaysAgo, nowISO, nowISO);

  // Add historical weekly baseline spend of ₹300 (over 3 weeks ago)
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO transactions (id, user_id, category_id, amount, payment_method, date, merchant, created_at, updated_at)
    VALUES (?, ?, ?, 300, 'upi', ?, 'Mess', ?, ?)
  `).run(crypto.randomUUID(), userId, catId, fifteenDaysAgo, nowISO, nowISO);

  // Add THIS week spend of ₹1,200 (>30% above baseline AND >₹200 difference)
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO transactions (id, user_id, category_id, amount, payment_method, date, merchant, created_at, updated_at)
    VALUES (?, ?, ?, 1200, 'upi', ?, 'Dominos Party', ?, ?)
  `).run(crypto.randomUUID(), userId, catId, yesterday, nowISO, nowISO);

  result = runInsightsEngine(db, userId, 'en');
  assert.strictEqual(result.hasBaseline, true);
  // Verify overspend insight was triggered
  const overspendInsight = result.insights.find(i => i.type === 'overspend');
  assert.ok(overspendInsight);
  assert.strictEqual(overspendInsight.category, 'Food');

  // Cleanup
  db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

