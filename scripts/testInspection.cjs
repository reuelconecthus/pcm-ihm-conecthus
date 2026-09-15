const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../dist/renderer/modules/inspection/inspectionModel.js'), 'utf8');
const { Session } = runInNewContext(source + '\nInspection;');
const capture = (id, machineId = 'machine-01') => ({ id, machineId, code: id, result: 'approved', capturedAt: new Date().toISOString() });

test('máquinas mantêm filas e históricos independentes', () => {
    const first = new Session('machine-01');
    const second = new Session('machine-02');
    assert.equal(first.enqueue(capture('a')), true);
    assert.equal(second.enqueue(capture('a')), false);
    second.enqueue(capture('b', 'machine-02'));
    assert.equal(first.processNext().id, 'a');
    assert.equal(second.history.length, 0);
    assert.equal(second.queue.length, 1);
});

test('fila processa na ordem de chegada e rejeita duplicatas', () => {
    const session = new Session('machine-01');
    session.enqueue(capture('a')); session.enqueue(capture('b'));
    assert.equal(session.enqueue(capture('a')), false);
    assert.equal(session.processNext().id, 'a');
    assert.equal(session.enqueue(capture('a')), false);
    assert.equal(session.processNext().id, 'b');
    assert.equal(session.processNext(), undefined);
});

test('limita fila a 50 capturas e histórico a 200', () => {
    const session = new Session('machine-01');
    for (let i = 0; i < 50; i++) assert.equal(session.enqueue(capture(String(i))), true);
    assert.equal(session.enqueue(capture('overflow')), false);
    while (session.queue.length) session.processNext();
    for (let i = 50; i < 210; i++) { session.enqueue(capture(String(i))); session.processNext(); }
    assert.equal(session.history.length, 200);
    assert.equal(session.history[0].id, '209');
});
