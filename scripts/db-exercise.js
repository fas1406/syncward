const db = require('../src/db/pool');

async function main() {
    // INSERT
    const Inserted = await db.query(
        `INSERT into servers (name, host, remote_path, service_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id,name,enabled,created_at`,
         ['APP10', 'srv-app-10.corp.local', 'MyAppService', 'D:\\Apps\\MyApp', 'Primary']  
    );
    console.log('Inserted:', Inserted.rows[0]);

    //SELECT 
    const allServers = await db.query(
        `SELECT * FROM Servers ORDER BY name`
    );
    console.log ('All Servers :', allServers.rows);

    //UPDATE
    const Updated = await db.query(`
        UPDATE servers SET enabled = FALSE WHERE name = $1
        RETURNING id, name, enabled`,
        ['APP10']);
    console.log('Updated :', Updated.rows[0]);

        //DELETE
    const Deleted = await db.query(`
        DELETE from servers WHERE name = $1
        RETURNING id, name`,
        ['APP10']);
    console.log('Deleted :', Deleted.rows[0]);
    /* if (Deleted.rows.length > 0) {
        console.log('Successfully deleted:', Deleted.rows[0]);
        } else {
        console.log('No server found with name APP10 to delete.');}*/
        //SELECT 
    const allrec = await db.query(
        `SELECT * FROM Servers ORDER BY name`
    );
    console.log ('All Servers :', allrec.rows);
}
main()
.catch((err) =>{
    console.error('ERROR :', err.message);  //err.message
    process.exitCode= 1;
})
.finally(async() =>{
 if (db && db.pool){
        await db.pool.end();
    }
     console.log('Finally Process Finished')
}); 
