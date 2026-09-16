import type { ModbusAction, ModbusOptions, ModbusResult } from '../types/modbusTypes';
export interface ModbusApiContract { execute(action: ModbusAction, options: ModbusOptions): Promise<ModbusResult>; }
