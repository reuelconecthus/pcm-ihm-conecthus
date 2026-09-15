window.addEventListener('load', () => {
    // Deixa a tela de carregamento aparecer antes de abrir a home.
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            window.location.replace('renderer/views/home.html');
        });
    });
}, { once: true });
