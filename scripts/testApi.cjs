const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { createApp } = require('../dist/api/app');
const { startApi } = require('../dist/api/server');

test('Swagger e especificação ficam disponíveis sem acessar o banco', async t => {
    const server = createApp({ insert: async () => assert.fail('Não deve gravar') }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base + '/api-docs/openapi.json');
    assert.equal(response.status, 200);
    const spec = await response.json();
    assert.equal(spec.openapi, '3.0.3');
    assert.equal(spec.servers[0].url, '/');
    const endpoint = spec.paths['/api/serial-numbers'].post;
    for (const status of ['200', '400', '409', '413', '415', '500', '503']) assert.ok(endpoint.responses[status]);
    assert.equal(spec.info.title, 'API PCM');
    assert.equal(spec.components.schemas.EntryRequestDto.oneOf.length, 2);
    assert.equal(spec.components.schemas.ApiResponseDto.oneOf.length, 2);
    assert.equal(endpoint.requestBody.content['application/json'].schema.$ref, '#/components/schemas/EntryRequestDto');
    const page = await fetch(base + '/api-docs/');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /swagger-ui/);
    for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-init.js']) {
        const result = await fetch(base + '/api-docs/' + asset);
        assert.equal(result.status, 200);
        assert.ok((await result.text()).length > 0);
    }
});

async function serve(t, repository) {
    const server = createApp(repository).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return (body, headers = { 'Content-Type': 'application/json' }, path = '/api/serial-numbers') =>
        fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', headers, body });
}

test('servidor HTTP libera a porta ao encerrar e rejeita porta ocupada', async t => {
    const api = await startApi({ host: '127.0.0.1', port: 0 });
    t.after(() => api.stop());
    const port = api.address.port;
    await assert.rejects(startApi({ host: '127.0.0.1', port }), { code: 'EADDRINUSE' });
    await Promise.all([api.stop(), api.stop()]);
    const restarted = await startApi({ host: '127.0.0.1', port });
    await restarted.stop();
});

test('QR com serial utiliza o mesmo fluxo de persistência', async t => {
    const saved = [];
    const post = await serve(t, { insert: async serial => { saved.push(serial); } });
    const response = await post(JSON.stringify({ 'qr-code': 'AbC123', ignored: true }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'OK' });
    assert.deepEqual(saved, ['AbC123']);
});

test('retorna erros para JSON inválido, tipo de conteúdo, tamanho e rota removida', async t => {
    const post = await serve(t, { insert: async () => assert.fail('Não deve gravar') });
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
