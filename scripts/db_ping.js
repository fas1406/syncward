require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  // 1. Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 2. Ask Postgres for the current time
    const result = await pool.query('SELECT NOW() AS now');
    console.log(' Connected! Database time is:', result.rows[0].now);

    // 3. Ask for our servers
    const servers = await pool.query('SELECT name, host, role FROM servers ORDER BY name');
    console.log(`\n Found ${servers.rowCount} server(s):`);
    for (const row of servers.rows) {
      console.log(`   - ${row.name} (${row.host}) — ${row.role}`);
    }
    
    // Parameterized query — look up one specific server
    const one = await pool.query('SELECT name, host, role FROM servers WHERE role = $1',['primary']);
    console.log('\n Primay Server(s): ',one.rows);

  } catch (err) {
    console.error('Database error:', err.message);
    //process.exit(1);
  } finally {
    // 4. Always close the pool when done
    await pool.end();
  }
}

main();