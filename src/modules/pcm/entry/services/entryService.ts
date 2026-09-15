import type { EntryContract } from '../repositories/entryContract';
import { isSerialNumber, parseEntryInput } from '../validators/entryValidation';
import { InvalidEntryError } from '../errors/invalidEntryError';

export class EntryService {
    constructor(private readonly repository: EntryContract) {}

    async register(body: unknown): Promise<void> {
        const input = parseEntryInput(body);
        const serial = input['serial-number'] ?? input['qr-code'];
        if (!isSerialNumber(serial)) {
            throw new InvalidEntryError('Para registrar a entrada, o QR code deve conter apenas o serial, de 1 a 512 caracteres sem espaços ou controles.');
        }
        await this.repository.insert(serial);
    }
}
