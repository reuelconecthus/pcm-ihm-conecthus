import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { TcpService } from '../services/tcpService';

function createWindow() {

    const window = new BrowserWindow({
        width: 1000,
        height: 700,

        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js')
        }
    });

    const tcp = new TcpService((event) => {
        if (!window.isDestroyed()) window.webContents.send('tcp:event', event);
    });
    const connectChannel = 'tcp:connect';
    ipcMain.handle(connectChannel, (event, options) => {
        if (event.sender !== window.webContents) throw new Error('Janela inválida.');
        tcp.connect(options);
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
    window.webContents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
        if (isMainFrame && !isInPlace) tcp.disconnect();
    });
    window.on('closed', () => {
        tcp.disconnect();
        ipcMain.removeHandler(connectChannel);
        ipcMain.removeHandler('tcp:disconnect');
        ipcMain.removeHandler('tcp:saveLog');
    });

    window.loadFile(
        path.join(__dirname, '../index.html')
    );
}

app.whenReady().then(() => {

    createWindow();

    app.on('activate', () => {

        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }

    });

});

app.on('window-all-closed', () => {

    if (process.platform !== 'darwin') {
        app.quit();
    }

}); 
