const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');
const MockBankProvider = require('../bank/MockBankProvider');

function createBankRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  const providerType = process.env.BANK_PROVIDER || 'mock';
  let provider;
  if (providerType === 'setu') {
    const SetuAAProvider = require('../bank/SetuAAProvider');
    provider = new SetuAAProvider();
  } else {
    provider = new MockBankProvider();
  }

  // GET /api/bank/accounts
  router.get('/accounts', async (req, res) => {
    try {
      const accounts = await provider.getAccounts();
      res.json({ accounts, provider: providerType });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/bank/transactions
  router.get('/transactions', async (req, res) => {
    try {
      const { account_id, from, to } = req.query;
      const txns = await provider.getTransactions(account_id || 'mock-savings-1', from, to);
      res.json({ transactions: txns, provider: providerType });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/bank/import — Imports as flagged sample data (is_sample = 1)
  router.post('/import', async (req, res) => {
    try {
      const { account_id, from, to } = req.body;
      const txns = await provider.getTransactions(account_id || 'mock-savings-1', from, to);
      const debits = txns.filter(t => t.type === 'debit');

      // Tag all imported sample transactions with is_sample = 1
      const insertExp = db.prepare(`
        INSERT INTO transactions (id, user_id, amount, payment_method, date, merchant, bank_ref, note, is_sample, is_deleted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
      `);

      let imported = 0;
      let skipped = 0;

      for (const txn of debits) {
        if (txn.reference) {
          const dup = db.prepare('SELECT id FROM transactions WHERE user_id = ? AND bank_ref = ?').get(req.userId, txn.reference);
          if (dup) { skipped++; continue; }
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        insertExp.run(id, req.userId, txn.amount, txn.payment_method || 'upi', txn.date, txn.merchant || '', txn.reference || '', txn.description || '', now, now);
        imported++;
      }

      db.prepare('UPDATE users SET sample_data_enabled = 1 WHERE id = ?').run(req.userId);
      res.json({ imported, skipped, total: debits.length, is_sample: true });
    } catch (err) {
      console.error('Bank import error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createBankRouter;
