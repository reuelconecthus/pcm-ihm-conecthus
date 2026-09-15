import { contextBridge, ipcRenderer } from 'electron';
import type { TcpApi, TcpEvent } from '../types/tcp';

const tcp: TcpApi = {
    connect: (options) => ipcRenderer.invoke('tcp:connect', options),
    disconnect: () => ipcRenderer.invoke('tcp:disconnect'),
    saveLog: (content) => ipcRenderer.invoke('tcp:saveLog', content),
    onEvent: (callback) => {
        const listener = (_event: Electron.IpcRendererEvent, data: TcpEvent) => callback(data);
        ipcRenderer.on('tcp:event', listener);
        return () => ipcRenderer.removeListener('tcp:event', listener);
    }
};

contextBridge.exposeInMainWorld('tcp', tcp);
