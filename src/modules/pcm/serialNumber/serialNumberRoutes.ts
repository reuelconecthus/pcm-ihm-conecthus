import { Router } from 'express';
import type { SerialNumberService } from './serialNumberService';
import { InvalidSerialNumberError } from './invalidSerialNumberError';
import { DuplicateSerialError } from '../duplicateSerialError';
import type { ApiResponseDto } from '../../../api/dtos/apiResponseDto';

export function createSerialNumberRoutes(service: SerialNumberService) {
    const router = Router();
    router.post<Record<string, never>, ApiResponseDto, unknown>('/', async (req, res) => {
        if (!req.is('application/json')) {
            res.status(415).json({ status: 'ERROR', msg: 'Use Content-Type: application/json.' });
            return;
        }
        try {
            await service.register(req.body);
            res.status(200).json({ status: 'OK' });
        } catch (error) {
            if (error instanceof InvalidSerialNumberError) {
                res.status(400).json({ status: 'ERROR', msg: error.message });
            } else if (error instanceof DuplicateSerialError) {
                res.status(409).json({ status: 'ERROR', msg: 'Serial já registrado no início da linha.' });
            } else {
                res.status(503).json({ status: 'ERROR', msg: 'Não foi possível confirmar o registro no MySQL.' });
            }
        }
    });
    return router;
}
