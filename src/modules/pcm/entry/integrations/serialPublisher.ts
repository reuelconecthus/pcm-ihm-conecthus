import type { EntryRequestDto } from '../dtos/entryRequestDto';

export interface SerialPublisher {
    publish(input: EntryRequestDto): Promise<void>;
}
