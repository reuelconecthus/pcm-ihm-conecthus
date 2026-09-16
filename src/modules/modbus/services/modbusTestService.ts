import ModbusRTU from 'modbus-serial';
import { Socket, isIP } from 'node:net';
import { execFile } from 'node:child_process';
import type { ModbusAction, ModbusOptions, ModbusResult } from '../types/modbusTypes';

function integer(value: number, min: number, max: number, label: string) {
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label}: informe ${min} a ${max}.`);
}
export function encodeRegisters(text: string, count: number, order: 'be' | 'le'): number[] {
    integer(count, 1, 123, 'Quantidade de registradores');
    if (order !== 'be' && order !== 'le') throw new Error('Ordem dos bytes inválida.');
    if (typeof text !== 'string' || !text.length) throw new Error('Informe o conteúdo do QR code.');
    const bytes = Buffer.from(text, 'utf8');
    if (bytes.length > count * 2) throw new Error(`Texto ocupa ${bytes.length} bytes; capacidade de ${count * 2}.`);
    const padded = Buffer.alloc(count * 2); bytes.copy(padded);
    return Array.from({ length: count }, (_, i) => order === 'be' ? padded.readUInt16BE(i * 2) : padded.readUInt16LE(i * 2));
}
function decode(registers: number[], order: 'be' | 'le') {
    const bytes = Buffer.alloc(registers.length * 2);
    registers.forEach((value, i) => order === 'be' ? bytes.writeUInt16BE(value, i * 2) : bytes.writeUInt16LE(value, i * 2));
    return bytes.toString('utf8').replace(/\0+$/, '');
}
export class ModbusTestService {
    private busy = false;
    private client?: ModbusRTU;
    private probe?: Socket;
    private disposed = false;
    dispose() { this.disposed = true; this.client?.destroy(() => {}); this.probe?.destroy(); }

    async execute(action: ModbusAction, options: ModbusOptions): Promise<ModbusResult> {
        if (this.disposed || this.busy) return { ok: false, message: 'Teste indisponível ou em andamento.' };
        this.busy = true;
        let written = false;
        let client: ModbusRTU | undefined;
        try {
            if (!options || typeof options.host !== 'string' || !isIP(options.host.trim())) throw new Error('Informe um IP válido da CLP.');
            integer(options.port, 1, 65535, 'Porta'); integer(options.timeout, 100, 10000, 'Timeout');
            if (action === 'ping' || action === 'probe') {
                const icmp = action === 'probe' ? '' : await new Promise<string>(resolve => {
                    const args = process.platform === 'win32' ? ['-n', '1', '-w', String(options.timeout), options.host.trim()]
                        : ['-c', '1', options.host.trim()];
                    execFile('ping', args, { timeout: options.timeout + 1000, windowsHide: true, maxBuffer: 8192 }, (error, stdout, stderr) => {
                        resolve(`ICMP: ${error ? 'falhou ou indisponível' : 'comando concluído; confira a saída'}\n${stdout || stderr}`);
                    });
                });
                if (this.disposed) throw new Error('Teste encerrado.');
                const tcp = await new Promise<string>((resolve) => {
                    const socket = this.probe = new Socket();
                    const timer = setTimeout(() => { resolve('Tempo esgotado'); socket.destroy(); }, options.timeout);
                    socket.once('error', error => resolve(error.message));
                    socket.once('close', () => { clearTimeout(timer); resolve('Conexão encerrada'); });
                    socket.connect(options.port, options.host.trim(), () => { clearTimeout(timer); resolve('Porta acessível'); socket.destroy(); });
                });
                return { ok: tcp === 'Porta acessível', message: `${icmp}\nTCP ${options.port}: ${tcp}. Isso não confirma resposta Modbus nem aprovação da CLP.` };
            }
            if (action !== 'read' && action !== 'send') throw new Error('Ação inválida.');
            integer(options.unitId, 1, 247, 'Unit ID');
            integer(options.responseAddress, 0, 65535, 'Endereço de resposta');
            integer(options.responseCount, 1, 125, 'Quantidade de resposta');
            if (options.responseAddress + options.responseCount > 65536) throw new Error('Faixa de leitura inválida.');
            if (!['be', 'le'].includes(options.byteOrder) || !['number', 'text'].includes(options.responseMode)) throw new Error('Formato inválido.');
            if (typeof options.expected !== 'string' || !options.expected.length || options.expected.length > 250) throw new Error('Informe o valor esperado.');
            if (options.responseMode === 'number') {
                if (!/^\d+$/.test(options.expected)) throw new Error('OK numérico deve ser um inteiro decimal.');
                integer(Number(options.expected), 0, 65535, 'Valor OK');
            }
            let values: number[] = [];
            if (action === 'send') {
                integer(options.writeAddress, 0, 65535, 'Endereço de escrita');
                values = encodeRegisters(options.text, options.registerCount, options.byteOrder);
                if (options.writeAddress + values.length > 65536) throw new Error('Faixa de escrita inválida.');
                if (options.writeAddress < options.responseAddress + options.responseCount && options.responseAddress < options.writeAddress + values.length) throw new Error('As faixas de escrita e resposta não podem se sobrepor.');
                integer(options.responseTimeout, 100, 60000, 'Espera da resposta');
            }
            client = this.client = new ModbusRTU();
            client.setID(options.unitId); client.setTimeout(options.timeout);
            await client.connectTCP(options.host.trim(), { port: options.port, timeout: options.timeout });
            const read = async () => {
                if (this.disposed) throw new Error('Teste encerrado.');
                const { data } = await client!.readHoldingRegisters(options.responseAddress, options.responseCount);
                return { registers: data, text: decode(data, options.byteOrder) };
            };
            const matches = (data: { registers: number[]; text: string }) => options.responseMode === 'number'
                ? data.registers[0] === Number(options.expected) : data.text === options.expected;
            const initial = await read();
            if (action === 'read') return { ok: true, message: `Leitura FC03: ${matches(initial) ? 'valor OK presente (sem correlação com envio)' : 'valor diferente do OK esperado'}.`, ...initial };
            if (matches(initial)) return { ok: false, message: 'OK já presente antes do envio. Nada foi escrito. Limpe o sinal pelo processo da CLP e tente novamente.', ...initial, written: false };
            await client.writeRegisters(options.writeAddress, values); written = true;
            const deadline = Date.now() + options.responseTimeout;
            let last = initial;
            while (Date.now() < deadline) {
                client.setTimeout(Math.max(1, Math.min(options.timeout, deadline - Date.now())));
                last = await read();
                if (matches(last)) return { ok: true, message: 'Escrita FC16 confirmada e valor OK observado na CLP. Validar correlação com o programa da CLP.', ...last, written };
                await new Promise(resolve => setTimeout(resolve, Math.min(250, Math.max(0, deadline - Date.now()))));
            }
            return { ok: false, message: 'Escrita confirmada, mas OK não recebido no prazo.', ...last, written };
        } catch (error) {
            return { ok: false, message: `${written ? 'Escrita confirmada. ' : 'Se houve tentativa de escrita, ela pode ter sido aplicada mesmo sem confirmação. '}${(error as Error).message}`, written };
        } finally {
            client?.destroy(() => {}); this.client = undefined; this.probe?.destroy(); this.probe = undefined; this.busy = false;
        }
    }
}
