const crypto = require('crypto');

/**
 * Sample Data Service
 * OFF BY DEFAULT.
 * Only loaded if explicitly requested by the user from Settings.
 * Every transaction is tagged with is_sample = 1.
 * Can be completely wiped in one click.
 */
function enableSampleData(db, userId) {
  const now = new Date();
  const nowISO = now.toISOString();

  // Mark in settings / user
  db.prepare('UPDATE users SET sample_data_enabled = 1 WHERE id = ?').run(userId);

  // Clear any existing sample data first
  clearSampleData(db, userId);

  // Find user's categories
  const cats = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(userId);
  const getCatId = (namePrefix) => {
    const c = cats.find(cat => cat.name.toLowerCase().startsWith(namePrefix.toLowerCase()));
    return c ? c.id : (cats[0] ? cats[0].id : null);
  };

  const insertTxn = db.prepare(`
    INSERT INTO transactions (id, user_id, amount, category_id, payment_method, date, note, merchant, tag, is_sample, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `);

  const samples = [
    { daysAgo: 0, amount: 240, cat: 'food', method: 'upi', merchant: 'Swiggy', note: 'Sample lunch', tag: 'need' },
    { daysAgo: 1, amount: 50, cat: 'snacks', method: 'cash', merchant: 'Chai Stall', note: 'Chai & biscuit', tag: 'want' },
    { daysAgo: 2, amount: 80, cat: 'travel', method: 'upi', merchant: 'Metro', note: 'College commute', tag: 'need' },
    { daysAgo: 4, amount: 350, cat: 'food', method: 'upi', merchant: 'Dominos', note: 'Weekend pizza', tag: 'want' },
    { daysAgo: 7, amount: 199, cat: 'subscriptions', method: 'card', merchant: 'Spotify', note: 'Music sub', tag: 'want' },
    { daysAgo: 10, amount: 120, cat: 'education', method: 'upi', merchant: 'Stationery', note: 'Notebooks', tag: 'need' },
  ];

  for (const s of samples) {
    const d = new Date(now.getTime() - s.daysAgo * 24 * 60 * 60 * 1000);
    insertTxn.run(
      crypto.randomUUID(),
      userId,
      s.amount,
      getCatId(s.cat),
      s.method,
      d.toISOString(),
      s.note,
      s.merchant,
      s.tag,
      nowISO,
      nowISO
    );
  }

  return { message: 'Sample data enabled with clear badge' };
}

function clearSampleData(db, userId) {
  db.prepare('DELETE FROM transactions WHERE user_id = ? AND is_sample = 1').run(userId);
  db.prepare('UPDATE users SET sample_data_enabled = 0 WHERE id = ?').run(userId);
  return { message: 'All sample data removed' };
}

module.exports = { enableSampleData, clearSampleData };

