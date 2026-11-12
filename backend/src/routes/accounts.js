const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');

function createAccountsRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', (req, res) => {
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id=? ORDER BY is_default DESC, name').all(req.userId);
    res.json(accounts);
  });

  router.post('/', (req, res) => {
    const { name, type, balance } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
    if (!['cash', 'bank', 'wallet'].includes(type)) return res.status(400).json({ error: 'Type must be cash, bank, or wallet' });
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO accounts (id, user_id, name, type, balance, is_default, created_at) VALUES (?,?,?,?,?,0,?)')
      .run(id, req.userId, name.trim(), type, parseFloat(balance) || 0, new Date().toISOString());
    res.status(201).json(db.prepare('SELECT * FROM accounts WHERE id=?').get(id));
  });

  router.put('/:id', (req, res) => {
    const { name, balance } = req.body;
    db.prepare('UPDATE accounts SET name=COALESCE(?,name), balance=COALESCE(?,balance) WHERE id=? AND user_id=?')
      .run(name, balance, req.params.id, req.userId);
    const account = db.prepare('SELECT * FROM accounts WHERE id=? AND user_id=?').get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  });

  router.post('/transfer', (req, res) => {
    const { from_id, to_id, amount } = req.body;
    const amt = parseFloat(amount);
    if (!from_id || !to_id || !amt || amt <= 0) return res.status(400).json({ error: 'Valid from, to, and amount required' });
    if (from_id === to_id) return res.status(400).json({ error: 'Cannot transfer to the same account' });

    const from = db.prepare('SELECT * FROM accounts WHERE id=? AND user_id=?').get(from_id, req.userId);
    const to = db.prepare('SELECT * FROM accounts WHERE id=? AND user_id=?').get(to_id, req.userId);
    if (!from || !to) return res.status(404).json({ error: 'Account not found' });

    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id=?').run(amt, from_id);
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id=?').run(amt, to_id);
    res.json({ message: 'Transfer complete', from: from.name, to: to.name, amount: amt });
  });

  router.delete('/:id', (req, res) => {
    const account = db.prepare('SELECT * FROM accounts WHERE id=? AND user_id=?').get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.is_default) return res.status(400).json({ error: 'Cannot delete default account' });
    db.prepare('DELETE FROM accounts WHERE id=?').run(req.params.id);
    res.json({ message: 'Deleted' });
  });

  return router;
}

module.exports = createAccountsRouter;

