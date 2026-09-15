import { Kafka } from 'kafkajs';
import { readKafkaConfig } from '../modules/kafka/config/kafkaConfig';
import { KafkaConsumerService } from '../modules/kafka/services/kafkaConsumerService';

/**
 * Inicia o consumidor e loga cada mensagem recebida no console. Esqueleto para
 * plugar a lógica de negócio depois; hoje não escreve em banco nem repassa a
 * outro módulo.
 */
export async function startConsumer(): Promise<KafkaConsumerService> {
    const { kafka, topic, groupId } = readKafkaConfig();
    const service = new KafkaConsumerService(new Kafka(kafka).consumer({ groupId }), topic);
    await service.start(({ topic, partition, message }) => {
        console.log('Mensagem recebida:', {
            topic, partition,
            offset: message.offset,
            key: message.key?.toString('utf8') ?? null,
            value: message.value?.toString('utf8') ?? null,
            timestamp: new Date(Number(message.timestamp)).toISOString()
        });
    });
    return service;
}

// Importar não inicia o consumo; só a execução direta (CLI) assina o tópico.
if (require.main === module) {
    void startConsumer().then(service => {
        console.log('Consumidor Kafka iniciado. Aguardando mensagens...');
        const shutdown = () => { void service.stop().catch(() => { process.exitCode = 1; }); };
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    }).catch(error => {
        console.error('Falha ao iniciar o consumidor Kafka:', error.message);
        process.exitCode = 1;
    });
}
