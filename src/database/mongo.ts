import { MongoClient, type Db } from 'mongodb';
import { mongoModels } from './models';

export function readMongoConfig(env: NodeJS.ProcessEnv = process.env) {
    if (!env.MONGO_HOST || !env.MONGO_DATABASE || !env.MONGO_USER || env.MONGO_PASSWORD === undefined) {
        throw new Error('Configure MONGO_HOST, MONGO_DATABASE, MONGO_USER e MONGO_PASSWORD.');
    }
    const port = Number(env.MONGO_PORT || '27017');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('MONGO_PORT inválida.');
    return { host: env.MONGO_HOST, port, database: env.MONGO_DATABASE, user: env.MONGO_USER, password: env.MONGO_PASSWORD };
}

export function buildMongoUri(config = readMongoConfig()) {
    const user = encodeURIComponent(config.user);
    const password = encodeURIComponent(config.password);
    // authSource = o próprio banco: o usuário da aplicação é criado com escopo restrito a ele (ver docker/mongo-init.js).
    return `mongodb://${user}:${password}@${config.host}:${config.port}/${config.database}?authSource=${config.database}`;
}

export async function ensureIndexes(db: Db) {
    for (const model of mongoModels) {
        if (model.indexes.length) await db.collection(model.collection).createIndexes(model.indexes);
    }
}

export async function connectMongo() {
    const config = readMongoConfig();
    const client = new MongoClient(buildMongoUri(config), {
        connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000, maxPoolSize: 5
    });
    await client.connect();
    const db = client.db(config.database);
    // Idempotente: garante os índices a cada conexão, inclusive se a collection tiver sido
    // dropada manualmente (ex.: limpeza de dados de teste via Compass) entre uma execução e outra.
    await ensureIndexes(db);
    return { client, db };
}
