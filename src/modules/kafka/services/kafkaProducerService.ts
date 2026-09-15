import type { Producer } from 'kafkajs';

/** Produtor genérico, independente do fluxo de entrada PCM. Conecta na primeira publicação. */
export class KafkaProducerService {
    private connected = false;

    constructor(private readonly producer: Pick<Producer, 'connect' | 'send' | 'disconnect'>, private readonly topic: string) {}

    async publish(value: string, key?: string): Promise<void> {
        if (!this.connected) { await this.producer.connect(); this.connected = true; }
        await this.producer.send({
            topic: this.topic, acks: -1, timeout: 10000,
            messages: [{ key, value }]
        });
    }

    async disconnect(): Promise<void> {
        if (this.connected) { await this.producer.disconnect(); this.connected = false; }
    }
}
