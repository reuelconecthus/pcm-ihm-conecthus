import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { TcpService } from '../modules/tcp/services/tcpService';
import { TcpSession } from '../modules/tcp/sessions/tcpSession';
import { startApi } from '../api/server';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { ModbusTestService } from '../modules/modbus/services/modbusTestService';

let api: Awaited<ReturnType<typeof startApi>> | undefined;
let shuttingDown = false;

function createWindow() {

    const window = new BrowserWindow({
        width: 1000,
        height: 700,

        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js')
        }
    });

    const session = new TcpSession();
    const modbus = new ModbusTestService();
    ipcMain.handle('modbus:execute', (event, action, options) => {
        if (event.sender !== window.webContents) throw new Error('Janela inválida.');
        return modbus.execute(action, options);
    });
    const tcp = new TcpService((event) => {
        const entry = session.record(event);
        if (!window.isDestroyed()) window.webContents.send('tcp:event', entry);
    });
    const connectChannel = 'tcp:connect';
    ipcMain.handle(connectChannel, (event, options) => {
        if (event.sender !== window.webContents) throw new Error('Janela inválida.');
        tcp.connect(options);
        session.state.options = { host: options.host.trim(), port: options.port };
    });
    ipcMain.handle('tcp:disconnect', (event) => {
        if (event.sender !== window.webContents) throw new Error('Janela inválida.');
        tcp.disconnect();
    });
    ipcMain.handle('tcp:saveLog', async (event, content: unknown) => {
        if (event.sender !== window.webContents) throw new Error('Janela inválida.');
        if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 16 * 1024 * 1024) {
            throw new Error('Conteúdo do arquivo inválido ou maior que 16 MB.');
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const result = await dialog.showSaveDialog(window, {
            title: 'Salvar registros do teste TCP/IP',
            defaultPath: path.join(app.getPath('documents'), `testeTcp-${timestamp}.txt`),
            filters: [{ name: 'Arquivo de texto', extensions: ['txt'] }]
        });
        if (result.canceled || !result.filePath) return null;
        await writeFile(result.filePath, content, 'utf8');
        return result.filePath;
    });
    ipcMain.handle('tcp:getState', (event) => {
        if (event.sender !== window.webContents) throw new Error('Janela inválida.');
        return session.state;
    });
    ipcMain.handle('tcp:clearLog', (event) => {
        if (event.sender !== window.webContents) throw new Error('Janela inválida.');
        return session.clear();
    });
    window.on('closed', () => {
        modbus.dispose();
        ipcMain.removeHandler('modbus:execute');
        tcp.disconnect();
        ipcMain.removeHandler(connectChannel);
        ipcMain.removeHandler('tcp:disconnect');
        ipcMain.removeHandler('tcp:saveLog');
        ipcMain.removeHandler('tcp:getState');
        ipcMain.removeHandler('tcp:clearLog');
    });

    window.loadFile(
        path.join(__dirname, '../index.html')
    );
}

app.whenReady().then(async () => {

    try {
        const configDir = app.isPackaged
            ? (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe')))
            : app.getAppPath();
        const envPath = path.join(configDir, '.env');
        if (existsSync(envPath)) loadEnvFile(envPath);
        api = await startApi();
    } catch (error) {
        const cause = error as NodeJS.ErrnoException;
        dialog.showErrorBox('Não foi possível iniciar a API', cause.code === 'EADDRINUSE'
            ? 'A porta da API está ocupada. Encerre a outra instância ou altere API_PORT no arquivo .env.'
            : `Verifique a configuração da API. ${cause.message}`);
        app.quit();
        return;
    }

    createWindow();

    app.on('activate', () => {

        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }

    });

});

app.on('before-quit', event => {
    if (!api || shuttingDown) return;
    event.preventDefault();
    shuttingDown = true;
    void api.stop().catch(error => {
        console.error('Erro ao encerrar a API:', error);
    }).finally(() => app.quit());
});

app.on('window-all-closed', () => {

    if (process.platform !== 'darwin') {
        app.quit();
    }

}); 
