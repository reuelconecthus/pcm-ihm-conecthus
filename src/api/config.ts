export function readHttpConfig(env: NodeJS.ProcessEnv = process.env) {
    const port = Number(env.API_PORT ?? '3000');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT inválida.');
    return { host: env.API_HOST || '127.0.0.1', port };
}
