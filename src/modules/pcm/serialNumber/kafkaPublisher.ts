import type { Producer } from 'kafkajs';
import type { SerialPublisher } from './serialNumber';
import type { SerialNumberRequestDto } from './dtos/serialNumberRequestDto';

export class KafkaPublisher implements SerialPublisher {
    constructor(private readonly producer: Pick<Producer, 'send'>, private readonly topic: string) {}

    async publish(input: SerialNumberRequestDto): Promise<void> {
        await this.producer.send({
            topic: this.topic,
            acks: -1,
            timeout: 10000,
            messages: [{ key: input['serial-number'] ?? input['qr-code'], value: JSON.stringify(input) }]
        });
    }
}
