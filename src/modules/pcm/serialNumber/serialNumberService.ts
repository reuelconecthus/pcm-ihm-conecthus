import type { PcmEntryContract } from '../pcmEntryContract';
import { isSerialNumber, parseCodeInput } from './serialNumber';
import { InvalidSerialNumberError } from './invalidSerialNumberError';

export class SerialNumberService {
    constructor(private readonly repository: PcmEntryContract) {}

    async register(body: unknown): Promise<void> {
        const input = parseCodeInput(body);
        const serial = input['serial-number'] ?? input['qr-code'];
        if (!isSerialNumber(serial)) {
            throw new InvalidSerialNumberError('Para registrar a entrada, o QR code deve conter apenas o serial, de 1 a 512 caracteres sem espaços ou controles.');
        }
        await this.repository.insert(serial);
    }
}
