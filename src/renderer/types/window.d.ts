import type { TcpApiContract } from '../../modules/tcp/contracts/tcpApiContract';
import type { ModbusApiContract } from '../../modules/modbus/contracts/modbusApiContract';

declare global {
    interface Window {
        tcp: TcpApiContract;
        modbus: ModbusApiContract;
    }
}
