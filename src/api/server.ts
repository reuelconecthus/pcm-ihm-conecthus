// Kafka temporariamente desativado. Descomente a integração para reativar.
// import { Kafka, Partitioners } from 'kafkajs';
import { createApp } from './app';
import { readHttpConfig } from './config';
// import { readConfig } from './config';
// import { KafkaPublisher } from './serialNumber/kafkaPublisher';

async function main() {
    const config = readHttpConfig();
    // const config = readConfig(); // Substitui readHttpConfig ao reativar Kafka.
    // const producer = new Kafka(config.kafka).producer({
    //     allowAutoTopicCreation: false,
    //     createPartitioner: Partitioners.DefaultPartitioner
    // });
    try {
        // await producer.connect();
        // const publisher = new KafkaPublisher(producer, config.topic);
        // Substituir pelo publisher acima ao reativar. OK significa apenas entrada válida.
        const publisher = { publish: async () => {} };
        const server = createApp(publisher).listen(config.port, config.host);
        server.requestTimeout = 15000;
        server.headersTimeout = 10000;
        let stopping = false;
        const shutdown = () => {
            if (stopping) return;
            stopping = true;
            const deadline = setTimeout(() => process.exit(1), 30000);
            deadline.unref();
            server.close(() => {
                clearTimeout(deadline);
                // Ao reativar, substituir clearTimeout acima por:
                // void producer.disconnect().catch(() => { process.exitCode = 1; }).finally(() => clearTimeout(deadline));
            });
        };
        server.on('listening', () => console.log(`API disponível em http://${config.host}:${config.port} (Kafka desativado; dados não são publicados)`));
        server.on('error', () => {
            console.error('Não foi possível iniciar o servidor HTTP.');
            process.exitCode = 1;
            shutdown();
        });
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    } catch (error) {
        // await producer.disconnect().catch(() => {});
        throw error;
    }
}

void main().catch(() => {
    console.error('Falha ao iniciar a API. Verifique as configurações HTTP.');
    process.exitCode = 1;
});
