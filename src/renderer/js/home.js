(() => {
    'use strict';

    // Por enquanto, os comandos exibem alertas. A comunicação com a máquina ficará aqui.
    function startMachine() {
        alert('Comando: INICIAR');
    }

    function stopMachine() {
        alert('Comando: PARAR');
    }

    function resetMachine() {
        alert('Comando: RESET');
    }

    function emergencyStop() {
        alert('PARADA SOLICITADA!');
    }

    function navigateTo(page) {
        // Avisa qual tela foi escolhida no menu.
        // Quem escutar o evento home:navigate poderá carregar a tela indicada em detail.page.
        document.dispatchEvent(new CustomEvent('home:navigate', {
            detail: { page }
        }));
    }

    function initializeHome() {
        const commandHandlers = {
            start: startMachine,
            stop: stopMachine,
            reset: resetMachine,
            emergency: emergencyStop
        };

        document.querySelectorAll('[data-command]').forEach((button) => {
            const handler = commandHandlers[button.dataset.command];

            if (typeof handler === 'function') {
                button.addEventListener('click', handler);
            }
        });

        document.querySelectorAll('[data-page]').forEach((button) => {
            button.addEventListener('click', () => navigateTo(button.dataset.page));
        });

        // Simula as leituras enquanto os dados reais da máquina não estão disponíveis.
        const load1 = document.getElementById('load1');
        const load2 = document.getElementById('load2');

        if (load1 && load2) {
            const simulationInterval = window.setInterval(() => {
                load1.textContent = (Math.random() * 15).toFixed(3);
                load2.textContent = (Math.random() * 15).toFixed(3);
            }, 1000);

            window.addEventListener('pagehide', () => {
                window.clearInterval(simulationInterval);
            }, { once: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHome, { once: true });
    } else {
        initializeHome();
    }
})();
