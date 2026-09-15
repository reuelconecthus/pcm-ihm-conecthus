import { createServer } from 'node:http';
import { createApp } from './app';
import { readHttpConfig } from './config';

// Kafka temporariamente desativado:
// import { Kafka, Partitioners } from 'kafkajs';
// import { readConfig } from './config';
// import { KafkaPublisher } from './serialNumber/kafkaPublisher';

export async function startApi(config = readHttpConfig()) {
    // Ao reativar, conectar o produtor e substituir o publisher temporário:
    // const producer = new Kafka(readConfig().kafka).producer({
    //     allowAutoTopicCreation: false, createPartitioner: Partitioners.DefaultPartitioner
    // });
    // await producer.connect();
    // const publisher = new KafkaPublisher(producer, readConfig().topic);
    const publisher = { publish: async () => {} };
    const server = createServer(createApp(publisher));
    server.requestTimeout = 15000;
    server.headersTimeout = 10000;
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(config.port, config.host, () => {
            server.removeListener('error', reject);
            resolve();
        });
    });
    let stopping: Promise<void> | undefined;
    return {
        address: server.address(),
        stop(): Promise<void> {
            return stopping ??= new Promise<void>((resolve, reject) => {
                const deadline = setTimeout(() => server.closeAllConnections(), 5000);
                deadline.unref();
                server.close(error => {
                    clearTimeout(deadline);
                    // Ao reativar Kafka, aguardar producer.disconnect() antes de resolver.
                    if (error) reject(error);
                    else resolve();
                });
            });
        }
    };
}

// Importar no Electron não inicia outro servidor nem registra sinais de processo.
if (require.main === module) {
    void startApi().then(api => {
        console.log('API iniciada (Kafka desativado; dados não são publicados).', api.address);
        const shutdown = () => { void api.stop().catch(() => { process.exitCode = 1; }); };
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    }).catch(error => {
        console.error('Falha ao iniciar a API:', error.message);
        process.exitCode = 1;
    });
}
