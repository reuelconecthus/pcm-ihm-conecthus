import { createPool } from 'mysql2/promise';

export function readMysqlConfig(env: NodeJS.ProcessEnv = process.env) {
    if (!env.MYSQL_HOST || !env.MYSQL_DATABASE || !env.MYSQL_USER || env.MYSQL_PASSWORD === undefined) {
        throw new Error('Configure MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER e MYSQL_PASSWORD.');
    }
    const port = Number(env.MYSQL_PORT || '3306');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('MYSQL_PORT inválida.');
    return { host: env.MYSQL_HOST, port, database: env.MYSQL_DATABASE, user: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD, charset: 'utf8mb4', timezone: 'Z',
        connectionLimit: 5, waitForConnections: false, connectTimeout: 5000 };
}

export function createMysqlPool() { return createPool(readMysqlConfig()); }
