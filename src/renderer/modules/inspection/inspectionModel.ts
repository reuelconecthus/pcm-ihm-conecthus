namespace Inspection {
    export type Result = 'approved' | 'rejected' | 'noCode';
    export interface Capture {
        id: string;
        machineId: string;
        code: string;
        capturedAt: string;
        result: Result;
        imageUrl?: string;
    }
    export interface MachineConfig { id: string; name: string; station: string; }
    export const machines: MachineConfig[] = [
        { id: 'machine-01', name: 'Inspeção 01', station: 'Máquina 01' },
        { id: 'machine-02', name: 'Inspeção 02', station: 'Máquina 02' }
    ];

    // Uma sessão por máquina. Sem dependência de câmera, HTTP ou Electron.
    export class Session {
        readonly queue: Capture[] = [];
        readonly history: Capture[] = [];
        constructor(readonly machineId: string) {}
        enqueue(capture: Capture): boolean {
            if (capture.machineId !== this.machineId || this.queue.length >= 50
                || [...this.queue, ...this.history].some(item => item.id === capture.id)) return false;
            this.queue.push(capture);
            return true;
        }
        processNext(): Capture | undefined {
            const capture = this.queue.shift();
            if (capture) {
                this.history.unshift(capture);
                this.history.length = Math.min(this.history.length, 200);
            }
            return capture;
        }
    }
}
