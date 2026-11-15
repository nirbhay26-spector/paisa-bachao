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

// Trust reverse proxy headers (crucial for Vercel and express-rate-limit)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Health check available immediately
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const apiRouter = express.Router();
let initPromise = null;

async function ensureDbInitialized() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Detect serverless environment (Vercel / Lambda) where root filesystem is read-only
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const defaultDbPath = isServerless
      ? path.join('/tmp', 'paisa-bachao.db')
      : path.join(__dirname, '../data/paisa-bachao.db');
    const dbPath = process.env.DB_PATH || defaultDbPath;

    const db = await initDb(dbPath);

    // Apply migrations
    const migrationsDir = path.join(__dirname, '../migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        db.exec(sql);
      }
    }

    // Safe schema upgrades
    try {
      db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT 'fox'");
    } catch (e) {
      // Column already exists
    }

    // Static files for uploads (safe in /tmp or directory)
    const defaultUploads = isServerless
      ? path.join('/tmp', 'uploads')
      : path.join(__dirname, '../uploads');
    const uploadsDir = process.env.UPLOADS_DIR || defaultUploads;
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      app.use('/uploads', express.static(uploadsDir));
    } catch (e) {
      console.warn('Could not create uploads directory:', e.message);
    }

    // Rate limiting for auth (bypass trustProxy validation issues on Vercel)
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { error: 'Too many attempts, please try again later' },
      validate: { trustProxy: false }
    });

    // Mount all routes onto apiRouter
    apiRouter.use('/auth', authLimiter, require('./routes/auth')(db));
    apiRouter.use('/expenses', require('./routes/expenses')(db));
    apiRouter.use('/budgets', require('./routes/budgets')(db));
    apiRouter.use('/savings', require('./routes/savings')(db));
    apiRouter.use('/questions', require('./routes/questions')(db));
    apiRouter.use('/splits', require('./routes/splits')(db));
    apiRouter.use('/import', require('./routes/import')(db));
    apiRouter.use('/advisor', require('./routes/advisor')(db));
    apiRouter.use('/export', require('./routes/export')(db));
    apiRouter.use('/accounts', require('./routes/accounts')(db));
    apiRouter.use('/bank', require('./routes/bank')(db));
    apiRouter.use('/gamification', require('./routes/gamification')(db));
    apiRouter.use('/settings', require('./routes/settings')(db));

    // User Categories endpoint
    apiRouter.get('/categories', (req, res) => {
      const { authMiddleware } = require('./middleware/auth');
      authMiddleware(req, res, () => {
        const categories = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order').all(req.userId);
        res.json(categories);
      });
    });

    console.log('✅ SQLite database ready with zero-seed policy (empty start)');
    return db;
  })();

  return initPromise;
}

// Route all /api requests through lazy-initialized router
app.use('/api', async (req, res, next) => {
  try {
    await ensureDbInitialized();
    apiRouter(req, res, next);
  } catch (err) {
    console.error('Database initialization error:', err);
    res.status(500).json({ error: 'Database initialization failed: ' + err.message });
  }
});

// Global error handler
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Standalone local execution
if (require.main === module) {
  ensureDbInitialized()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Paise Bachao Backend running at http://localhost:${PORT}`);
        console.log(`🛡️  Strict user isolation active. Real data only.\n`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

module.exports = app;
