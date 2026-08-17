const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'snaplam.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  theme TEXT NOT NULL DEFAULT 'abu',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  url TEXT NOT NULL,
  platform TEXT,
  resolution TEXT,
  status TEXT NOT NULL,
  result_url TEXT,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  from_admin TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// Seed admin account
const adminUser = process.env.ADMIN_USERNAME || 'lamzy';
const adminPass = process.env.ADMIN_PASSWORD || 'adminzyy969';
const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get(adminUser);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(adminPass, 10);
  db.prepare('INSERT INTO users (username, password, role, theme) VALUES (?, ?, ?, ?)')
    .run(adminUser, hash, 'admin', 'abu');
  console.log(`[SnapLam] Admin account seeded: ${adminUser}`);
} else if (existingAdmin.role !== 'admin') {
  db.prepare('UPDATE users SET role = ? WHERE username = ?').run('admin', adminUser);
}

module.exports = db;
