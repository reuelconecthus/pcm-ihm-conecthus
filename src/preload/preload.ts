import { contextBridge, ipcRenderer } from 'electron';
import type { TcpApiContract } from '../modules/tcp/contracts/tcpApiContract';
import type { TcpSessionEvent } from '../modules/tcp/types/tcpTypes';
import type { ModbusApiContract } from '../modules/modbus/contracts/modbusApiContract';

const tcp: TcpApiContract = {
    connect: (options) => ipcRenderer.invoke('tcp:connect', options),
    disconnect: () => ipcRenderer.invoke('tcp:disconnect'),
    saveLog: (content) => ipcRenderer.invoke('tcp:saveLog', content),
    getState: () => ipcRenderer.invoke('tcp:getState'),
    clearLog: () => ipcRenderer.invoke('tcp:clearLog'),
    onEvent: (callback) => {
        const listener = (_event: Electron.IpcRendererEvent, data: TcpSessionEvent) => callback(data);
        ipcRenderer.on('tcp:event', listener);
        return () => ipcRenderer.removeListener('tcp:event', listener);
    }
};

contextBridge.exposeInMainWorld('tcp', tcp);
const modbus: ModbusApiContract = { execute: (action, options) => ipcRenderer.invoke('modbus:execute', action, options) };
contextBridge.exposeInMainWorld('modbus', modbus);
