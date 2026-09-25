const db = require('../src/db/pool.js');

async function main() {
    try{
        const dbdt = await db.query(`SELECT NOW() as now`);
        console.log('Database Current Date is :',dbdt.rows[0].now);

        const allservers = await db.query(`SELECT name, host, role FROM servers ORDER BY name`);
        if (allservers.rowCount === 0) {
            console.log('No Servers Found In List of Servers');
        } else{
            console.log(` Found ${allservers.rowCount} Servers`);
            for ( const row of allservers.rows){
                console.log(` -- ${row.name} -- ${row.host} -- ${row.role}`);
            }
        }
        
        const pserv = await db.query(`SELECT name, host, role FROM servers WHERE role='primary'`);
        if (pserv.rowCount === 0){
            console.log('No Primary Servers Found In List of Servers');
        } else{
            console.log(` Found ${pserv.rowCount} Primary Servers`);
         for ( const row of pserv.rows){
            console.log(` -- ${row.name} -- ${row.host} -- ${row.role}`);
         }
        }     

    } catch(err){
        console.error('Error Occured :',err.message);
    } finally{
        if (db && db.pool){
            await db.pool.end();
        }
    }
}
main();
