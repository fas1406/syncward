// scripts/db-demo.js
/*
cst dotenv = require('dotenv');
doteonnv.config();
*/
// OR
/*require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL});*/
const db = require('../src/db/pool'); 

async function main() {
   // INSERT
    const Inserted = await db.query(
        `INSERT INTO servers (name, host, remote_path, service_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, role, enabled`,
         ['APP999', 'srv-app-99.corp.local', 'D:\\Apps\\MyApp', 'MyAppService', 'Main']
    );
      console.log('Inserted:', Inserted.rows[0]);
   // UPDATE
    const updated = await db.query(
      `UPDATE servers SET role = $1 WHERE name = $2
      RETURNING id, name, role`,
      ['secondry','APP999']
    );
    console.log('Updated :', updated.rows[0]);
    
    // SELECT 
    const allrec = await db.query(
      `SELECT name, role FROM servers ORDER BY name`);
      console.log('All Servers',allrec.rows);

    // DELETE
  const fndrec= await db.query(
    `SELECT name, role FROM servers WHERE name = $1`,
     ['APP999']);

  if (fndrec.rowCount > 0) {
    const delrec = await db.query(
      `DELETE FROM servers WHERE name = $1 RETURNING name`,
      ['APP999']
    );
    console.log('Deleted:', delrec.rows[0]);  
  } else {
    console.log('Delete skipped: No server matching that name was found.');
  }
   
}
// Made the catch callback "async" to support "await pool.end()"
main()
  .catch((err) => {
    console.error('Error:', err.message);
    process.exitCode = 1; // Sets the failure code cleanly without immediate termination
  })
  .finally(async () => {
    // This block ALWAYS runs exactly once at the very end
   if (db && db.pool) {
      await db.pool.end(); 
    }
    console.log('Demo finished.');
  });
