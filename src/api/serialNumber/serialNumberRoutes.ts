import { Router } from 'express';
import { parseCodeInput, isSerialNumber } from './serialNumber';
import { DuplicateSerialError, type PcmEntryRepository } from '../pcmEntry/pcmEntry';
import type { SerialNumberRequestDto } from './dtos/serialNumberRequestDto';
import type { ApiResponseDto } from '../dtos/apiResponseDto';

export function createSerialNumberRoutes(repository: PcmEntryRepository) {
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
        const serial = input['serial-number'] ?? input['qr-code'];
        if (!isSerialNumber(serial)) {
            res.status(400).json({ status: 'ERROR', msg: 'Para registrar a entrada, o QR code deve conter apenas o serial, de 1 a 512 caracteres sem espaços ou controles.' });
            return;
        }
        try {
            await repository.insert(serial);
            res.status(200).json({ status: 'OK' });
        } catch (error) {
            if (error instanceof DuplicateSerialError) {
                res.status(409).json({ status: 'ERROR', msg: 'Serial já registrado no início da linha.' });
            } else {
                res.status(503).json({ status: 'ERROR', msg: 'Não foi possível confirmar o registro no MySQL.' });
            }
        }
    });
    return router;
}
