const serialSchema = {
    type: 'string', minLength: 1, maxLength: 512,
    pattern: '^[^\\s\\x00-\\x1f\\x7f]+$',
    description: 'Serial exato, sem espaços ou controles. A aplicação mede o limite em unidades UTF-16.', example: 'AbC123'
};
export const entrySchemas = {
    EntryRequestDto: {
        description: 'Exatamente um campo. Campos extras são ignorados. QR deve conter o próprio serial.',
        oneOf: [
            { type: 'object', required: ['serial-number'], properties: { 'serial-number': serialSchema }, not: { required: ['qr-code'] } },
            { type: 'object', required: ['qr-code'], properties: { 'qr-code': serialSchema }, not: { required: ['serial-number'] } }
        ]
    }
};
const errorResponse = (description: string, msg: string) => ({
    description, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' }, example: { status: 'ERROR', msg } } }
});
export const entryPaths = {
    '/api/serial-numbers': { post: {
        tags: ['Entrada PCM'], operationId: 'registerPcmEntry', summary: 'Registrar bipagem no início da linha',
        description: 'Valida serial ou QR e grava no MySQL. Maiúsculas e minúsculas são distintas. Serial e QR com o mesmo valor são o mesmo produto. Não utiliza mensageria. Se a resposta se perder, a gravação pode ter ocorrido; repetir pode retornar 409. Try it out executa uma gravação real quando o MySQL está configurado.',
        requestBody: { required: true, description: 'JSON limitado a 4 KB.', content: { 'application/json': {
            schema: { $ref: '#/components/schemas/EntryRequestDto' }, examples: {
                serial: { summary: 'Serial do produto', value: { 'serial-number': 'AbC123' } },
                qrCode: { summary: 'Serial lido de QR code', value: { 'qr-code': 'AbC123' } }
            }
        } } },
        responses: {
            '200': { description: 'Gravação confirmada no MySQL.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' }, example: { status: 'OK' } } } },
            '400': errorResponse('JSON ou entrada inválida.', 'Informe apenas um campo: serial-number ou qr-code.'),
            '409': errorResponse('Serial duplicado; nenhuma nova entrada criada.', 'Serial já registrado no início da linha.'),
            '413': errorResponse('Corpo acima de 4 KB.', 'Corpo da requisição excede 4 KB.'),
            '415': errorResponse('Tipo de conteúdo ou codificação não suportados.', 'Use Content-Type: application/json.'),
            '500': errorResponse('Erro interno HTTP.', 'Erro interno.'),
            '503': errorResponse('Banco ausente, indisponível ou gravação não confirmada.', 'Não foi possível confirmar o registro no MySQL.')
        }
    } }
};
