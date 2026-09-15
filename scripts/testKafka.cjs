const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readKafkaConfig } = require('../dist/modules/kafka/config/kafkaConfig');
const { KafkaProducerService } = require('../dist/modules/kafka/services/kafkaProducerService');
const { KafkaConsumerService } = require('../dist/modules/kafka/services/kafkaConsumerService');

test('exige KAFKA_BROKERS, KAFKA_TOPIC e valida SSL/SASL', () => {
    assert.throws(() => readKafkaConfig({}));
    assert.throws(() => readKafkaConfig({ KAFKA_BROKERS: 'localhost:9092' }));
    const env = { KAFKA_BROKERS: 'localhost:9092, other:9092', KAFKA_TOPIC: 'pcm.serial-numbers' };
    const config = readKafkaConfig(env);
    assert.deepEqual(config.kafka.brokers, ['localhost:9092', 'other:9092']);
    assert.equal(config.topic, 'pcm.serial-numbers');
    assert.equal(config.groupId, 'pcm-kafka-consumer');
    assert.throws(() => readKafkaConfig({ ...env, KAFKA_TOPIC: '..' }));
    assert.throws(() => readKafkaConfig({ ...env, KAFKA_SSL: 'talvez' }));
    assert.throws(() => readKafkaConfig({ ...env, KAFKA_SASL_USERNAME: 'a' }));
    assert.throws(() => readKafkaConfig({ ...env, KAFKA_SASL_MECHANISM: 'plain', KAFKA_SASL_USERNAME: 'a', KAFKA_SASL_PASSWORD: 'b' }));
    const withSasl = readKafkaConfig({ ...env, KAFKA_SSL: 'true', KAFKA_SASL_MECHANISM: 'plain', KAFKA_SASL_USERNAME: 'a', KAFKA_SASL_PASSWORD: 'b' });
    assert.deepEqual(withSasl.kafka.sasl, { mechanism: 'plain', username: 'a', password: 'b' });
    assert.equal(readKafkaConfig({ ...env, KAFKA_CONSUMER_GROUP_ID: 'grupo' }).groupId, 'grupo');
});

test('produtor conecta uma vez, envia no tópico configurado e desconecta', async () => {
    const calls = [];
    const producer = {
        connect: async () => calls.push('connect'),
        send: async record => calls.push(['send', record]),
        disconnect: async () => calls.push('disconnect')
    };
    const service = new KafkaProducerService(producer, 'pcm.serial-numbers');
    await service.publish('abc123', 'chave');
    await service.publish('def456');
    await service.disconnect();
    assert.deepEqual(calls[0], 'connect');
    assert.deepEqual(calls[1], ['send', { topic: 'pcm.serial-numbers', acks: -1, timeout: 10000, messages: [{ key: 'chave', value: 'abc123' }] }]);
    assert.deepEqual(calls[2], ['send', { topic: 'pcm.serial-numbers', acks: -1, timeout: 10000, messages: [{ key: undefined, value: 'def456' }] }]);
    assert.deepEqual(calls[3], 'disconnect');
    assert.equal(calls.filter(call => call === 'connect').length, 1);
});

test('consumidor assina o tópico e repassa cada mensagem ao handler', async () => {
    let eachMessage;
    const calls = [];
    const consumer = {
        connect: async () => calls.push('connect'),
        subscribe: async subscription => calls.push(['subscribe', subscription]),
        run: async config => { eachMessage = config.eachMessage; calls.push('run'); },
        disconnect: async () => calls.push('disconnect')
    };
    const service = new KafkaConsumerService(consumer, 'pcm.serial-numbers');
    const received = [];
    await service.start(payload => { received.push(payload); }, true);
    assert.deepEqual(calls, ['connect', ['subscribe', { topic: 'pcm.serial-numbers', fromBeginning: true }], 'run']);
    const payload = { topic: 'pcm.serial-numbers', partition: 0, message: { value: Buffer.from('abc') } };
    await eachMessage(payload);
    assert.deepEqual(received, [payload]);
    await service.stop();
    assert.equal(calls.at(-1), 'disconnect');
});
