# Entrada da linha PCM

Fluxo: leitura pelo cliente → API HTTP → validação → INSERT MySQL → resposta.
Não há tela de scanner, RabbitMQ, Kafka, fila ou WebSocket neste fluxo.

## Preparar MySQL

Requer MySQL 8+ com InnoDB. Crie um banco vazio, por exemplo `pcm`, e um usuário
com acesso. A migration cria as tabelas dentro desse banco; não cria o servidor,
o banco ou usuários. Preencha `.env` na raiz:

```dotenv
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=pcm
MYSQL_USER=pcm_app
MYSQL_PASSWORD=sua_senha
```

Execute `npm run db:migrate`. A migration `src/database/migrations/001PcmLineEntries.sql`
cria `pcm_line_entries`; o executor registra a versão em `pcm_schema_migrations`.
Reexecuções não apagam registros. É necessário permissão de criação de tabelas
para migrar; a execução normal do endpoint precisa de INSERT na tabela de entradas.
A migration não é executada automaticamente ao abrir a IHM.

Inicie `npm run start:api` (somente API) ou `npm run dev` (IHM e API). No portátil,
o `.env` fica ao lado do `.exe`; prepare o banco com a migration antes de usá-lo.
Sem MySQL configurado, o novo endpoint retorna 503, mantendo a IHM disponível.

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
Uma restrição UNIQUE no banco rejeita também duplicidades concorrentes. Uma
instrução INSERT em autocommit grava ID e horário UTC junto ao serial.
Em caso de perda da resposta, a gravação pode ter ocorrido; uma repetição retorna
409 se o serial já existir. Esse endpoint não inicia as etapas seguintes da linha.

`serial_number` usa VARBINARY para comparação exata. Para consultar:

```sql
SELECT id, CONVERT(serial_number USING utf8mb4) AS serial_number, entered_at
FROM pcm_line_entries ORDER BY id DESC;
```

O endpoint de bipagem existente agora persiste no MySQL; nao retorna mais sucesso apenas pela validacao.

## Testes

`npm run test:pcm`: contrato HTTP, validação, gravação parametrizada, espera da
confirmação, duplicidade e banco indisponível com dependências substituídas.
Esses testes não equivalem a executar contra um servidor MySQL real.

Driver: [MySQL2 com pool e promises](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-pool).
