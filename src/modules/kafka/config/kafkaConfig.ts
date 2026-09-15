import type { KafkaConfig, SASLOptions } from 'kafkajs';

/**
 * Configuração genérica de cliente Kafka, independente do fluxo de entrada PCM
 * (veja `src/modules/pcm/entry/integrations/kafkaConfig.ts`, que permanece fora
 * de uso). Usada pelo produtor e pelo consumidor em `src/kafka/`.
 */
export function readKafkaConfig(env: NodeJS.ProcessEnv = process.env) {
    const brokers = (env.KAFKA_BROKERS ?? '').split(',').map(value => value.trim()).filter(Boolean);
    const topic = env.KAFKA_TOPIC?.trim();
    if (!brokers.length || !topic) throw new Error('Configure KAFKA_BROKERS e KAFKA_TOPIC.');
    if (!/^[a-zA-Z0-9._-]{1,249}$/.test(topic) || topic === '.' || topic === '..') throw new Error('KAFKA_TOPIC inválido.');
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
        brokers, clientId: env.KAFKA_CLIENT_ID || 'pcm-kafka-client',
        ssl: env.KAFKA_SSL === 'true', sasl,
        connectionTimeout: 3000, requestTimeout: 10000,
        retry: { retries: 2, maxRetryTime: 3000 }
    };
    const groupId = env.KAFKA_CONSUMER_GROUP_ID?.trim() || 'pcm-kafka-consumer';
    return { kafka, topic, groupId };
}
