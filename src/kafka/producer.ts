import { Kafka } from 'kafkajs';
import { readKafkaConfig } from '../modules/kafka/config/kafkaConfig';
import { KafkaProducerService } from '../modules/kafka/services/kafkaProducerService';

/** Publica uma mensagem e encerra a conexão. Uso programático ou via CLI. */
export async function publishMessage(value: string, key?: string): Promise<void> {
    const { kafka, topic } = readKafkaConfig();
    const service = new KafkaProducerService(new Kafka(kafka).producer(), topic);
    try {
        await service.publish(value, key);
    } finally {
        await service.disconnect();
    }
}

// Importar não publica nada; só a execução direta (CLI) envia a mensagem.
if (require.main === module) {
    const value = process.argv[2];
    const key = process.argv[3];
    if (!value) {
        console.error('Uso: node dist/kafka/producer.js "<mensagem>" [chave]');
        process.exitCode = 1;
    } else {
        publishMessage(value, key)
            .then(() => console.log('Mensagem publicada no tópico Kafka.'))
            .catch(error => {
                console.error('Falha ao publicar no Kafka:', error.message);
                process.exitCode = 1;
            });
    }
}
