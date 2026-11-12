const express = require('express');
const { authMiddleware } = require('../middleware/auth');

function createExportRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/csv', (req, res) => {
    try {
      const expenses = db.prepare(`
        SELECT t.date, t.amount, c.name as category, t.payment_method, t.merchant, t.note, t.tag
        FROM transactions t 
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.is_deleted = 0
        ORDER BY t.date DESC
      `).all(req.userId);

      let csv = 'Date,Amount,Category,Payment Method,Merchant,Note,Tag\n';
      for (const e of expenses) {
        csv += `"${e.date}",${e.amount},"${e.category || ''}","${e.payment_method}","${(e.merchant || '').replace(/"/g, '""')}","${(e.note || '').replace(/"/g, '""')}","${e.tag || ''}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=paisa-bachao-expenses.csv');
      res.send(csv);
    } catch {
      res.status(500).json({ error: 'Export failed' });
    }
  });

  return router;
}

module.exports = createExportRouter;
