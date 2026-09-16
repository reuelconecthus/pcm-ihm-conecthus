(() => {
    const ids = ['host', 'port', 'unitId', 'timeout', 'writeAddress', 'registerCount', 'byteOrder', 'text', 'responseAddress', 'responseCount', 'responseMode', 'expected', 'responseTimeout'] as const;
    const field = (id: string) => document.getElementById(id) as HTMLInputElement;
    const status = document.getElementById('status')!;
    const log = document.getElementById('log')!;
    const connection = document.getElementById('connection-status')!;
    const plc = document.getElementById('plc-status')!;
    let active = false;
    let stopped = false;
    let revision = 0;
    let probing: Promise<void> | undefined;
    const indicate = (element: HTMLElement, state: string, text: string) => {
        element.dataset.state = state; element.textContent = text;
    };
    const optionsFromFields = () => Object.fromEntries(ids.map(id => [id, numeric.has(id) ? Number(field(id).value) : field(id).value])) as unknown as Parameters<typeof window.modbus.execute>[1];
    const showConnection = (ok: boolean) => {
        indicate(connection, ok ? 'ok' : 'error', ok ? 'ONLINE' : 'OFFLINE');
        if (!ok) indicate(plc, 'idle', 'SEM CONEXÃO');
        else if (plc.textContent === 'SEM CONEXÃO') indicate(plc, 'idle', 'AGUARDANDO ENVIO');
    };
    const checkConnection = (): Promise<void> => {
        if (stopped || active) return Promise.resolve();
        if (probing) return probing;
        if (!field('host').value.trim()) {
            indicate(connection, 'idle', 'NÃO CONFIGURADO');
            indicate(plc, 'idle', 'AGUARDANDO ENVIO');
            return Promise.resolve();
        }
        const current = revision;
        probing = (async () => {
            try {
                const result = await window.modbus.execute('probe', { ...optionsFromFields(), timeout: 1500 });
                if (!stopped && current === revision) showConnection(result.ok);
            } catch {
                if (!stopped && current === revision) showConnection(false);
            } finally { probing = undefined; }
        })();
        return probing;
    };
    const numeric = new Set(['port', 'unitId', 'timeout', 'writeAddress', 'registerCount', 'responseAddress', 'responseCount', 'responseTimeout']);
    try { const saved = JSON.parse(sessionStorage.getItem('pcm.modbus.test') || '{}'); ids.forEach(id => { if (typeof saved[id] === 'string') field(id).value = saved[id]; }); } catch {}
    const save = () => { try { sessionStorage.setItem('pcm.modbus.test', JSON.stringify(Object.fromEntries(ids.map(id => [id, field(id).value])))); } catch {} };
    ids.forEach(id => field(id).addEventListener('change', save));
    ids.forEach(id => field(id).addEventListener('input', () => {
        revision++;
        indicate(plc, 'idle', 'AGUARDANDO ENVIO');
        if (id === 'host' || id === 'port') indicate(connection, 'idle', field('host').value.trim() ? 'AGUARDANDO VERIFICAÇÃO' : 'NÃO CONFIGURADO');
    }));
    const record = (message: string) => {
        const row = document.createElement('pre'); row.textContent = `${new Date().toLocaleTimeString('pt-BR')} · ${message}`; log.prepend(row);
        while (log.children.length > 100) log.lastElementChild?.remove();
    };
    const execute = async (action: 'ping' | 'read' | 'send') => {
        if (active || stopped) return;
        active = true;
        save();
        const options = Object.fromEntries(ids.map(id => [id, numeric.has(id) ? Number(field(id).value) : field(id).value]));
        const controls = document.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,select,textarea,button');
        controls.forEach(control => { control.disabled = true; }); status.textContent = 'Teste em andamento…';
        if (action === 'send') indicate(plc, 'pending', 'AGUARDANDO');
        record(`${action === 'send' ? 'Envio solicitado' : action === 'read' ? 'Leitura solicitada' : 'Ping ICMP + TCP'} para ${options.host}:${options.port}`);
        try {
            await probing;
            if (stopped) return;
            if (action === 'send') indicate(plc, 'pending', 'AGUARDANDO');
            const result = await window.modbus.execute(action, options as unknown as Parameters<typeof window.modbus.execute>[1]);
            if (stopped) return;
            if (action === 'ping') showConnection(result.ok);
            if (action === 'send') indicate(plc, result.ok && result.written ? 'ok' : 'error', result.ok && result.written ? 'OK' : 'ERRO');
            status.textContent = result.ok ? 'Teste concluído' : 'Verifique o resultado';
            record(result.message);
            if (result.registers) record(`Registradores: ${result.registers.join(', ')}\nHex: ${result.registers.map(value => value.toString(16).padStart(4, '0')).join(' ')}\nTexto: ${JSON.stringify(result.text)}`);
        } catch (error) {
            status.textContent = 'Erro no teste'; record((error as Error).message);
            if (action === 'send') indicate(plc, 'error', 'ERRO');
        }
        finally {
            active = false;
            controls.forEach(control => { control.disabled = false; });
            void checkConnection();
        }
    };
    (['ping', 'read', 'send'] as const).forEach(action => { field(action).onclick = () => void execute(action); });
    field('clear').onclick = () => log.replaceChildren();
    const monitor = window.setInterval(() => void checkConnection(), 3000);
    window.addEventListener('pagehide', () => { stopped = true; window.clearInterval(monitor); revision++; });
    void checkConnection();
})();
