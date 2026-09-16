(() => {
    const ids = ['host', 'port', 'unitId', 'timeout', 'writeAddress', 'registerCount', 'byteOrder', 'text', 'responseAddress', 'responseCount', 'responseMode', 'expected', 'responseTimeout'] as const;
    const field = (id: string) => document.getElementById(id) as HTMLInputElement;
    const status = document.getElementById('status')!;
    const log = document.getElementById('log')!;
    const numeric = new Set(['port', 'unitId', 'timeout', 'writeAddress', 'registerCount', 'responseAddress', 'responseCount', 'responseTimeout']);
    try { const saved = JSON.parse(sessionStorage.getItem('pcm.modbus.test') || '{}'); ids.forEach(id => { if (typeof saved[id] === 'string') field(id).value = saved[id]; }); } catch {}
    const save = () => { try { sessionStorage.setItem('pcm.modbus.test', JSON.stringify(Object.fromEntries(ids.map(id => [id, field(id).value])))); } catch {} };
    ids.forEach(id => field(id).addEventListener('change', save));
    const record = (message: string) => {
        const row = document.createElement('pre'); row.textContent = `${new Date().toLocaleTimeString('pt-BR')} · ${message}`; log.prepend(row);
        while (log.children.length > 100) log.lastElementChild?.remove();
    };
    const execute = async (action: 'ping' | 'read' | 'send') => {
        save();
        const options = Object.fromEntries(ids.map(id => [id, numeric.has(id) ? Number(field(id).value) : field(id).value]));
        const controls = document.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,select,textarea,button');
        controls.forEach(control => { control.disabled = true; }); status.textContent = 'Teste em andamento…';
        record(`${action === 'send' ? 'Envio solicitado' : action === 'read' ? 'Leitura solicitada' : 'Ping ICMP + TCP'} para ${options.host}:${options.port}`);
        try {
            const result = await window.modbus.execute(action, options as unknown as Parameters<typeof window.modbus.execute>[1]);
            status.textContent = result.ok ? 'Teste concluído' : 'Verifique o resultado';
            record(result.message);
            if (result.registers) record(`Registradores: ${result.registers.join(', ')}\nHex: ${result.registers.map(value => value.toString(16).padStart(4, '0')).join(' ')}\nTexto: ${JSON.stringify(result.text)}`);
        } catch (error) { status.textContent = 'Erro no teste'; record((error as Error).message); }
        finally { controls.forEach(control => { control.disabled = false; }); }
    };
    (['ping', 'read', 'send'] as const).forEach(action => { field(action).onclick = () => void execute(action); });
    field('clear').onclick = () => log.replaceChildren();
})();
