(() => {
    const form = document.getElementById('tcp-form') as HTMLFormElement;
    const host = document.getElementById('host') as HTMLInputElement;
    const port = document.getElementById('port') as HTMLInputElement;
    const connect = document.getElementById('connect') as HTMLButtonElement;
    const disconnect = document.getElementById('disconnect') as HTMLButtonElement;
    const status = document.getElementById('tcp-status')!;
    const log = document.getElementById('tcp-log')!;
    const count = document.getElementById('byte-count')!;
    const save = document.getElementById('save-log') as HTMLButtonElement;
    const saveStatus = document.getElementById('save-status')!;
    let saving = false;
    let bytes = 0;

    function setBusy(busy: boolean) {
        connect.disabled = busy;
        host.disabled = busy;
        port.disabled = busy;
        disconnect.disabled = !busy;
    }

    const unsubscribe = window.tcp.onEvent((event) => {
        if (event.kind === 'status') {
            status.textContent = event.message;
            if (event.connected) setBusy(true);
            else if (event.message !== 'Conectando…') setBusy(false);
        } else {
            bytes += event.bytes ?? 0;
            count.textContent = String(bytes);
        }
        const entry = document.createElement('pre');
        entry.style.whiteSpace = 'pre-wrap';
        entry.style.overflowWrap = 'anywhere';
        const heading = `[${new Date(event.time).toLocaleTimeString()}] `;
        entry.textContent = event.kind === 'data'
            ? `${heading}${event.bytes} bytes\nTexto: ${JSON.stringify(event.message.slice(0, 4096))}\nHex: ${event.hex?.slice(0, 8192).match(/.{1,2}/g)?.join(' ') ?? ''}`
            : heading + event.message;
        log.append(entry);
        save.disabled = saving;
        while (log.childElementCount > 200) log.firstElementChild?.remove();
        log.scrollTop = log.scrollHeight;
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
            await window.tcp.connect({ host: host.value.trim(), port: Number(port.value) });
        } catch (error) {
            status.textContent = String(error);
            setBusy(false);
        }
    });
    disconnect.addEventListener('click', async () => {
        try {
            await window.tcp.disconnect();
            setBusy(false);
        } catch (error) {
            status.textContent = String(error);
        }
    });
    document.getElementById('clear')!.addEventListener('click', () => {
        log.replaceChildren();
        bytes = 0;
        count.textContent = '0';
        save.disabled = true;
        saveStatus.textContent = '';
    });
    save.addEventListener('click', async () => {
        // Salva uma cópia dos registros atuais, mesmo se chegarem novos dados durante a escolha da pasta.
        const entries = Array.from(log.children, (entry) => entry.textContent ?? '');
        if (!entries.length || saving) return;
        const content = [
            'PCM - TESTE TCP/IP',
            `Exportado em: ${new Date().toLocaleString()}`,
            `Total recebido desde a última limpeza: ${bytes} bytes`,
            `Registros exportados: ${entries.length}`,
            'Exportação dos registros visíveis (até 200). Blocos longos têm prévia limitada a 4096 caracteres de texto e 4096 bytes em hexadecimal.',
            '',
            ...entries
        ].join('\r\n\r\n');
        saving = true;
        save.disabled = true;
        saveStatus.textContent = 'Escolha onde salvar o arquivo.';
        try {
            const filePath = await window.tcp.saveLog(content);
            saveStatus.textContent = filePath ? `Arquivo salvo: ${filePath}` : 'Salvamento cancelado.';
        } catch (error) {
            saveStatus.textContent = `Não foi possível salvar: ${String(error)}`;
        } finally {
            saving = false;
            save.disabled = log.childElementCount === 0;
        }
    });
    window.addEventListener('pagehide', unsubscribe, { once: true });
})();
