const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { createApp } = require('../dist/api/app');
const { startApi } = require('../dist/api/server');

async function serve(t, repository) {
    const server = createApp(repository).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return (body, headers = { 'Content-Type': 'application/json' }, path = '/api/serial-numbers') =>
        fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', headers, body });
}

test('HTTP lifecycle releases port and rejects occupied port', async t => {
    const api = await startApi({ host: '127.0.0.1', port: 0 });
    t.after(() => api.stop());
    const port = api.address.port;
    await assert.rejects(startApi({ host: '127.0.0.1', port }), { code: 'EADDRINUSE' });
    await Promise.all([api.stop(), api.stop()]);
    const restarted = await startApi({ host: '127.0.0.1', port });
    await restarted.stop();
});

test('QR containing serial uses the same persistence flow', async t => {
    const saved = [];
    const post = await serve(t, { insert: async serial => { saved.push(serial); } });
    const response = await post(JSON.stringify({ 'qr-code': 'AbC123', ignored: true }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'OK' });
    assert.deepEqual(saved, ['AbC123']);
});

test('invalid JSON, content type, size and removed route return errors', async t => {
    const post = await serve(t, { insert: async () => assert.fail('Must not insert') });
    for (const [body, headers, path, status] of [
        ['{', undefined, undefined, 400],
        [JSON.stringify({ 'serial-number': 'x'.repeat(5000) }), undefined, undefined, 413],
        ['abc', { 'Content-Type': 'text/plain' }, undefined, 415],
        ['{}', undefined, '/api/pcm/entries', 404]
    ]) {
        const response = await post(body, headers, path);
        assert.equal(response.status, status);
        const result = await response.json();
        assert.equal(result.status, 'ERROR');
        assert.ok(result.msg);
    }
});
