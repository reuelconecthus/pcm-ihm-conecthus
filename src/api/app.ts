import express = require('express');
import { notFound, handleError } from './middlewares/httpErrors';

import { createEntryRoutes } from '../modules/pcm/entry/routes/entryRoutes';
import type { EntryContract } from '../modules/pcm/entry/repositories/entryContract';
import { EntryService } from '../modules/pcm/entry/services/entryService';

export function createApp(entries: EntryContract = {
    insert: async () => { throw new Error('MySQL não configurado.'); }
}) {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '4kb', strict: false }));

    app.use('/api/serial-numbers', createEntryRoutes(new EntryService(entries)));

    app.use(notFound);
    app.use(handleError);
    return app;
}
