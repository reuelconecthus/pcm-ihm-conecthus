import type { Consumer, EachMessagePayload } from 'kafkajs';

export type KafkaMessageHandler = (payload: EachMessagePayload) => Promise<void> | void;

/** Consumidor genérico, independente do fluxo de entrada PCM. */
export class KafkaConsumerService {
    constructor(
        private readonly consumer: Pick<Consumer, 'connect' | 'subscribe' | 'run' | 'disconnect'>,
        private readonly topic: string
    ) {}

    async start(onMessage: KafkaMessageHandler, fromBeginning = false): Promise<void> {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: this.topic, fromBeginning });
        await this.consumer.run({ eachMessage: async payload => { await onMessage(payload); } });
    }

    async stop(): Promise<void> {
        await this.consumer.disconnect();
    }
}
