export class DuplicateSerialError extends Error {}
export interface PcmEntryRepository { insert(serialNumber: string): Promise<void>; }
