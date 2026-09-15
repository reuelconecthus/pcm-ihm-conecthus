import type { Producer } from 'kafkajs';
import type { SerialPublisher } from './serialPublisher';
import type { EntryRequestDto } from '../dtos/entryRequestDto';

export class KafkaPublisher implements SerialPublisher {
    constructor(private readonly producer: Pick<Producer, 'send'>, private readonly topic: string) {}

    async publish(input: EntryRequestDto): Promise<void> {
        await this.producer.send({
            topic: this.topic,
            acks: -1,
            timeout: 10000,
            messages: [{ key: input['serial-number'] ?? input['qr-code'], value: JSON.stringify(input) }]
        });
    }
}
