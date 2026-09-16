# Entrada da linha PCM

Fluxo: leitura pelo cliente → API HTTP → validação → insert MongoDB → resposta.
Não há tela de scanner, RabbitMQ, Kafka, fila ou WebSocket neste fluxo.

## Preparar MongoDB

Requer MongoDB 6+. Suba o container com `npm run infra:up` (ou `npm run db:up` para
só o Mongo); o script `docker/mongo-init.js` cria o banco e o usuário de aplicação
na primeira subida (volume novo). Preencha `.env` na raiz:

```dotenv
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
MONGO_DATABASE=pcm
MONGO_USER=pcm_app
MONGO_PASSWORD=sua_senha
```

O índice único de `serialNumber` na collection `pcm_line_entries` é criado
automaticamente a cada conexão (`connectMongo`, em `src/database/mongo.ts`), lendo
a definição de `src/modules/pcm/entry/repositories/entryModel.ts`. Isso é idempotente
e também recria o índice sozinho se a collection for apagada manualmente (ex.: "Drop
Collection" no Compass ao limpar dados de teste) — não é preciso lembrar de rodar
nada depois. `npm run db:migrate` continua disponível para garantir o índice sem
precisar subir a API/IHM inteira (útil antes do primeiro uso).

Inicie `npm run start:api` (somente API) ou `npm run dev` (IHM e API). No portátil,
o `.env` fica ao lado do `.exe`. Sem MongoDB configurado, o novo endpoint retorna
503, mantendo a IHM disponível. Para limpar dados de teste sem apagar o índice,
prefira `db.pcm_line_entries.deleteMany({})` a dropar a collection.

## Registrar leitura

`POST /api/serial-numbers`, `Content-Type: application/json`:

```json
{ "serial-number": "AbC123" }
```

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/serial-numbers -ContentType application/json -Body '{"serial-number":"AbC123"}'
```

- **200**: `{"status":"OK"}` somente após a confirmação da gravação.
- **400**: serial inválido (1–512 caracteres, sem espaços/controles) ou QR que nao contenha um serial valido.
- **409**: `{"status":"ERROR","msg":"Serial já registrado no início da linha."}`.
- **503**: gravação não confirmada; nenhuma resposta de sucesso simulada.
- JSON inválido, tipo de conteúdo e tamanho máximo de 4 KB seguem o contrato da API.

O serial não é convertido nem recalculado. Maiúsculas e minúsculas são distintas.
Um índice UNIQUE no banco rejeita também duplicidades concorrentes. Um único
`insertOne` grava `serialNumber` e `enteredAt` (UTC) em uma única operação atômica.
Em caso de perda da resposta, a gravação pode ter ocorrido; uma repetição retorna
409 se o serial já existir. Esse endpoint não inicia as etapas seguintes da linha.

`serialNumber` é gravado como string comum. O MongoDB compara e indexa strings de
forma binária/case-sensitive por padrão (sem `collation`), o que já garante a
comparação exata sem precisar de um tipo binário. Para consultar:

```javascript
db.pcm_line_entries.find().sort({ _id: -1 }).forEach(doc => print(doc.serialNumber, doc.enteredAt));
```

O endpoint de bipagem existente agora persiste no MongoDB; nao retorna mais sucesso apenas pela validacao.

## Testes

`npm run test:pcm`: contrato HTTP, validação, gravação parametrizada, espera da
confirmação, duplicidade e banco indisponível com dependências substituídas.
Esses testes não equivalem a executar contra um servidor MongoDB real.

Driver: [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/).
