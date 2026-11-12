const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');

function createSplitsRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  // GET /api/splits — Backward-compatible quick splits
  router.get('/', (req, res) => {
    try {
      const splits = db.prepare('SELECT * FROM splits WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
      const enriched = splits.map((s) => {
        const members = db.prepare('SELECT * FROM split_members WHERE split_id = ?').all(s.id);
        const total_paid = members.filter((m) => m.is_paid).reduce((sum, m) => sum + m.amount_owed, 0);
        const total_pending = members.filter((m) => !m.is_paid).reduce((sum, m) => sum + m.amount_owed, 0);
        return { ...s, members, total_paid, total_pending };
      });
      res.json(enriched);
    } catch {
      res.status(500).json({ error: 'Failed to load splits' });
    }
  });

  // POST /api/splits — Backward-compatible quick split creation
  router.post('/', (req, res) => {
    try {
      const { description, total_amount, members, transaction_id } = req.body;
      if (!description || !total_amount || !members || !members.length) {
        return res.status(400).json({ error: 'Description, amount, and members are required' });
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO splits (id, user_id, transaction_id, description, total_amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, req.userId, transaction_id || null, description.trim(), parseFloat(total_amount), now);

      const insertMember = db.prepare('INSERT INTO split_members (id, split_id, name, amount_owed, is_paid) VALUES (?, ?, ?, ?, 0)');
      for (const m of members) {
        insertMember.run(crypto.randomUUID(), id, m.name.trim(), parseFloat(m.amount_owed));
      }

      const split = db.prepare('SELECT * FROM splits WHERE id = ?').get(id);
      const savedMembers = db.prepare('SELECT * FROM split_members WHERE split_id = ?').all(id);
      res.status(201).json({ ...split, members: savedMembers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create split' });
    }
  });

  // PUT /api/splits/:splitId/members/:memberId/pay
  router.put('/:splitId/members/:memberId/pay', (req, res) => {
    try {
      const member = db.prepare(`
        SELECT sm.* FROM split_members sm
        JOIN splits s ON sm.split_id = s.id
        WHERE sm.id = ? AND s.user_id = ?
      `).get(req.params.memberId, req.userId);
      if (!member) return res.status(404).json({ error: 'Member not found' });

      db.prepare('UPDATE split_members SET is_paid = 1 WHERE id = ?').run(req.params.memberId);
      res.json({ message: 'Marked as paid' });
    } catch {
      res.status(500).json({ error: 'Failed to update' });
    }
  });

  // DELETE /api/splits/:id
  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM splits WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ message: 'Deleted' });
  });

  // --- NEW FULL SPLIT GROUPS SYSTEM (UPDATE 3) ---

  // GET /api/splits/groups — Get all groups with debt balances
  router.get('/groups/all', (req, res) => {
    try {
      const groups = db.prepare('SELECT * FROM split_groups WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
      const enriched = groups.map((g) => {
        const members = db.prepare('SELECT * FROM group_members WHERE group_id = ?').all(g.id);
        const expenses = db.prepare('SELECT * FROM group_expenses WHERE group_id = ? ORDER BY date DESC').all(g.id);
        const expenseIds = expenses.map(e => e.id);

        let totalGroupSpend = expenses.reduce((s, e) => s + e.amount, 0);
        return {
          ...g,
          members,
          expensesCount: expenses.length,
          totalSpend: totalGroupSpend
        };
      });
      res.json(enriched);
    } catch (err) {
      console.error('Error fetching groups:', err);
      res.status(500).json({ error: 'Failed to fetch split groups' });
    }
  });

  // POST /api/splits/groups — Create group with initial members
  router.post('/groups', (req, res) => {
    try {
      const { name, emoji, members } = req.body;
      if (!name) return res.status(400).json({ error: 'Group name is required' });

      const groupId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO split_groups (id, user_id, name, emoji, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(groupId, req.userId, name.trim(), emoji || '👥', now);

      // Add user themselves as member #1
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.userId);
      const myName = user?.name || 'You';
      db.prepare('INSERT INTO group_members (id, group_id, name) VALUES (?, ?, ?)').run(crypto.randomUUID(), groupId, myName);

      // Add friends
      if (Array.isArray(members)) {
        const insertMember = db.prepare('INSERT INTO group_members (id, group_id, name, upi_id, phone) VALUES (?, ?, ?, ?, ?)');
        for (const m of members) {
          if (m.name && m.name.trim() && m.name.trim() !== myName) {
            insertMember.run(crypto.randomUUID(), groupId, m.name.trim(), m.upi_id || null, m.phone || null);
          }
        }
      }

      const created = db.prepare('SELECT * FROM split_groups WHERE id = ?').get(groupId);
      const createdMembers = db.prepare('SELECT * FROM group_members WHERE group_id = ?').all(groupId);
      res.status(201).json({ ...created, members: createdMembers });
    } catch (err) {
      console.error('Create group error:', err);
      res.status(500).json({ error: 'Failed to create group' });
    }
  });

  // POST /api/splits/groups/:groupId/expenses — Add group expense with split shares
  router.post('/groups/:groupId/expenses', (req, res) => {
    try {
      const { groupId } = req.params;
      const { payer_name, amount, description, split_type, shares } = req.body;

      if (!payer_name || !amount || !description || !shares || !shares.length) {
        return res.status(400).json({ error: 'Payer, amount, description, and shares are required' });
      }

      const expenseId = crypto.randomUUID();
      const now = new Date().toISOString();
      const numAmount = parseFloat(amount);

      db.prepare(`
        INSERT INTO group_expenses (id, user_id, group_id, payer_name, amount, description, split_type, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(expenseId, req.userId, groupId, payer_name, numAmount, description.trim(), split_type || 'equal', now, now);

      const insertShare = db.prepare(`
        INSERT INTO group_expense_shares (id, expense_id, member_name, share_amount, is_settled)
        VALUES (?, ?, ?, ?, ?)
      `);

      let myShareAmount = 0;
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.userId);
      const myName = (user?.name || 'You').toLowerCase();

      for (const s of shares) {
        const isSettled = s.member_name === payer_name ? 1 : 0;
        insertShare.run(crypto.randomUUID(), expenseId, s.member_name, parseFloat(s.share_amount), isSettled);

        if (s.member_name.toLowerCase() === myName || s.member_name.toLowerCase() === 'you') {
          myShareAmount = parseFloat(s.share_amount);
        }
      }

      // Auto-log user's share to their personal transactions (Section 5 requirement)
      // Only log user's own share so money owed to them is NOT counted as spent money!
      if (myShareAmount > 0) {
        const txnId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO transactions (id, user_id, amount, payment_method, date, note, merchant, tag, is_sample, is_deleted, created_at, updated_at)
          VALUES (?, ?, ?, 'upi', ?, ?, ?, 'want', 0, 0, ?, ?)
        `).run(
          txnId, req.userId, myShareAmount, now, 
          `Split Bill: ${description.trim()}`, `Split (${description.trim()})`, now, now
        );
      }

      res.status(201).json({ message: 'Expense added and user share auto-logged to personal tracker', expenseId });
    } catch (err) {
      console.error('Group expense error:', err);
      res.status(500).json({ error: 'Failed to record expense' });
    }
  });

  // GET /api/splits/groups/:groupId/details — Get group details, expenses, and simplified debt
  router.get('/groups/:groupId/details', (req, res) => {
    try {
      const { groupId } = req.params;
      const group = db.prepare('SELECT * FROM split_groups WHERE id = ? AND user_id = ?').get(groupId, req.userId);
      if (!group) return res.status(404).json({ error: 'Group not found' });

      const members = db.prepare('SELECT * FROM group_members WHERE group_id = ?').all(groupId);
      const expenses = db.prepare('SELECT * FROM group_expenses WHERE group_id = ? ORDER BY created_at DESC').all(groupId);

      const enrichedExpenses = expenses.map(e => {
        const shares = db.prepare('SELECT * FROM group_expense_shares WHERE expense_id = ?').all(e.id);
        return { ...e, shares };
      });

      // Calculate simplified debts
      const netBalances = {};
      for (const m of members) {
        netBalances[m.name] = 0;
      }

      for (const e of enrichedExpenses) {
        const payer = e.payer_name;
        for (const s of e.shares) {
          if (!s.is_settled && s.member_name !== payer) {
            netBalances[payer] = (netBalances[payer] || 0) + s.share_amount;
            netBalances[s.member_name] = (netBalances[s.member_name] || 0) - s.share_amount;
          }
        }
      }

      // Simplified debt settlement algorithm
      const debtors = [];
      const creditors = [];

      for (const [person, balance] of Object.entries(netBalances)) {
        const rounded = Math.round(balance * 100) / 100;
        if (rounded < -0.5) debtors.push({ person, amount: -rounded });
        else if (rounded > 0.5) creditors.push({ person, amount: rounded });
      }

      const settlements = [];
      let i = 0, j = 0;
      while (i < debtors.length && j < creditors.length) {
        const payAmount = Math.min(debtors[i].amount, creditors[j].amount);
        if (payAmount > 0.5) {
          settlements.push({
            from: debtors[i].person,
            to: creditors[j].person,
            amount: Math.round(payAmount)
          });
        }

        debtors[i].amount -= payAmount;
        creditors[j].amount -= payAmount;

        if (debtors[i].amount < 0.5) i++;
        if (creditors[j].amount < 0.5) j++;
      }

      res.json({
        group,
        members,
        expenses: enrichedExpenses,
        netBalances,
        settlements
      });
    } catch (err) {
      console.error('Group details error:', err);
      res.status(500).json({ error: 'Failed to fetch details' });
    }
  });

  // PUT /api/splits/shares/:shareId/settle
  router.put('/shares/:shareId/settle', (req, res) => {
    try {
      const now = new Date().toISOString();
      db.prepare('UPDATE group_expense_shares SET is_settled = 1, settled_at = ? WHERE id = ?').run(now, req.params.shareId);
      res.json({ message: 'Share marked as settled' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to settle share' });
    }
  });

  return router;
}

module.exports = createSplitsRouter;
