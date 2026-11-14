const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initDb } = require('../src/utils/db');
const createAuthRouter = require('../src/routes/auth');

describe('Auth & Profile Operations Test Suite', async () => {
  let db;
  let authRouter;

  before(async () => {
    db = await initDb(':memory:');
    const m1 = fs.readFileSync(path.join(__dirname, '../migrations/001_init.sql'), 'utf-8');
    db.exec(m1);
    const m2 = fs.readFileSync(path.join(__dirname, '../migrations/002_update3.sql'), 'utf-8');
    db.exec(m2);
    try {
      db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT '🐼'");
    } catch (e) {}

    authRouter = createAuthRouter(db);
  });

  after(() => {
    if (db) db.close();
  });

  // Direct router dispatch helper without TCP socket
  function dispatch(method, url, body = {}, headers = {}) {
    return new Promise((resolve) => {
      const req = {
        method,
        url,
        baseUrl: '',
        originalUrl: url,
        path: url.split('?')[0],
        query: {},
        headers: { 'content-type': 'application/json', ...headers },
        body
      };

      const res = {
        statusCode: 200,
        headers: {},
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          resolve({ status: this.statusCode, body: data });
        },
        setHeader(name, val) {
          this.headers[name] = val;
        }
      };

      authRouter.handle(req, res, (err) => {
        if (err) resolve({ status: 500, body: { error: err.message } });
        else resolve({ status: 404, body: { error: 'Not found' } });
      });
    });
  }

  let userToken = '';
  let userId = '';

  test('1. User Registration (Clean Start)', async () => {
    const res = await dispatch('POST', '/register', {
      name: 'Nirbhay',
      email: 'test@example.com',
      password: 'secretPassword123'
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.token, 'Token returned');
    assert.equal(res.body.user.email, 'test@example.com');
    assert.equal(res.body.user.monthly_income, 0, 'Starts with zero allowance');

    userToken = res.body.token;
    userId = res.body.user.id;
  });

  test('2. Login with Invalid Credentials returns friendly error', async () => {
    const res = await dispatch('POST', '/login', {
      email: 'test@example.com',
      password: 'wrongPassword'
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid email or password');
  });

  test('3. Login with Correct Credentials succeeds', async () => {
    const res = await dispatch('POST', '/login', {
      email: 'test@example.com',
      password: 'secretPassword123'
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.name, 'Nirbhay');
  });

  test('4. Refresh / GET /me persists logged in state', async () => {
    const res = await dispatch('GET', '/me', {}, {
      authorization: `Bearer ${userToken}`
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.email, 'test@example.com');
  });

  test('5. Update Profile & Pocket Money versioning in allowance_history', async () => {
    const res = await dispatch('PUT', '/me', {
      name: 'Nirbhay Chauhan',
      monthly_income: 6000,
      income_frequency: 'monthly',
      income_arrival_date: '5',
      avatar: '🦊'
    }, {
      authorization: `Bearer ${userToken}`
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.monthly_income, 6000);
    assert.equal(res.body.avatar, '🦊');

    // Verify allowance_history was recorded
    const history = db.prepare('SELECT * FROM allowance_history WHERE user_id = ?').all(userId);
    assert.equal(history.length, 1);
    assert.equal(history[0].amount, 6000);
  });

  test('6. Forgot Password generates token and allows reset', async () => {
    const forgotRes = await dispatch('POST', '/forgot-password', {
      email: 'test@example.com'
    });
    assert.equal(forgotRes.status, 200);
    assert.ok(forgotRes.body.dev_token);

    const resetRes = await dispatch('POST', '/reset-password', {
      token: forgotRes.body.dev_token,
      new_password: 'newSuperPassword456'
    });
    assert.equal(resetRes.status, 200);

    // Verify login with new password succeeds
    const loginRes = await dispatch('POST', '/login', {
      email: 'test@example.com',
      password: 'newSuperPassword456'
    });
    assert.equal(loginRes.status, 200);
    userToken = loginRes.body.token;
  });

  test('7. Update Email with current password verification', async () => {
    const badRes = await dispatch('PUT', '/email', {
      new_email: 'nirbhay.updated@example.com',
      current_password: 'wrongPassword'
    }, {
      authorization: `Bearer ${userToken}`
    });
    assert.equal(badRes.status, 401);

    const goodRes = await dispatch('PUT', '/email', {
      new_email: 'nirbhay.updated@example.com',
      current_password: 'newSuperPassword456'
    }, {
      authorization: `Bearer ${userToken}`
    });
    assert.equal(goodRes.status, 200);
    assert.equal(goodRes.body.user.email, 'nirbhay.updated@example.com');
  });

  test('8. Delete Account requires exact DELETE keyword', async () => {
    const badRes = await dispatch('DELETE', '/account', { confirmation: 'NO' }, {
      authorization: `Bearer ${userToken}`
    });
    assert.equal(badRes.status, 400);

    const goodRes = await dispatch('DELETE', '/account', { confirmation: 'DELETE' }, {
      authorization: `Bearer ${userToken}`
    });
    assert.equal(goodRes.status, 200);

    // User should no longer exist
    const check = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    assert.equal(check, undefined);
  });
});
