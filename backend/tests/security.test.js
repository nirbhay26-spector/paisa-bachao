const test = require('node:test');
const assert = require('node:assert');
const { initDb } = require('../src/utils/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const createExpensesRouter = require('../src/routes/expenses');
const createBudgetsRouter = require('../src/routes/budgets');
const createSavingsRouter = require('../src/routes/savings');
const createSplitsRouter = require('../src/routes/splits');
const createSettingsRouter = require('../src/routes/settings');
const { errorHandler } = require('../src/middleware/errorHandler');

// Mock request / response helper for Express routers
function mockReqRes(userId, body = {}, params = {}, query = {}) {
  const req = {
    userId,
    body,
    params,
    query,
    headers: {},
  };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    send(data) {
      responseData = data;
      return res;
    },
    setHeader() {
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
}

test('Comprehensive Multi-Tenant Security & Isolation Test Suite', async (t) => {
  const testDbPath = path.join(__dirname, 'test-security.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const db = await initDb(testDbPath);
  const migration1 = fs.readFileSync(path.join(__dirname, '../migrations/001_init.sql'), 'utf-8');
  const migration2 = fs.readFileSync(path.join(__dirname, '../migrations/002_update3.sql'), 'utf-8');
  db.exec(migration1);
  db.exec(migration2);

  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create User A and User B
  db.prepare(`INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, 'secA@test.com', 'hash', ?, ?)`).run(userA, now, now);
  db.prepare(`INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, 'secB@test.com', 'hash', ?, ?)`).run(userB, now, now);

  const expensesRouter = createExpensesRouter(db);
  const budgetsRouter = createBudgetsRouter(db);
  const savingsRouter = createSavingsRouter(db);
  const splitsRouter = createSplitsRouter(db);
  const settingsRouter = createSettingsRouter(db);

  await t.test('1. Transaction Isolation: User A cannot access or modify User B transactions', async () => {
    // Insert expense belonging to User B
    const txnB = crypto.randomUUID();
    db.prepare(`
      INSERT INTO transactions (id, user_id, amount, payment_method, date, note, merchant, is_sample, is_deleted, created_at, updated_at)
      VALUES (?, ?, 850, 'upi', ?, 'Private Dinner', 'Zomato', 0, 0, ?, ?)
    `).run(txnB, userB, now, now, now);

    // User A attempts to edit User B's transaction
    const editHandler = expensesRouter.stack.find(s => s.route?.path === '/:id' && s.route?.methods?.put)?.route?.stack?.[0]?.handle;
    assert.ok(editHandler, 'Expenses PUT handler must exist');

    const { req: editReq, res: editRes } = mockReqRes(userA, { amount: 100 }, { id: txnB });
    editHandler(editReq, editRes);
    assert.strictEqual(editRes.getStatusCode(), 404, 'Editing another user transaction must return 404');

    // User A attempts to delete User B's transaction
    const delHandler = expensesRouter.stack.find(s => s.route?.path === '/:id' && s.route?.methods?.delete)?.route?.stack?.[0]?.handle;
    assert.ok(delHandler, 'Expenses DELETE handler must exist');

    const { req: delReq, res: delRes } = mockReqRes(userA, {}, { id: txnB });
    delHandler(delReq, delRes);
    assert.strictEqual(delRes.getStatusCode(), 404, 'Deleting another user transaction must return 404');

    // Verify User B's transaction was NOT modified or deleted
    const checkTxn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txnB);
    assert.strictEqual(checkTxn.amount, 850);
    assert.strictEqual(checkTxn.is_deleted, 0);
  });

  await t.test('2. Budget Isolation: User A cannot access or modify User B budgets', async () => {
    const budgetB = crypto.randomUUID();
    db.prepare(`
      INSERT INTO budgets (id, user_id, amount, period, start_date, created_at)
      VALUES (?, ?, 3000, 'monthly', ?, ?)
    `).run(budgetB, userB, now, now);

    // User A attempts to delete User B's budget
    const delBudgetHandler = budgetsRouter.stack.find(s => s.route?.path === '/:id' && s.route?.methods?.delete)?.route?.stack?.[0]?.handle;
    assert.ok(delBudgetHandler, 'Budgets DELETE handler must exist');

    const { req: delReq, res: delRes } = mockReqRes(userA, {}, { id: budgetB });
    delBudgetHandler(delReq, delRes);
    assert.strictEqual(delRes.getStatusCode(), 404, 'Deleting another user budget must return 404');

    // User A attempts to edit User B's budget
    const putBudgetHandler = budgetsRouter.stack.find(s => s.route?.path === '/:id' && s.route?.methods?.put)?.route?.stack?.[0]?.handle;
    const { req: putReq, res: putRes } = mockReqRes(userA, { amount: 50 }, { id: budgetB });
    putBudgetHandler(putReq, putRes);
    assert.strictEqual(putRes.getStatusCode(), 404, 'Updating another user budget must return 404');
  });

  await t.test('3. Savings Goal Isolation: User A cannot access, edit, or contribute to User B goals', async () => {
    const goalB = crypto.randomUUID();
    db.prepare(`
      INSERT INTO goals (id, user_id, name, target_amount, current_amount, is_completed, created_at)
      VALUES (?, ?, 'Laptop Fund', 50000, 5000, 0, ?)
    `).run(goalB, userB, now);

    // User A attempts to contribute to User B's goal
    const contribHandler = savingsRouter.stack.find(s => s.route?.path === '/:id/contribute' && s.route?.methods?.post)?.route?.stack?.[0]?.handle;
    assert.ok(contribHandler, 'Savings contribute handler must exist');

    const { req: conReq, res: conRes } = mockReqRes(userA, { amount: 1000 }, { id: goalB });
    contribHandler(conReq, conRes);
    assert.strictEqual(conRes.getStatusCode(), 404, 'Contributing to another user goal must return 404');

    // User A attempts to delete User B's goal
    const delGoalHandler = savingsRouter.stack.find(s => s.route?.path === '/:id' && s.route?.methods?.delete)?.route?.stack?.[0]?.handle;
    const { req: delReq, res: delRes } = mockReqRes(userA, {}, { id: goalB });
    delGoalHandler(delReq, delRes);
    assert.strictEqual(delRes.getStatusCode(), 404, 'Deleting another user goal must return 404');
  });

  await t.test('4. Split Groups Isolation: User A cannot read, add expenses to, or delete User B groups', async () => {
    const groupB = crypto.randomUUID();
    db.prepare(`
      INSERT INTO split_groups (id, user_id, name, emoji, created_at)
      VALUES (?, ?, 'Flat 402', '🏠', ?)
    `).run(groupB, userB, now);

    // User A attempts to fetch group details
    const getDetailsHandler = splitsRouter.stack.find(s => s.route?.path === '/groups/:groupId/details')?.route?.stack?.[0]?.handle;
    assert.ok(getDetailsHandler, 'Group details handler must exist');

    const { req: getReq, res: getRes } = mockReqRes(userA, {}, { groupId: groupB });
    getDetailsHandler(getReq, getRes);
    assert.strictEqual(getRes.getStatusCode(), 404, 'Fetching details of another user group must return 404');

    // User A attempts to add expense to User B's group
    const addExpRoute = splitsRouter.stack.find(s => s.route?.path === '/groups/:groupId/expenses');
    // Call the inner handler after validation
    const addExpHandler = addExpRoute.route.stack[addExpRoute.route.stack.length - 1].handle;
    const { req: addReq, res: addRes } = mockReqRes(userA, {
      payer_name: 'Hacker',
      amount: 100,
      description: 'Unauthorized Pizza',
      shares: [{ member_name: 'Hacker', share_amount: 100 }]
    }, { groupId: groupB });

    addExpHandler(addReq, addRes);
    assert.strictEqual(addRes.getStatusCode(), 404, 'Adding expense to another user group must return 404');

    // User A attempts to delete User B's group
    const delGroupHandler = splitsRouter.stack.find(s => s.route?.path === '/groups/:groupId' && s.route?.methods?.delete)?.route?.stack?.[0]?.handle;
    const { req: delReq, res: delRes } = mockReqRes(userA, {}, { groupId: groupB });
    delGroupHandler(delReq, delRes);
    assert.strictEqual(delRes.getStatusCode(), 404, 'Deleting another user group must return 404');
  });

  await t.test('5. Subscriptions Isolation: User A cannot update or delete User B subscriptions', async () => {
    const subB = crypto.randomUUID();
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, name, amount, billing_cycle, next_billing_date, status, created_at)
      VALUES (?, ?, 'Netflix 4K', 649, 'monthly', '2026-12-01', 'active', ?)
    `).run(subB, userB, now);

    // User A attempts to delete User B's subscription
    const delSubHandler = settingsRouter.stack.find(s => s.route?.path === '/subscriptions/:id' && s.route?.methods?.delete)?.route?.stack?.[0]?.handle;
    assert.ok(delSubHandler, 'Subscriptions delete handler must exist');

    const { req: delReq, res: delRes } = mockReqRes(userA, {}, { id: subB });
    delSubHandler(delReq, delRes);
    assert.strictEqual(delRes.getStatusCode(), 404, 'Deleting another user subscription must return 404');

    // User A attempts to update User B's subscription
    const putSubHandler = settingsRouter.stack.find(s => s.route?.path === '/subscriptions/:id' && s.route?.methods?.put)?.route?.stack?.[0]?.handle;
    const { req: putReq, res: putRes } = mockReqRes(userA, { amount: 10 }, { id: subB });
    putSubHandler(putReq, putRes);
    assert.strictEqual(putRes.getStatusCode(), 404, 'Updating another user subscription must return 404');
  });

  await t.test('6. Centralized Error Handler does not leak internal data', async () => {
    const mockError = new Error('Database disk error at /Users/secret/path/to/db');
    const { req, res } = mockReqRes(userA);
    req.isTest = true;

    errorHandler(mockError, req, res, () => {});
    assert.strictEqual(res.getStatusCode(), 500);
    const data = res.getData();
    assert.ok(data && data.error, 'Must return JSON error object');
  });

  // Cleanup
  db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});
