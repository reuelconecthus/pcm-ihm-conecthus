# conecthus.PCM

## Entrada da linha PCM

A API `POST /api/serial-numbers` registra o serial no MySQL e rejeita duplicidades.
Configure o banco no `.env` e execute `npm run db:migrate`.
Veja o [fluxo de entrada PCM](docs/api/pcmEntry.md).

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

- `src/modules/pcm/`: bipagem, DTO de entrada, contrato e implementação do repositório PCM.
- `src/modules/tcp/`: serviço, sessão e tipos de comunicação TCP.
- `src/database/`: conexão MySQL, executor e arquivos de migrations.
- `src/api/`: servidor HTTP, registro das rotas e respostas compartilhadas.
- `src/renderer/modules/inspection/`: módulo visual de inspeção independente por máquina.

O adaptador Kafka existente pertence à bipagem e permanece sem uso no fluxo atual.

```text
src/
├── main/main.ts
├── preload/preload.ts
├── modules/tcp/tcpService.ts
├── modules/tcp/tcpSession.ts
├── modules/tcp/tcp.ts
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
│       ├── MySQL                                 │
│       ├── WebSocket                             │
│       └── RabbitMQ/Kafka                        │
│                                                 │
└─────────────────────────────────────────────────┘
