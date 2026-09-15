# conecthus.PCM

## Executar em desenvolvimento

```powershell
npm.cmd install
npm.cmd start
```

## Testar os dados da máquina via TCP

Na home, abra **Teste TCP**, informe o IP e a porta da máquina e clique em
**Conectar**. Nesta primeira versão, o aplicativo funciona como cliente TCP:
a máquina precisa aceitar a conexão e enviar os dados. Nenhum comando é enviado.

A tela mostra horário, quantidade de bytes, texto UTF-8 e hexadecimal.
TCP entrega um fluxo de bytes: cada registro é um bloco recebido, não necessariamente
uma mensagem completa. O protocolo da máquina ainda precisa ser definido para
interpretar esses dados. O painel da home continua usando valores simulados.

Use **Desconectar** para encerrar a sessão. Sair da tela também encerra a conexão.
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

```text
src/
├── main/main.ts
├── preload/preload.ts
├── services/tcpService.ts
├── shared/tcp.ts
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