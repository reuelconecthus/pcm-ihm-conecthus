# API de bipagem: serial ou QR code

O endpoint existente **POST /api/serial-numbers** registra a entrada do produto
na linha PCM e persiste no MySQL. Nao existe uma segunda rota para entrada PCM.

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

## Configuracao e migration

Veja [entrada PCM e MySQL](pcmEntry.md) para configurar o banco, executar
`npm run db:migrate` e testar a API.

`npm run dev` inicia IHM e API; `npm run start:api` inicia somente a API.
No desenvolvimento, `.env` fica na raiz; no portatil, ao lado do `.exe`.
Nao execute ambos na mesma porta.

## Estrutura

- `src/modules/pcm/serialNumber/dtos/serialNumberRequestDto.ts`: DTO da entrada existente.
- `src/api/dtos/apiResponseDto.ts`: DTO das respostas.
- `src/modules/pcm/serialNumber/serialNumber.ts`: validacao em tempo de execucao.
- `src/modules/pcm/serialNumber/serialNumberRoutes.ts`: endpoint e respostas HTTP.
- `src/modules/pcm/serialNumber/serialNumberService.ts`: valida a bipagem e solicita a persistencia.
- `src/modules/pcm/serialNumber/invalidSerialNumberError.ts`: erro de validacao da leitura.
- `src/modules/pcm/pcmEntryContract.ts`: contrato do repositorio.
- `src/modules/pcm/duplicateSerialError.ts`: erro de duplicidade.
- `src/modules/pcm/pcmEntryRepository.ts`: INSERT parametrizado.
- `src/database/mysql.ts`: configuracao e pool MySQL.
- `src/database/migrateMysql.cjs`: executor das migrations.
- `src/database/migrations/`: scripts SQL versionados.

O corpo HTTP permanece `unknown` ate passar pela validacao. DTOs nao substituem
essa validacao. O publicador Kafka antigo permanece fora do fluxo de execucao.

## Testes

- `npm run test:api`: ciclo de vida HTTP, QR e erros de protocolo.
- `npm run test:pcm`: persistencia, duplicidade, validacao e falhas do banco.

Os testes usam dependencias substituidas; nao validam um servidor MySQL real.
