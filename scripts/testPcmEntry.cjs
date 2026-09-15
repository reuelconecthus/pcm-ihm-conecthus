const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { createApp } = require('../dist/api/app');
const { EntryRepository } = require('../dist/modules/pcm/entry/repositories/entryRepository');
const { readMysqlConfig } = require('../dist/database/mysql');

async function serve(t, repository) {
    const server = createApp(repository).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return body => fetch(`http://127.0.0.1:${server.address().port}/api/serial-numbers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
}

test('só confirma após persistir e usa parâmetro SQL preservando o serial', async t => {
    let confirm, notify;
    const entered = new Promise(resolve => { notify = resolve; });
    const post = await serve(t, new EntryRepository({ execute: async (sql, args) => {
        assert.match(sql, /VALUES \(\?, UTC_TIMESTAMP\(3\)\)/);
        assert.equal(args[0].toString('utf8'), "AbC'123");
        notify(); await new Promise(resolve => { confirm = resolve; });
        return [{ affectedRows: 1 }, []];
    } }));
    let complete = false;
    const pending = post({ 'serial-number': "AbC'123" }).then(result => { complete = true; return result; });
    await entered; await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(complete, false); confirm();
    const response = await pending;
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { status: 'OK' });
});

test('serial duplicado retorna 409', async t => {
    const post = await serve(t, new EntryRepository({ execute: async () => {
        throw Object.assign(new Error('internal details'), { code: 'ER_DUP_ENTRY' });
    } }));
    const response = await post({ 'serial-number': 'abc' });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { status: 'ERROR', msg: 'Serial já registrado no início da linha.' });
});

test('entrada inválida ou QR não grava no banco', async t => {
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
        assert.deepEqual(await response.json(), { status: 'ERROR', msg: 'Não foi possível confirmar o registro no MySQL.' });
    }
});

test('configuração exige conexão explícita e porta válida', () => {
    assert.throws(() => readMysqlConfig({}));
    const env = { MYSQL_HOST: 'localhost', MYSQL_DATABASE: 'pcm', MYSQL_USER: 'app', MYSQL_PASSWORD: '' };
    assert.equal(readMysqlConfig(env).port, 3306);
    assert.throws(() => readMysqlConfig({ ...env, MYSQL_PORT: '-1' }));
});
