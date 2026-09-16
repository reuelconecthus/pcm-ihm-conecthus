import { createServer } from 'node:http';
import { createApp } from './app';
import { readHttpConfig } from './config';
import { connectMongo } from '../database/mongo';
import { EntryRepository } from '../modules/pcm/entry/repositories/entryRepository';
import { pcmLineEntriesCollection } from '../modules/pcm/entry/repositories/entryModel';

export async function startApi(config = readHttpConfig()) {
    // Sem configuração, o endpoint retorna 503; nunca confirma uma gravação fictícia.
    const mongo = process.env.MONGO_HOST ? await connectMongo() : undefined;
    const entries = mongo ? new EntryRepository(mongo.db.collection(pcmLineEntriesCollection)) : undefined;
    const server = createServer(createApp(entries));
    server.requestTimeout = 15000;
    server.headersTimeout = 10000;
    try { await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(config.port, config.host, () => {
            server.removeListener('error', reject);
            resolve();
        });
    }); } catch (error) { await mongo?.client.close(); throw error; }
    let stopping: Promise<void> | undefined;
    return {
        address: server.address(),
        stop(): Promise<void> {
            return stopping ??= new Promise<void>((resolve, reject) => {
                const deadline = setTimeout(() => server.closeAllConnections(), 5000);
                deadline.unref();
                server.close(error => {
                    clearTimeout(deadline);
                    void (mongo?.client.close() ?? Promise.resolve()).then(() => {
                        if (error) reject(error); else resolve();
                    }, reject);
                });
            });
        }
    };
}

// Importar no Electron não inicia outro servidor nem registra sinais de processo.
if (require.main === module) {
    void startApi().then(api => {
        console.log('API iniciada. Entrada PCM persiste no MongoDB quando configurado; Kafka desativado.', api.address);
        const shutdown = () => { void api.stop().catch(() => { process.exitCode = 1; }); };
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    }).catch(error => {
        console.error('Falha ao iniciar a API:', error.message);
        process.exitCode = 1;
    });
}
