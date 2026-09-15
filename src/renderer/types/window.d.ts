import type { TcpApiContract } from '../../modules/tcp/contracts/tcpApiContract';

declare global {
    interface Window {
        tcp: TcpApiContract;
    }
}
