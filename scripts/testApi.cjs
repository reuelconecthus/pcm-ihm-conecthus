const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { createApp } = require('../dist/api/app');
const { KafkaPublisher } = require('../dist/api/serialNumber/kafkaPublisher');
const { readConfig } = require('../dist/api/config');

async function serve(t, publisher) {
    const server = createApp(publisher).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return (body, headers = { 'Content-Type': 'application/json' }, path = '/api/serial-numbers') =>
        fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', headers, body });
}

test('retorna OK somente depois da confirmação e preserva o hash no Kafka', async t => {
    let confirm;
    let sent;
    const received = new Promise(resolve => { sent = resolve; });
    const publisher = new KafkaPublisher({ send: async payload => {
        assert.equal(payload.topic, 'serials');
        assert.equal(payload.acks, -1);
        assert.deepEqual(payload.messages, [{ key: 'AbC123', value: '{"serial-number":"AbC123"}' }]);
        sent();
        await new Promise(resolve => { confirm = resolve; });
        return [];
    } }, 'serials');
    const post = await serve(t, publisher);
    let resolved = false;
    const pending = post('{"serial-number":"AbC123"}').then(response => { resolved = true; return response; });
    await received;
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(resolved, false);
    confirm();
    const response = await pending;
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'OK' });
});

test('rejeita entrada inválida sem publicar', async t => {
    const post = await serve(t, { publish: async () => assert.fail('Não deve publicar') });
    for (const body of [{}, null, [], { 'serial-number': 123 }, { 'serial-number': '' },
        { 'serial-number': ' a' }, { 'serial-number': 'a\n' }, { 'serial-number': 'x'.repeat(513) }]) {
        const response = await post(JSON.stringify(body));
        assert.equal(response.status, 400);
        const result = await response.json();
        assert.equal(result.status, 'ERROR');
        assert.ok(result.msg);
    }
});

test('padroniza erros de JSON, limite, tipo e rota', async t => {
    const post = await serve(t, { publish: async () => assert.fail('Não deve publicar') });
    for (const [body, headers, path, status] of [
        ['{', undefined, undefined, 400],
        [JSON.stringify({ 'serial-number': 'x'.repeat(5000) }), undefined, undefined, 413],
        ['abc', { 'Content-Type': 'text/plain' }, undefined, 415],
        ['{}', undefined, '/missing', 404]
    ]) {
        const response = await post(body, headers, path);
        assert.equal(response.status, status);
        assert.equal((await response.json()).status, 'ERROR');
    }
});

test('falha no Kafka retorna ERROR sem expor detalhes internos', async t => {
    const publisher = new KafkaPublisher({ send: async () => { throw new Error('private broker details'); } }, 'serials');
    const post = await serve(t, publisher);
    const response = await post('{"serial-number":"abc"}');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: 'ERROR', msg: 'Não foi possível confirmar o envio ao Kafka.' });
});

test('configuração exige destino e valida porta e autenticação', () => {
    const base = { KAFKA_BROKERS: 'localhost:9092, localhost:9093', KAFKA_TOPIC: 'serials' };
    assert.throws(() => readConfig({}));
    assert.throws(() => readConfig({ ...base, API_PORT: '0' }));
    assert.throws(() => readConfig({ ...base, KAFKA_SSL: 'yes' }));
    assert.throws(() => readConfig({ ...base, KAFKA_SASL_MECHANISM: 'plain' }));
    const config = readConfig({ ...base, KAFKA_SSL: 'true', KAFKA_SASL_MECHANISM: 'scram-sha-256', KAFKA_SASL_USERNAME: 'user', KAFKA_SASL_PASSWORD: 'secret' });
    assert.deepEqual(config.kafka.brokers, ['localhost:9092', 'localhost:9093']);
    assert.equal(config.kafka.sasl.mechanism, 'scram-sha-256');
    assert.equal(config.host, '127.0.0.1');
});

test('recebe texto QR e preserva conteúdo e tipo no Kafka', async t => {
    const qrCode = '{"serial":"AbC123", "lote":"A B"}\n';
    let calls = 0;
    const post = await serve(t, new KafkaPublisher({ send: async payload => {
        calls++;
        assert.equal(payload.acks, -1);
        assert.deepEqual(payload.messages, [{ key: qrCode, value: JSON.stringify({ 'qr-code': qrCode }) }]);
        return [];
    } }, 'serials'));
    const response = await post(JSON.stringify({ 'qr-code': qrCode, ignored: true }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'OK' });
    assert.equal(calls, 1);
});

test('rejeita QR inválido ou envio dos dois campos sem publicar', async t => {
    const post = await serve(t, { publish: async () => assert.fail('Não deve publicar') });
    for (const body of [{ 'qr-code': '' }, { 'qr-code': '  \n' }, { 'qr-code': null },
        { 'qr-code': 123 }, { 'qr-code': {} }, { 'qr-code': 'x'.repeat(2049) },
        { 'serial-number': 'abc', 'qr-code': 'def' }, { 'serial-number': null, 'qr-code': 'def' }]) {
        const response = await post(JSON.stringify(body));
        assert.equal(response.status, 400);
        const result = await response.json();
        assert.equal(result.status, 'ERROR');
        assert.ok(result.msg);
    }
});

test('falha de publicação do QR retorna ERROR', async t => {
    const post = await serve(t, new KafkaPublisher({ send: async () => { throw new Error('offline'); } }, 'serials'));
    const response = await post(JSON.stringify({ 'qr-code': 'https://example.com/item/123' }));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).status, 'ERROR');
});
