import Database from 'better-sqlite3';

const db = new Database('database.db', { verbose: console.log });

// Create table if not exists
const createTable = () => {
    const stmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS Article (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      originalTitle TEXT NOT NULL,
      originalContent TEXT NOT NULL,
      updatedContent TEXT,
      referenceLinks TEXT,
      isProcessed INTEGER DEFAULT 0,
      url TEXT UNIQUE NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);
    stmt.run();
};

createTable();

export default db;
