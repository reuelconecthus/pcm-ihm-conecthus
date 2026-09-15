import { app, BrowserWindow, ipcMain } from 'electron';
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
    window.webContents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
        if (isMainFrame && !isInPlace) tcp.disconnect();
    });
    window.on('closed', () => {
        tcp.disconnect();
        ipcMain.removeHandler(connectChannel);
        ipcMain.removeHandler('tcp:disconnect');
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
