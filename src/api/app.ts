import express = require('express');
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiResponseDto } from './dtos/apiResponseDto';

import type { SerialPublisher } from './serialNumber/serialNumber';
import { createSerialNumberRoutes } from './serialNumber/serialNumberRoutes';

export function createApp(publisher: SerialPublisher) {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '4kb', strict: false }));

    app.use('/api/serial-numbers', createSerialNumberRoutes(publisher));

    const notFound: RequestHandler<Record<string, string>, ApiResponseDto, unknown> = (_req, res) => {
        res.status(404).json({ status: 'ERROR', msg: 'Rota não encontrada.' });
    };
    app.use(notFound);
    const handleError: ErrorRequestHandler<Record<string, string>, ApiResponseDto, unknown> = (error, _req, res, _next) => {
        const status = error.status === 413 ? 413 : error.status === 415 ? 415 : error.status === 400 ? 400 : 500;
        const messages = { 400: 'JSON inválido.', 413: 'Corpo da requisição excede 4 KB.', 415: 'Codificação não suportada.', 500: 'Erro interno.' };
        res.status(status).json({ status: 'ERROR', msg: messages[status] });
    };
    app.use(handleError);
    return app;
}
