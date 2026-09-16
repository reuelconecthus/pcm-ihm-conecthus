import type { Collection } from 'mongodb';
import type { EntryContract } from './entryContract';
import { DuplicateSerialError } from '../errors/duplicateSerialError';

export interface PcmLineEntryDocument {
    serialNumber: string;
    enteredAt: Date;
}

export class EntryRepository implements EntryContract {
    constructor(private readonly collection: Pick<Collection<PcmLineEntryDocument>, 'insertOne'>) {}
    async insert(serialNumber: string): Promise<void> {
        try {
            // MongoDB compara e indexa strings de forma binária/case-sensitive por padrão (sem collation).
            // Índice único em serialNumber protege também requisições concorrentes.
            await this.collection.insertOne({ serialNumber, enteredAt: new Date() });
        } catch (error) {
            if ((error as { code?: number }).code === 11000) throw new DuplicateSerialError('Serial já registrado no início da linha.');
            throw error;
        }
    }
}
