// scripts/create-admin.js
// Usage: node scripts/create-admin.js <username> <password>
const db = require('../src/db/pool');
const { hashPassword } = require('../src/auth/password');

async function main() {
const [, , rawUsername, password] = process.argv;
const username = (rawUsername || '').toLowerCase().trim();

  if (!username || !password) {
    console.error('Usage: node scripts/create-admin.js <username> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  try {
    const hash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
       RETURNING id, username, role`,
      [username, hash]
    );
    console.log(' Admin user ready:', rows[0]);
  } catch (err) {
    console.error('X', err.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();