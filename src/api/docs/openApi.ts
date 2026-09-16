import { entryPaths, entrySchemas } from '../../modules/pcm/entry/docs/entryOpenApi';

export const openApiDocument = {
    openapi: '3.0.3',
    info: { title: 'API PCM', version: '1.0.0',
        description: 'Documentação dos serviços do sistema PCM, organizada por módulo e funcionalidade. Sem autenticação implementada; acesso local por padrão. Rotas inexistentes retornam HTTP 404 com status ERROR e msg. A consulta à documentação não depende do MongoDB.' },
    servers: [{ url: '/', description: 'Servidor atual da API' }],
    tags: [{ name: 'Entrada PCM', description: 'Bipagem e persistência no MongoDB.' }],
    paths: entryPaths,
    components: { schemas: {
        ...entrySchemas,
        ApiResponseDto: {
            description: 'Contrato compartilhado de resposta da API: sucesso ou erro com mensagem obrigatória.',
            oneOf: [{ $ref: '#/components/schemas/ApiSuccess' }, { $ref: '#/components/schemas/ApiError' }]
        },
        ApiSuccess: { type: 'object', required: ['status'], additionalProperties: false, properties: { status: { type: 'string', enum: ['OK'] } } },
        ApiError: { type: 'object', required: ['status', 'msg'], additionalProperties: false, properties: { status: { type: 'string', enum: ['ERROR'] }, msg: { type: 'string' } } }
    } }
};
