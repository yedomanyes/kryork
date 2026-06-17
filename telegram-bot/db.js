import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// On Glitch, files inside the '.data' directory are kept permanently across rebuilds.
// We make sure the folder exists.
const dataDir = join(__dirname, '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = join(dataDir, 'bot.db');
const db = new Database(dbPath);

// Create tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    balance REAL DEFAULT 1000.0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS tickets (
    admin_message_id INTEGER PRIMARY KEY,
    user_telegram_id INTEGER NOT NULL,
    user_message_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

/**
 * Saves or updates a user in the database.
 */
export function saveUser(user) {
  const stmt = db.prepare(`
    INSERT INTO users (telegram_id, username, first_name, last_name, balance)
    VALUES (?, ?, ?, ?, 1000.0)
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name
  `);
  stmt.run(user.id, user.username || null, user.first_name || null, user.last_name || null);
}

/**
 * Gets the user's current balance.
 */
export function getBalance(telegramId) {
  const stmt = db.prepare('SELECT balance FROM users WHERE telegram_id = ?');
  const row = stmt.get(telegramId);
  return row ? parseFloat(row.balance) : 0.0;
}

/**
 * Updates the user's balance. Amount can be positive (deposit/win) or negative (bet).
 * Returns the new balance.
 */
export function updateBalance(telegramId, amount) {
  const current = getBalance(telegramId);
  const newBalance = Math.max(0, current + amount);
  const stmt = db.prepare('UPDATE users SET balance = ? WHERE telegram_id = ?');
  stmt.run(newBalance, telegramId);
  return newBalance;
}

/**
 * Maps a forwarded support message received by the admin back to the original user.
 */
export function saveTicket(adminMessageId, userTelegramId, userMessageId) {
  const stmt = db.prepare(`
    INSERT INTO tickets (admin_message_id, user_telegram_id, user_message_id)
    VALUES (?, ?, ?)
  `);
  stmt.run(adminMessageId, userTelegramId, userMessageId);
}

/**
 * Gets ticket mapping by admin message ID.
 */
export function getTicket(adminMessageId) {
  const stmt = db.prepare(`
    SELECT user_telegram_id, user_message_id FROM tickets WHERE admin_message_id = ?
  `);
  return stmt.get(adminMessageId);
}

/**
 * Returns basic database statistics.
 */
export function getStats() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;
  return {
    userCount,
    ticketCount
  };
}

export default db;
