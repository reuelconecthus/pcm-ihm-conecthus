/** Entrada validada: exatamente um identificador, preservando o conteúdo original. */
export type SerialNumberRequestDto =
    | { 'serial-number': string; 'qr-code'?: never }
    | { 'qr-code': string; 'serial-number'?: never };
