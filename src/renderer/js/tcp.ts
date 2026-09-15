(() => {
    const form = document.getElementById('tcp-form') as HTMLFormElement;
    const host = document.getElementById('host') as HTMLInputElement;
    const port = document.getElementById('port') as HTMLInputElement;
    const connect = document.getElementById('connect') as HTMLButtonElement;
    const disconnect = document.getElementById('disconnect') as HTMLButtonElement;
    const status = document.getElementById('tcp-status')!;
    const log = document.getElementById('tcp-log')!;
    const count = document.getElementById('byte-count')!;
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
    });
    window.addEventListener('pagehide', unsubscribe, { once: true });
})();
