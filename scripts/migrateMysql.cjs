const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createMysqlPool } = require('../dist/api/database/mysql');

async function migrate() {
    const pool = createMysqlPool();
    const connection = await pool.getConnection().catch(async error => { await pool.end(); throw error; });
    let locked = false;
    try {
        const [rows] = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':pcm-migrations'), 10) AS acquired");
        if (Number(rows[0].acquired) !== 1) throw new Error('Outra migration está em execução.');
        locked = true;
        await connection.query(`CREATE TABLE IF NOT EXISTS pcm_schema_migrations (
            name VARCHAR(120) NOT NULL PRIMARY KEY,
            applied_at DATETIME(3) NOT NULL
        ) ENGINE=InnoDB`);
        const name = '001PcmLineEntries.sql';
        const [applied] = await connection.execute('SELECT name FROM pcm_schema_migrations WHERE name = ?', [name]);
        if (applied.length) { console.log('Migration já aplicada:', name); return; }
        // DDL MySQL faz commit implícito. A migration é idempotente para permitir retomada.
        await connection.query(readFileSync(path.join(__dirname, '../database/migrations', name), 'utf8'));
        await connection.execute('INSERT INTO pcm_schema_migrations (name, applied_at) VALUES (?, UTC_TIMESTAMP(3))', [name]);
        console.log('Migration aplicada:', name);
    } finally {
        try { if (locked) await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':pcm-migrations'))"); }
        finally { connection.release(); await pool.end(); }
    }
}

migrate().catch(error => {
    console.error('Falha na migration. Verifique o banco, as permissões e o .env. Código:', error.code || 'MIGRATION_ERROR');
    process.exitCode = 1;
});
