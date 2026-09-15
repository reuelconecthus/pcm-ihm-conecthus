import type { Producer } from 'kafkajs';
import type { CodeInput, SerialPublisher } from './serialNumber';

export class KafkaPublisher implements SerialPublisher {
    constructor(private readonly producer: Pick<Producer, 'send'>, private readonly topic: string) {}

    async publish(input: CodeInput): Promise<void> {
        await this.producer.send({
            topic: this.topic,
            acks: -1,
            timeout: 10000,
            messages: [{ key: input['serial-number'] ?? input['qr-code'], value: JSON.stringify(input) }]
        });
    }
}
