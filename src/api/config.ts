import type { KafkaConfig, SASLOptions } from 'kafkajs';

export function readHttpConfig(env: NodeJS.ProcessEnv = process.env) {
    const port = Number(env.API_PORT ?? '3000');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT inválida.');
    return { host: env.API_HOST || '127.0.0.1', port };
}

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
    const brokers = (env.KAFKA_BROKERS ?? '').split(',').map(value => value.trim()).filter(Boolean);
    const topic = env.KAFKA_TOPIC?.trim();
    if (!brokers.length || !topic) throw new Error('Configure KAFKA_BROKERS e KAFKA_TOPIC.');
    if (!/^[a-zA-Z0-9._-]{1,249}$/.test(topic) || topic === '.' || topic === '..') throw new Error('KAFKA_TOPIC inválido.');
    const http = readHttpConfig(env);
    if (env.KAFKA_SSL !== undefined && !['true', 'false'].includes(env.KAFKA_SSL)) throw new Error('KAFKA_SSL deve ser true ou false.');
    let sasl: SASLOptions | undefined;
    const mechanism = env.KAFKA_SASL_MECHANISM;
    if (mechanism) {
        if (mechanism !== 'plain' && mechanism !== 'scram-sha-256' && mechanism !== 'scram-sha-512') throw new Error('Mecanismo SASL não suportado.');
        if (!env.KAFKA_SASL_USERNAME || !env.KAFKA_SASL_PASSWORD) throw new Error('Configure usuário e senha SASL.');
        if (mechanism === 'plain' && env.KAFKA_SSL !== 'true') throw new Error('SASL plain requer KAFKA_SSL=true.');
        sasl = { mechanism, username: env.KAFKA_SASL_USERNAME, password: env.KAFKA_SASL_PASSWORD };
    } else if (env.KAFKA_SASL_USERNAME || env.KAFKA_SASL_PASSWORD) {
        throw new Error('Configure KAFKA_SASL_MECHANISM.');
    }
    const kafka: KafkaConfig = {
        brokers, clientId: env.KAFKA_CLIENT_ID || 'pcm-serial-api',
        ssl: env.KAFKA_SSL === 'true', sasl,
        connectionTimeout: 3000, requestTimeout: 10000,
        retry: { retries: 2, maxRetryTime: 3000 }
    };
    return { ...http, topic, kafka };
}
