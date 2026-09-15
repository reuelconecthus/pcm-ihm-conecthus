export interface TcpOptions {
    host: string;
    port: number;
}

export interface TcpEvent {
    kind: 'status' | 'data';
    message: string;
    time: string;
    connected: boolean;
    hex?: string;
    bytes?: number;
}

export interface TcpApi {
    connect(options: TcpOptions): Promise<void>;
    disconnect(): Promise<void>;
    saveLog(content: string): Promise<string | null>;
    onEvent(callback: (event: TcpEvent) => void): () => void;
}

declare global {
    interface Window {
        tcp: TcpApi;
    }
}
