import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('Warnung: DATABASE_URL fehlt in der .env-Datei.');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Render SSL connection
  }
});

// Create tables if they do not exist
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        balance DOUBLE PRECISION DEFAULT 1000.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        admin_message_id BIGINT PRIMARY KEY,
        user_telegram_id BIGINT NOT NULL,
        user_message_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('PostgreSQL-Datenbanktabellen erfolgreich initialisiert.');
  } catch (err) {
    console.error('Fehler bei der Tabellen-Initialisierung:', err);
  }
}

initDb();

/**
 * Saves or updates a user in the database.
 */
export async function saveUser(user) {
  const query = `
    INSERT INTO users (telegram_id, username, first_name, last_name, balance)
    VALUES ($1, $2, $3, $4, 1000.0)
    ON CONFLICT (telegram_id) DO UPDATE SET
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name;
  `;
  await pool.query(query, [user.id, user.username || null, user.first_name || null, user.last_name || null]);
}

/**
 * Gets the user's current balance.
 */
export async function getBalance(telegramId) {
  const res = await pool.query('SELECT balance FROM users WHERE telegram_id = $1', [telegramId]);
  return res.rows[0] ? parseFloat(res.rows[0].balance) : 0.0;
}

/**
 * Updates the user's balance. Amount can be positive (deposit/win) or negative (bet).
 * Returns the new balance.
 */
export async function updateBalance(telegramId, amount) {
  const current = await getBalance(telegramId);
  const newBalance = Math.max(0, current + amount);
  await pool.query('UPDATE users SET balance = $1 WHERE telegram_id = $2', [newBalance, telegramId]);
  return newBalance;
}

/**
 * Maps a forwarded support message received by the admin back to the original user.
 */
export async function saveTicket(adminMessageId, userTelegramId, userMessageId) {
  const query = `
    INSERT INTO tickets (admin_message_id, user_telegram_id, user_message_id)
    VALUES ($1, $2, $3);
  `;
  await pool.query(query, [adminMessageId, userTelegramId, userMessageId]);
}

/**
 * Gets ticket mapping by admin message ID.
 */
export async function getTicket(adminMessageId) {
  const res = await pool.query(
    'SELECT user_telegram_id, user_message_id FROM tickets WHERE admin_message_id = $1',
    [adminMessageId]
  );
  return res.rows[0] ? {
    user_telegram_id: parseInt(res.rows[0].user_telegram_id),
    user_message_id: parseInt(res.rows[0].user_message_id)
  } : null;
}

/**
 * Returns basic database statistics.
 */
export async function getStats() {
  const usersRes = await pool.query('SELECT COUNT(*) as count FROM users');
  const ticketsRes = await pool.query('SELECT COUNT(*) as count FROM tickets');
  return {
    userCount: parseInt(usersRes.rows[0].count),
    ticketCount: parseInt(ticketsRes.rows[0].count)
  };
}

export default pool;
