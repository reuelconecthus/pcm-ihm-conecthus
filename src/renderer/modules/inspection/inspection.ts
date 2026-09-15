(() => {
    const machineId = new URLSearchParams(location.search).get('machine') || Inspection.machines[0].id;
    const config = Inspection.machines.find(machine => machine.id === machineId);
    if (!config) {
        document.querySelector('main')!.textContent = 'Máquina de inspeção não encontrada. Volte à home para escolher uma máquina.';
        return;
    }
    const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
    const session = new Inspection.Session(config.id);
    // Separa a sessão vazia dos dados de demonstração salvos anteriormente.
    const storageKey = `pcm.inspection.${config.id}${config.demo ? '' : '.live'}`;
    const labels: Record<Inspection.Result, string> = { approved: 'Aprovada', rejected: 'Reprovada', noCode: 'Sem código' };
    let selected: Inspection.Capture | undefined;
    let sequence = 0;
    const demoCapture = (time = Date.now()): Inspection.Capture => {
        sequence++;
        const result: Inspection.Result = sequence % 9 === 0 ? 'noCode' : sequence % 5 === 0 ? 'rejected' : 'approved';
        return { id: crypto.randomUUID(), machineId: config.id, capturedAt: new Date(time).toISOString(),
            code: result === 'noCode' ? '' : `GH43-${config.id === 'machine-01' ? '05254' : '07832'}C+PL1L908GS+${String(sequence).padStart(5, '0')}`, result };
    };
    const valid = (item: Inspection.Capture) => item && item.machineId === config.id && typeof item.id === 'string'
        && typeof item.code === 'string' && ['approved', 'rejected', 'noCode'].includes(item.result)
        && Number.isFinite(Date.parse(item.capturedAt));
    try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        if (saved && Array.isArray(saved.history) && Array.isArray(saved.queue)) {
            session.history.push(...saved.history.filter(valid).slice(0, 200));
            session.queue.push(...saved.queue.filter(valid).slice(0, 50));
            sequence = Number.isSafeInteger(saved.sequence) ? saved.sequence : 0;
        } else if (config.demo) {
            for (let i = 12; i > 0; i--) { session.enqueue(demoCapture(Date.now() - i * 4200)); session.processNext(); }
            for (let i = 0; i < 3; i++) session.enqueue(demoCapture());
        }
    } catch { /* Uma sessão indisponível inicia vazia. */ }
    function save() {
        try { sessionStorage.setItem(storageKey, JSON.stringify({ history: session.history, queue: session.queue, sequence })); }
        catch { /* A tela continua utilizável em memória. */ }
    }
    function showCapture(capture: Inspection.Capture) {
        selected = capture;
        get('result').className = `result ${capture.result}`;
        get('result').textContent = `${capture.result === 'approved' ? '✓' : capture.result === 'rejected' ? '✕' : '—'} ${labels[capture.result]}`;
        get('code').textContent = capture.code || 'Código não identificado';
        get('capture-time').textContent = new Date(capture.capturedAt).toLocaleTimeString('pt-BR');
        get('selected-note').textContent = 'Captura selecionada · ' + new Date(capture.capturedAt).toLocaleString('pt-BR');
        const img = get<HTMLImageElement>('capture-image');
        img.hidden = !capture.imageUrl;
        get('placeholder').hidden = !!capture.imageUrl;
        if (capture.imageUrl) img.src = capture.imageUrl;
        else img.removeAttribute('src');
    }
    function cell(row: HTMLTableRowElement, text: string) {
        const td = row.insertCell(); td.textContent = text; return td;
    }
    function render() {
        const filter = get<HTMLSelectElement>('filter').value;
        const visible = session.history.filter(capture => filter === 'all' || capture.result === filter);
        get('history-count').textContent = `${visible.length} registros`;
        get('history').replaceChildren();
        visible.forEach(capture => {
            const row = document.createElement('tr');
            if (capture.id === selected?.id) row.className = 'selected';
            cell(row, new Date(capture.capturedAt).toLocaleString('pt-BR'));
            const code = document.createElement('code'); code.textContent = capture.code || '—'; code.title = capture.code; cell(row, '').append(code);
            const badge = document.createElement('span'); badge.className = `badge ${capture.result}`; badge.textContent = labels[capture.result]; cell(row, '').append(badge);
            const button = document.createElement('button'); button.className = 'view-button'; button.textContent = 'Ver'; button.setAttribute('aria-label', `Ver captura ${capture.code || 'sem código'}`);
            button.onclick = () => { showCapture(capture); render(); }; cell(row, '').append(button); get('history').append(row);
        });
        if (!visible.length) { const row = document.createElement('tr'); const td = cell(row, 'Nenhuma captura para este filtro'); td.colSpan = 4; td.className = 'empty'; get('history').append(row); }
        const now = new Date(); const start = new Date(now); start.setMinutes(0, 0, 0);
        const current = session.history.filter(capture => Date.parse(capture.capturedAt) >= start.getTime() && Date.parse(capture.capturedAt) <= now.getTime());
        const count = (result: Inspection.Result) => current.filter(capture => capture.result === result).length;
        get('hour').textContent = `${String(now.getHours()).padStart(2, '0')}:00 – ${String((now.getHours() + 1) % 24).padStart(2, '0')}:00`;
        get('total').textContent = String(current.length); get('approved').textContent = String(count('approved'));
        get('rejected').textContent = String(count('rejected')); get('no-code').textContent = String(count('noCode'));
        get('rate').textContent = current.length ? `${Math.round(count('approved') / current.length * 100)}%` : '0%';
        const times = current.map(capture => Date.parse(capture.capturedAt)).sort((a, b) => a - b);
        get('cycle').textContent = times.length > 1 ? `${((times[times.length - 1] - times[0]) / (times.length - 1) / 1000).toFixed(1)} s` : '—';
        get('production').replaceChildren();
        const groups = new Map<string, Inspection.Capture[]>();
        session.history.forEach(capture => { const hour = new Date(capture.capturedAt); hour.setMinutes(0, 0, 0); const key = hour.toISOString(); groups.set(key, [...(groups.get(key) || []), capture]); });
        [...groups].sort(([a], [b]) => b.localeCompare(a)).forEach(([hour, captures]) => {
            const row = document.createElement('tr'); cell(row, new Date(hour).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
            cell(row, String(captures.length)); (['approved', 'rejected', 'noCode'] as const).forEach(result => cell(row, String(captures.filter(capture => capture.result === result).length))); get('production').append(row);
        });
    }
    get('title').textContent = config.name; get('station').textContent = config.station + ' / Inspeção visual'; document.title = `PCM · ${config.name}`;
    if (!config.demo) {
        document.querySelector<HTMLElement>('.demo')!.textContent = 'Câmera desconectada';
        document.querySelector<HTMLElement>('#placeholder strong')!.textContent = 'Aguardando imagem';
        get('selected-note').textContent = 'Nenhuma captura recebida';
    }
    document.querySelector(`[data-machine="${config.id}"]`)?.setAttribute('aria-current', 'page');
    get('filter').onchange = render;
    ['history', 'production'].forEach(tab => { get(`${tab}-tab`).onclick = () => {
        ['history', 'production'].forEach(name => { get(`${name}-panel`).hidden = name !== tab; get(`${name}-tab`).setAttribute('aria-pressed', String(name === tab)); });
    }; });
    if (session.history[0]) showCapture(session.history[0]);
    render();
    const clock = window.setInterval(render, 30000);
    window.addEventListener('pagehide', () => { clearInterval(clock); save(); }, { once: true });
})();
