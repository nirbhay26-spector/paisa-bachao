require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./utils/db');

const app = express();
const PORT = process.env.PORT || 3001;

async function startServer() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/paisa-bachao.db');
  const db = await initDb(dbPath);

  // Apply migrations
  const migrationsDir = path.join(__dirname, '../migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
  }

  // Safe schema upgrades
  try {
    db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT 'fox'");
  } catch (e) {
    // Column already exists
  }
  console.log('✅ SQLite database ready with zero-seed policy (empty start)');

  // Middleware
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));

  // Rate limiting for auth
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many attempts, please try again later' } });

  // Static files for uploads
  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  // Routes with strict user isolation
  app.use('/api/auth', authLimiter, require('./routes/auth')(db));
  app.use('/api/expenses', require('./routes/expenses')(db));
  app.use('/api/budgets', require('./routes/budgets')(db));
  app.use('/api/savings', require('./routes/savings')(db));
  app.use('/api/questions', require('./routes/questions')(db));
  app.use('/api/splits', require('./routes/splits')(db));
  app.use('/api/import', require('./routes/import')(db));
  app.use('/api/advisor', require('./routes/advisor')(db));
  app.use('/api/export', require('./routes/export')(db));
  app.use('/api/accounts', require('./routes/accounts')(db));
  app.use('/api/bank', require('./routes/bank')(db));
  app.use('/api/gamification', require('./routes/gamification')(db));
  app.use('/api/settings', require('./routes/settings')(db));

  // User Categories endpoint
  app.get('/api/categories', (req, res) => {
    const { authMiddleware } = require('./middleware/auth');
    authMiddleware(req, res, () => {
      const categories = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order').all(req.userId);
      res.json(categories);
    });
  });

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Global error handler
  const { errorHandler } = require('./middleware/errorHandler');
  app.use(errorHandler);

  // NOTE: NO DEMO SEEDING. Completely empty database on new setup.

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Paise Bachao Backend running at http://localhost:${PORT}`);
    console.log(`📦 Database: ${dbPath}`);
    console.log(`🛡️  Strict user isolation active. Real data only.\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
