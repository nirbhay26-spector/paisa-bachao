const test = require('node:test');
const assert = require('node:assert');
const { initDb } = require('../src/utils/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

test('Multi-tenant data isolation verification', async () => {
  const testDbPath = path.join(__dirname, 'test-isolation.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const db = await initDb(testDbPath);
  const migrationSQL = fs.readFileSync(path.join(__dirname, '../migrations/001_init.sql'), 'utf-8');
  db.exec(migrationSQL);

  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create User A and User B
  db.prepare(`INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, 'a@test.com', 'hash', ?, ?)`).run(userA, now, now);
  db.prepare(`INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, 'b@test.com', 'hash', ?, ?)`).run(userB, now, now);

  // Insert expense for User A
  const expA = crypto.randomUUID();
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, payment_method, date, note, merchant, created_at, updated_at)
    VALUES (?, ?, 500, 'upi', ?, 'Secret Lunch', 'Swiggy', ?, ?)
  `).run(expA, userA, now, now, now);

  // Insert expense for User B
  const expB = crypto.randomUUID();
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, payment_method, date, note, merchant, created_at, updated_at)
    VALUES (?, ?, 1200, 'upi', ?, 'Private Shoes', 'Nike', ?, ?)
  `).run(expB, userB, now, now, now);

  // Query as User A: must ONLY return User A's expense
  const resultsForUserA = db.prepare('SELECT * FROM transactions WHERE user_id = ? AND is_deleted = 0').all(userA);
  assert.strictEqual(resultsForUserA.length, 1);
  assert.strictEqual(resultsForUserA[0].id, expA);
  assert.strictEqual(resultsForUserA[0].amount, 500);

  // Query as User B: must ONLY return User B's expense
  const resultsForUserB = db.prepare('SELECT * FROM transactions WHERE user_id = ? AND is_deleted = 0').all(userB);
  assert.strictEqual(resultsForUserB.length, 1);
  assert.strictEqual(resultsForUserB[0].id, expB);
  assert.strictEqual(resultsForUserB[0].amount, 1200);

  // Cleanup
  db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

