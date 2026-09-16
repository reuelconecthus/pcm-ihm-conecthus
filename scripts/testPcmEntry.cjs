const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { createApp } = require('../dist/api/app');
const { EntryRepository } = require('../dist/modules/pcm/entry/repositories/entryRepository');
const { readMongoConfig } = require('../dist/database/mongo');

async function serve(t, repository) {
    const server = createApp(repository).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return body => fetch(`http://127.0.0.1:${server.address().port}/api/serial-numbers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
}

test('só confirma após persistir e preserva o serial exato', async t => {
    let confirm, notify;
    const entered = new Promise(resolve => { notify = resolve; });
    const post = await serve(t, new EntryRepository({ insertOne: async doc => {
        assert.equal(doc.serialNumber, "AbC'123");
        assert.ok(doc.enteredAt instanceof Date);
        notify(); await new Promise(resolve => { confirm = resolve; });
        return { acknowledged: true, insertedId: 1 };
    } }));
    let complete = false;
    const pending = post({ 'serial-number': "AbC'123" }).then(result => { complete = true; return result; });
    await entered; await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(complete, false); confirm();
    const response = await pending;
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { status: 'OK' });
});

test('serial duplicado retorna 409', async t => {
    const post = await serve(t, new EntryRepository({ insertOne: async () => {
        throw Object.assign(new Error('internal details'), { code: 11000 });
    } }));
    const response = await post({ 'serial-number': 'abc' });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { status: 'ERROR', msg: 'Serial já registrado no início da linha.' });
});

test('entrada inválida ou QR sem serial válido não grava no banco', async t => {
    const post = await serve(t, { insert: async () => assert.fail('Não deve gravar') });
    for (const body of [null, [], {}, { 'serial-number': '' }, { 'serial-number': 42 },
        { 'serial-number': 'a b' }, { 'serial-number': 'a'.repeat(513) },
        { 'qr-code': 'a b' }, { 'serial-number': 'abc', 'qr-code': 'abc' }]) {
        const response = await post(body); assert.equal(response.status, 400);
    }
});

test('falha ou ausência de banco retorna 503 sem detalhes internos', async t => {
    for (const repo of [undefined, { insert: async () => { throw new Error('password=secret'); } }]) {
        const post = await serve(t, repo);
        const response = await post({ 'serial-number': 'abc' });
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), { status: 'ERROR', msg: 'Não foi possível confirmar o registro no MongoDB.' });
    }
});

test('configuração exige conexão explícita e porta válida', () => {
    assert.throws(() => readMongoConfig({}));
    const env = { MONGO_HOST: 'localhost', MONGO_DATABASE: 'pcm', MONGO_USER: 'app', MONGO_PASSWORD: '' };
    assert.equal(readMongoConfig(env).port, 27017);
    assert.throws(() => readMongoConfig({ ...env, MONGO_PORT: '-1' }));
});
