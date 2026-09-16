import type { IndexDescription } from 'mongodb';

export const pcmLineEntriesCollection = 'pcm_line_entries';

// Fonte única do schema: a migration lê daqui para criar os índices.
export const pcmLineEntriesIndexes: IndexDescription[] = [
    { key: { serialNumber: 1 }, name: 'uq_pcm_line_entries_serial', unique: true }
];
