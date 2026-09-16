export interface ModbusOptions {
    host: string; port: number; unitId: number; timeout: number;
    writeAddress: number; registerCount: number; byteOrder: 'be' | 'le'; text: string;
    responseAddress: number; responseCount: number; responseMode: 'number' | 'text'; expected: string;
    responseTimeout: number;
}
export interface ModbusResult { ok: boolean; message: string; registers?: number[]; text?: string; written?: boolean; }
export type ModbusAction = 'ping' | 'read' | 'send';
