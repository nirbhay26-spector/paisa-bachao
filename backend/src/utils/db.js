// Database wrapper around sql.js to provide a better-sqlite3-like synchronous API
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
let dbPath = '';

async function initDb(filepath) {
  dbPath = filepath;
  const SQL = await initSqlJs();
  if (filepath !== ':memory:') {
    try {
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(filepath)) {
        const buffer = fs.readFileSync(filepath);
        db = new SQL.Database(buffer);
      } else {
        db = new SQL.Database();
      }
    } catch (e) {
      console.warn('Filesystem access failed, falling back to memory database:', e.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');
  return getWrapper();
}

function saveDb() {
  if (db && dbPath && dbPath !== ':memory:') {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dbPath, buffer);
    } catch (err) {
      // Non-fatal warning if persisting to disk is unavailable (e.g. read-only serverless)
    }
  }
}

// Auto-save periodically
let saveTimer = null;
function startAutoSave(intervalMs = 5000) {
  if (dbPath === ':memory:') return;
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = setInterval(saveDb, intervalMs);
  if (saveTimer && saveTimer.unref) saveTimer.unref();
}

function getWrapper() {
  const wrapper = {
    // Prepare returns a statement-like object with .run(), .get(), .all()
    prepare(sql) {
      return {
        run(...params) {
          db.run(sql, params);
          saveDb();
          return { changes: db.getRowsModified() };
        },
        get(...params) {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const results = [];
          const stmt = db.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        }
      };
    },
    exec(sql) {
      db.exec(sql);
      saveDb();
    },
    pragma(str) {
      try { db.run(`PRAGMA ${str}`); } catch (e) { /* ignore */ }
    },
    close() {
      saveDb();
      if (saveTimer) clearInterval(saveTimer);
      db.close();
    }
  };
  startAutoSave();
  return wrapper;
}

module.exports = { initDb };

