import { contextBridge, ipcRenderer } from 'electron';
import type { TcpApi, TcpEvent } from '../shared/tcp';

const tcp: TcpApi = {
    connect: (options) => ipcRenderer.invoke('tcp:connect', options),
    disconnect: () => ipcRenderer.invoke('tcp:disconnect'),
    onEvent: (callback) => {
        const listener = (_event: Electron.IpcRendererEvent, data: TcpEvent) => callback(data);
        ipcRenderer.on('tcp:event', listener);
        return () => ipcRenderer.removeListener('tcp:event', listener);
    }
};

contextBridge.exposeInMainWorld('tcp', tcp);
