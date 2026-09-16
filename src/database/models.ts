import type { IndexDescription } from 'mongodb';
import { pcmLineEntriesCollection, pcmLineEntriesIndexes } from '../modules/pcm/entry/repositories/entryModel';

export interface MongoModel {
    collection: string;
    indexes: IndexDescription[];
}

// Toda coleção com índice a garantir na conexão precisa estar listada aqui.
export const mongoModels: MongoModel[] = [
    { collection: pcmLineEntriesCollection, indexes: pcmLineEntriesIndexes }
];
