const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createServer } = require('node:net');
const { once } = require('node:events');
const { TcpService } = require('../dist/services/tcpService');

test('recebe bytes sem perder dados e preserva UTF-8 dividido entre blocos', { timeout: 5000 }, async () => {
    const server = createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const events = [];
    let notify;
    const service = new TcpService((event) => { events.push(event); notify?.(); });
    const waitFor = (predicate) => new Promise((resolve) => {
        notify = () => { if (predicate()) resolve(); };
        notify();
    });
    let peer;
    try {
        const accepted = once(server, 'connection');
        service.connect({ host: '127.0.0.1', port: server.address().port });
        [peer] = await accepted;
        peer.write(Buffer.from([0xc3]));
        await waitFor(() => events.some((event) => event.kind === 'data'));
        peer.write(Buffer.from([0xa7, 0x00, 0xff]));
        await waitFor(() => events.filter((event) => event.kind === 'data').reduce((sum, event) => sum + event.bytes, 0) === 4);
        const data = events.filter((event) => event.kind === 'data');
        assert.equal(data.map((event) => event.hex).join(''), 'c3a700ff');
        assert.equal(data.map((event) => event.message).join(''), 'ç\u0000\ufffd');
        peer.end();
        await waitFor(() => events.some((event) => event.message === 'Conexão encerrada.'));
        assert.equal(events.at(-1).connected, false);
    } finally {
        service.disconnect();
        peer?.destroy();
        await new Promise((resolve) => server.close(resolve));
    }
});

test('rejeita porta inválida antes de abrir uma conexão', () => {
    const service = new TcpService(() => {});
    assert.throws(() => service.connect({ host: '127.0.0.1', port: 0 }));
    assert.throws(() => service.connect({ host: '', port: 5000 }));
});

test('informa erro quando a conexão é recusada', { timeout: 5000 }, async () => {
    const server = createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    const events = [];
    let finish;
    const closed = new Promise((resolve) => { finish = resolve; });
    const service = new TcpService((event) => {
        events.push(event);
        if (event.message === 'Conexão encerrada.') finish();
    });
    try {
        service.connect({ host: '127.0.0.1', port });
        await closed;
        assert.ok(events.some((event) => event.message.includes('ECONNREFUSED')));
        assert.equal(events.at(-1).connected, false);
    } finally {
        service.disconnect();
    }
});
