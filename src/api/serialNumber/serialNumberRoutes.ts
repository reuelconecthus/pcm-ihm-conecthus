import { Router } from 'express';
import { parseCodeInput, type SerialPublisher } from './serialNumber';
import type { SerialNumberRequestDto } from './dtos/serialNumberRequestDto';
import type { ApiResponseDto } from '../dtos/apiResponseDto';

export function createSerialNumberRoutes(publisher: SerialPublisher) {
    const router = Router();
    router.post<Record<string, never>, ApiResponseDto, unknown>('/', async (req, res) => {
        if (!req.is('application/json')) {
            res.status(415).json({ status: 'ERROR', msg: 'Use Content-Type: application/json.' });
            return;
        }
        let input: SerialNumberRequestDto;
        try {
            input = parseCodeInput(req.body);
        } catch (error) {
            res.status(400).json({ status: 'ERROR', msg: (error as Error).message });
            return;
        }
        try {
            await publisher.publish(input);
            res.status(200).json({ status: 'OK' });
        } catch {
            res.status(503).json({ status: 'ERROR', msg: 'Não foi possível confirmar o envio ao Kafka.' });
        }
    });
    return router;
}
