# API PCM

## Swagger

Inicie `npm run start:api` ou `npm run dev` e abra
[Swagger UI](http://127.0.0.1:3000/api-docs/).
O documento está disponível em [OpenAPI JSON](http://127.0.0.1:3000/api-docs/openapi.json).
Se alterar host ou porta, use o endereço configurado. Funciona também com a API
iniciada pelo Electron; os arquivos visuais são servidos localmente, sem CDN.

Use **Try it out**, escolha o exemplo de serial ou QR e clique em **Execute**.
A operação chama a API real e grava no banco quando configurado. A consulta à
documentação funciona sem MongoDB.

A especificação central fica em `src/api/docs/openApi.ts`, e a documentação do
fluxo em `src/modules/pcm/entry/docs/entryOpenApi.ts`. Atualize esses arquivos
quando mudar o contrato HTTP.

## Fluxo

O endpoint existente **POST /api/serial-numbers** registra a entrada do produto
na linha PCM e persiste no MongoDB. Nao existe uma segunda rota para entrada PCM.

## Entrada

```json
{ "serial-number": "AbC123" }
```

Ou o serial lido de um QR code:

```json
{ "qr-code": "AbC123" }
```

Envie exatamente um campo. O serial deve ter de 1 a 512 caracteres, sem espacos
ou controles. O texto e preservado, inclusive maiusculas e minusculas. Para este
fluxo, QR deve conter o proprio serial; nao ha extracao de serial de JSON ou URL.
Campos adicionais sao ignorados. Corpo limitado a 4 KB.

## Respostas

- HTTP 200: `{"status":"OK"}` depois da confirmacao da gravacao.
- HTTP 409: `{"status":"ERROR","msg":"Serial ja registrado..."}` para duplicidade.
- HTTP 400: entrada invalida.
- HTTP 503: banco indisponivel, nao configurado ou gravacao nao confirmada.
- HTTP 413/415: corpo excedido ou tipo de conteudo nao suportado.

Serial e QR com o mesmo valor representam o mesmo produto e a mesma restricao
UNIQUE. Nao ha publicacao Kafka, RabbitMQ, fila ou WebSocket nesse fluxo.

## Configuracao e indices

Veja [entrada PCM e MongoDB](pcmEntry.md) para configurar o banco e testar a API.
O indice unico e garantido automaticamente a cada conexao; `npm run db:migrate`
continua disponivel para prepara-lo sem subir a API/IHM inteira.

`npm run dev` inicia IHM e API; `npm run start:api` inicia somente a API.
No desenvolvimento, `.env` fica na raiz; no portatil, ao lado do `.exe`.
Nao execute ambos na mesma porta.

## Estrutura

O módulo `src/modules/pcm/entry` organiza cada responsabilidade em `routes`,
`services`, `repositories`, `validators`, `errors`, `dtos` e `integrations`.
A pasta `integrations` também contém `kafkaConfig.ts` e `serialPublisher.ts`,
preservados sem uso no fluxo atual. A configuração HTTP permanece em `src/api/config.ts`.
Os tratamentos HTTP compartilhados estão em `src/api/middlewares/httpErrors.ts`.

- `src/modules/pcm/entry/dtos/entryRequestDto.ts`: DTO da entrada existente.
- `src/api/dtos/apiResponseDto.ts`: DTO das respostas.
- `src/modules/pcm/entry/validators/entryValidation.ts`: validacao em tempo de execucao.
- `src/modules/pcm/entry/routes/entryRoutes.ts`: endpoint e respostas HTTP.
- `src/modules/pcm/entry/services/entryService.ts`: valida a bipagem e solicita a persistencia.
- `src/modules/pcm/entry/errors/invalidEntryError.ts`: erro de validacao da leitura.
- `src/modules/pcm/entry/repositories/entryContract.ts`: contrato do repositorio.
- `src/modules/pcm/entry/errors/duplicateSerialError.ts`: erro de duplicidade.
- `src/modules/pcm/entry/repositories/entryRepository.ts`: insertOne na collection.
- `src/modules/pcm/entry/repositories/entryModel.ts`: nome da collection e indices (fonte unica).
- `src/database/models.ts`: lista as models cujos indices sao garantidos na conexao.
- `src/database/mongo.ts`: configuracao, conexao MongoDB e criacao idempotente dos indices.
- `src/database/migrateMongo.cjs`: conecta e garante os indices sem subir a API/IHM.

O corpo HTTP permanece `unknown` ate passar pela validacao. DTOs nao substituem
essa validacao. O publicador Kafka antigo permanece fora do fluxo de execucao.

## Testes

- `npm run test:api`: ciclo de vida HTTP, QR e erros de protocolo.
- `npm run test:pcm`: persistencia, duplicidade, validacao e falhas do banco.

Os testes usam dependencias substituidas; nao validam um servidor MongoDB real.
