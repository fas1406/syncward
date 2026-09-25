const dotenv = require('dotenv');
dotenv.config();
//require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 1. Secure Connection URI
  max: 10,                                    // 2. Maximum Concurrent Clients
  idleTimeoutMillis: 30000,                  // 3. Client Disposal Buffer (30s)
  connectionTimeoutMillis: 5000,             // 4. Maximum Wait Buffer (5s)
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};