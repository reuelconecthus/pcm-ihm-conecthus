import type { Pool } from 'mysql2/promise';
import type { EntryContract } from './entryContract';
import { DuplicateSerialError } from '../errors/duplicateSerialError';

export class EntryRepository implements EntryContract {
    constructor(private readonly pool: Pick<Pool, 'execute'>) {}
    async insert(serialNumber: string): Promise<void> {
        try {
            // Uma única instrução em autocommit. UNIQUE protege também requisições concorrentes.
            await this.pool.execute(
                'INSERT INTO pcm_line_entries (serial_number, entered_at) VALUES (?, UTC_TIMESTAMP(3))',
                [Buffer.from(serialNumber, 'utf8')]
            );
        } catch (error) {
            if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new DuplicateSerialError('Serial já registrado no início da linha.');
            throw error;
        }
    }
}
