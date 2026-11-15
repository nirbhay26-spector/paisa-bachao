const express = require('express');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const { parseBankSMS } = require('../utils/smsParser');
const { authMiddleware } = require('../middleware/auth');
const { suggestCategoryAndTag } = require('../../../shared/categories');

function createImportRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  // POST /api/import/preview — Review table with category suggestions and duplicate warnings
  router.post('/preview', (req, res) => {
    try {
      const { csv_text } = req.body;
      if (!csv_text) return res.status(400).json({ error: 'CSV text is required' });

      let records;
      try {
        records = parse(csv_text, { columns: true, skip_empty_lines: true, trim: true });
      } catch {
        return res.status(400).json({ error: 'Invalid CSV format' });
      }

      const previewRows = [];
      for (const row of records) {
        const amountStr = row['Amount'] || row['amount'] || row['Debit'] || row['debit'] || row['Transaction Amount'] || '';
        const amount = parseFloat(amountStr.replace(/[,₹Rs.]/g, ''));
        if (!amount || amount <= 0) continue;

        const merchant = (row['Description'] || row['Narration'] || row['Particulars'] || row['description'] || 'Spend').trim().slice(0, 200);
        const dateStr = (row['Date'] || row['date'] || row['Transaction Date'] || '').trim();
        let date;
        try {
          date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
        } catch {
          date = new Date().toISOString();
        }

        const dateSlice = date.slice(0, 10);
        const dup = db.prepare(`
          SELECT id FROM transactions 
          WHERE user_id = ? AND is_deleted = 0 
            AND amount = ? 
            AND (LOWER(merchant) = LOWER(?) OR date LIKE ?)
          LIMIT 1
        `).get(req.userId, amount, merchant, `${dateSlice}%`);

        const intel = suggestCategoryAndTag(merchant);

        previewRows.push({
          amount,
          merchant,
          date: dateSlice,
          category_id: intel.category,
          tag: intel.tag,
          is_duplicate: !!dup
        });
      }

      res.json({ total: previewRows.length, rows: previewRows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  });

  // POST /api/import/csv
  router.post('/csv', (req, res) => {
    try {
      const { csv_text } = req.body;
      if (!csv_text) return res.status(400).json({ error: 'CSV text is required' });

      let records;
      try {
        records = parse(csv_text, { columns: true, skip_empty_lines: true, trim: true });
      } catch {
        return res.status(400).json({ error: 'Invalid CSV format' });
      }

      const imported = [];
      const insertExp = db.prepare(`
        INSERT INTO transactions (id, user_id, amount, payment_method, date, note, merchant, bank_ref, is_sample, is_deleted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
      `);

      for (const row of records) {
        const amountStr = row['Amount'] || row['amount'] || row['Debit'] || row['debit'] || row['Transaction Amount'] || '';
        const amount = parseFloat(amountStr.replace(/[,₹Rs.]/g, ''));
        if (!amount || amount <= 0) continue;

        const ref = row['Reference'] || row['Ref No'] || row['ref'] || row['UPI Ref'] || null;
        if (ref) {
          const dup = db.prepare('SELECT id FROM transactions WHERE user_id = ? AND bank_ref = ?').get(req.userId, ref);
          if (dup) continue;
        }

        const merchant = row['Description'] || row['Narration'] || row['Particulars'] || row['description'] || '';
        const dateStr = row['Date'] || row['date'] || row['Transaction Date'] || '';
        let date;
        try {
          date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
        } catch {
          date = new Date().toISOString();
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        insertExp.run(id, req.userId, amount, 'bank', date, '', merchant.trim().slice(0, 200), ref, now, now);
        imported.push({ id, amount, merchant: merchant.trim(), date });
      }

      // Generate question prompt for imported spends
      const insertQ = db.prepare(`
        INSERT INTO question_prompts (id, user_id, transaction_id, question_text, question_type, status, created_at)
        VALUES (?, ?, ?, ?, 'need_want', 'pending', ?)
      `);
      for (const exp of imported) {
        const now = new Date().toISOString();
        insertQ.run(
          crypto.randomUUID(),
          req.userId,
          exp.id,
          `You spent ₹${exp.amount}${exp.merchant ? ` at ${exp.merchant}` : ''}. Was this a need or a want?`,
          now
        );
      }

      res.json({ imported: imported.length, skipped: records.length - imported.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to import CSV' });
    }
  });

  // POST /api/import/sms
  router.post('/sms', (req, res) => {
    try {
      const { sms_text } = req.body;
      if (!sms_text) return res.status(400).json({ error: 'SMS text is required' });

      const messages = sms_text.split(/\n\n|\r\n\r\n/).filter((s) => s.trim());
      const results = [];
      const insertExp = db.prepare(`
        INSERT INTO transactions (id, user_id, amount, payment_method, date, note, merchant, bank_ref, is_sample, is_deleted, created_at, updated_at)
        VALUES (?, ?, ?, 'upi', ?, ?, ?, ?, 0, 0, ?, ?)
      `);

      for (const msg of messages) {
        const parsed = parseBankSMS(msg);
        if (!parsed || parsed.type === 'credit') continue;

        if (parsed.refNumber) {
          const dup = db.prepare('SELECT id FROM transactions WHERE user_id = ? AND bank_ref = ?').get(req.userId, parsed.refNumber);
          if (dup) continue;
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        insertExp.run(
          id,
          req.userId,
          parsed.amount,
          parsed.date,
          parsed.originalText.slice(0, 500),
          (parsed.merchant || '').slice(0, 200),
          parsed.refNumber,
          now,
          now
        );

        // Generate question prompt
        db.prepare(`
          INSERT INTO question_prompts (id, user_id, transaction_id, question_text, question_type, status, created_at)
          VALUES (?, ?, ?, ?, 'need_want', 'pending', ?)
        `).run(
          crypto.randomUUID(),
          req.userId,
          id,
          `₹${parsed.amount}${parsed.merchant ? ` to ${parsed.merchant}` : ''} via ${parsed.bankName}. Was this a need or want?`,
          now
        );

        results.push({ id, ...parsed });
      }

      res.json({ parsed: results.length, transactions: results });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to parse SMS' });
    }
  });

  return router;
}

module.exports = createImportRouter;
