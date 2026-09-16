# conecthus.PCM

## Teste de CLP

Na home, **TESTE CLP** abre o teste independente Modbus TCP, com Ping ICMP/TCP,
envio de texto e consulta de OK. Configure o mapa conforme o
[guia de teste Modbus](docs/modbus/README.md).

## Executar todos os testes

Com a API iniciada, a documentação interativa está em
[Swagger UI](http://127.0.0.1:3000/api-docs/).

```powershell
npm.cmd test
```

Compila o projeto e executa as suítes de API, entrada PCM, Kafka, TCP e inspeção.
Os comandos `test:api`, `test:pcm`, `test:kafka`, `test:tcp` e `test:inspection`
continuam disponíveis para executar cada suíte separadamente.

## Entrada da linha PCM

A API `POST /api/serial-numbers` registra o serial no MongoDB e rejeita duplicidades.
Configure o banco no `.env` (veja `.env.example`). O índice único é criado
automaticamente a cada conexão; `npm run db:migrate` é opcional, só para preparar o
banco sem subir a API/IHM. Veja o [fluxo de entrada PCM](docs/api/pcmEntry.md).

### Subir MongoDB e Kafka com Docker

```powershell
copy .env.example .env
npm.cmd run infra:up
```

`infra:up` sobe todos os serviços de `docker-compose.yml`: `pcm-mongo` (imagem `mongo:7.0`,
dados no volume `pcm_mongo_data`) e `pcm-kafka` (imagem `apache/kafka:3.8.0`, modo KRaft
sem Zookeeper, dados no volume `pcm_kafka_data`), publicado em `KAFKA_BROKERS=localhost:9092`.
Use `npm.cmd run db:up` ou `npm.cmd run kafka:up` para subir só um dos dois.
As credenciais/portas vêm do `.env` na raiz (lido automaticamente pelo `docker compose`);
sem ele, valores padrão de desenvolvimento são usados. O script `docker/mongo-init.js`
cria o usuário de aplicação (`MONGO_USER`/`MONGO_PASSWORD`) com acesso restrito ao banco
`MONGO_DATABASE`, separado do usuário root (`MONGO_ROOT_USER`/`MONGO_ROOT_PASSWORD`).
`db:logs`/`kafka:logs` acompanham o log de cada container e `infra:down` encerra tudo.

O fluxo de entrada ativo (`POST /api/serial-numbers`) grava direto no MongoDB e mantém o
Kafka desativado (veja o log de inicialização da API); o container Kafka existe para o
produtor/consumidor independentes descritos a seguir.

## Produtor e consumidor Kafka

Veja a [documentação do módulo Kafka](docs/kafka/README.md) para os detalhes do produtor,
do consumidor e das mensagens trocadas.

Com a infraestrutura no ar (`npm.cmd run infra:up` ou `npm.cmd run kafka:up`), publique
uma mensagem:

```powershell
npm.cmd run kafka:produce -- "mensagem de teste" chave-opcional
```

E consuma em outro terminal (fica escutando até `Ctrl+C`):

```powershell
npm.cmd run kafka:consume
```

Cada mensagem recebida é logada no console com tópico, partição, offset, chave, valor
e horário. `KAFKA_BROKERS` e `KAFKA_TOPIC` no `.env` definem o broker e o tópico; ambos
os comandos usam o mesmo tópico, então uma mensagem publicada aparece no consumidor
que estiver rodando. Esse par é independente do fluxo de entrada da linha PCM — não
altera o endpoint HTTP nem o que é gravado no MongoDB.

## Inspeção visual

Na home, **INSPEÇÃO 01** e **INSPEÇÃO 02** abrem o [módulo de inspeção](docs/inspection/README.md),
com fila e histórico independentes por máquina. A primeira versão é apenas front-end,
com capturas simuladas, filtros e indicadores de produção.

## API de serial-number

A [API HTTP em TypeScript/Node.js](docs/api/README.md) recebe `serial-number` (hash) ou `qr-code` (texto lido),
publica no Kafka e retorna `OK` ou `ERROR` com mensagem. Seu código fica em
`src/api`, com dependências e compilação compartilhadas com a IHM.
`npm.cmd run dev` e o executável Windows iniciam a IHM e a API juntos.
Execute `npm.cmd run start:api` na raiz para iniciar somente o serviço HTTP.

## Executar em desenvolvimento

```powershell
npm.cmd install
npm.cmd start
```

## Testar os dados da máquina via TCP

Veja a [documentação da estrutura dos testes TCP/IP](docs/tcp/README.md)
para conhecer os arquivos, o fluxo de comunicação e os testes automatizados.

Na home, abra **Teste TCP**, informe o IP e a porta da máquina e clique em
**Conectar**. Nesta primeira versão, o aplicativo funciona como cliente TCP:
a máquina precisa aceitar a conexão e enviar os dados. Nenhum comando é enviado.

A tela mostra horário, quantidade de bytes, texto UTF-8 e hexadecimal.
TCP entrega um fluxo de bytes: cada registro é um bloco recebido, não necessariamente
uma mensagem completa. O protocolo da máquina ainda precisa ser definido para
interpretar esses dados. O painel da home continua usando valores simulados.

Use **Desconectar** para encerrar a conexão. A navegação entre home e teste TCP
preserva os campos, o histórico e a conexão, que continua recebendo dados.
Fechar a janela encerra a conexão e descarta o histórico da sessão.
O histórico fica apenas na memória, limitado a 200 registros, com prévia de até
4 KB por bloco. **Limpar registros** também zera o contador de bytes.

Para validar a recepção com um servidor local:

```powershell
npm.cmd run test:tcp
```

## Gerar o executável Windows

```powershell
npm.cmd run build:win
```

O build compila o TypeScript, copia os arquivos da interface e gera a versão
portátil para Windows x64 em `out/PCM-IHM-1.0.0-x64.exe`.
Abra esse arquivo para executar o sistema, sem instalar Node.js ou npm.
O executável não possui assinatura digital e usa o ícone padrão do Electron.
A primeira geração pode precisar de internet para baixar as ferramentas de empacotamento.


## Convenção de nomes

Arquivos de código, variáveis e funções usam camelCase, como `tcpService.ts`,
`copyAssets.cjs` e `createWindow`. Classes e interfaces usam PascalCase,
como `TcpService` e `TcpOptions`. Classes CSS, atributos HTML e nomes de eventos
mantêm as convenções das respectivas tecnologias.

## Estrutura do projeto

Os módulos são agrupados por responsabilidade:

- `src/modules/pcm/entry/`: fluxo de entrada do produto, com rotas, service, validação,
  DTO, contrato, repositório e erros específicos em subpastas por responsabilidade.
- `src/modules/tcp/`: serviço, sessão e tipos de comunicação TCP.
- `src/modules/kafka/`: configuração e services (produtor/consumidor) genéricos de Kafka,
  usados pelos entrypoints em `src/kafka/` (veja [docs/kafka](docs/kafka/README.md)).
- `src/database/`: conexão MongoDB e executor da migration.
- `src/api/`: servidor HTTP, registro das rotas e respostas compartilhadas.
  Os tratamentos HTTP comuns ficam em `middlewares/`.
- `src/renderer/modules/inspection/`: módulo visual de inspeção independente por máquina.

O adaptador Kafka em `src/modules/pcm/entry/integrations/` pertence à bipagem e permanece
sem uso no fluxo atual; é um código distinto do módulo `src/modules/kafka/`.

```text
src/
├── main/main.ts
├── preload/preload.ts
├── modules/tcp/services/tcpService.ts
├── modules/tcp/sessions/tcpSession.ts
├── modules/tcp/types/tcpTypes.ts
├── renderer/
│   ├── css/app.css
│   ├── js/
│   │   ├── home.ts
│   │   ├── loading.ts
│   │   └── tcp.ts
│   ├── views/
│   │   ├── home.html
│   │   └── tcp.html
│   └── vendor/bootstrap/bootstrap.min.css
└── index.html
scripts/
├── copyAssets.cjs
└── testTcp.cjs
```


┌──────────────── REDE INDUSTRIAL ────────────────┐
│                                                 │
│                  Switch                         │
│                    │                            │
│       ┌────────────┼─────────────┐              │
│       │            │             │              │
│       ▼            ▼             ▼              │
│      PCM       Inspeção 1    Inspeção 2         │
│                                                 │
│       │                                         │
│       ├── Node.js                               │
│       ├── MongoDB                               │
│       ├── WebSocket                             │
│       └── RabbitMQ/Kafka                        │
│                                                 │
└─────────────────────────────────────────────────┘
