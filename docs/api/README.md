# API de serial-number ou QR code

**Kafka temporariamente desativado:** a integração está comentada em
`src/api/server.ts`. A API inicia sem broker e sem variáveis Kafka.
`OK` significa apenas entrada válida; os dados não são publicados nem armazenados.
O `KafkaPublisher` foi preservado para reativação. As informações de confirmação
e publicação abaixo descrevem o comportamento quando essa integração for reativada.

Serviço HTTP em TypeScript/Node.js integrado à estrutura do projeto. A IHM e a futura função
do scanner poderão usar o mesmo endpoint. O scanner ainda não está integrado.

## Estrutura

- `src/api/app.ts`: configuração HTTP, registro das rotas e erros gerais.
- `src/api/config.ts`: leitura e validação da configuração do ambiente.
- `src/api/server.ts`: inicialização e encerramento do servidor e produtor Kafka.
- `src/api/serialNumber/serialNumber.ts`: validação do hash e contrato de publicação.
- `src/api/serialNumber/serialNumberRoutes.ts`: endpoint e respostas da entidade.
- `src/api/serialNumber/kafkaPublisher.ts`: publicação da entidade no Kafka.
- `scripts/testApi.cjs`: testes automatizados da API.
- `.env.example`: exemplo de configuração na raiz.
- `package.json`, `package-lock.json`, `node_modules/` e `tsconfig.json`: únicos,
  compartilhados com a IHM na raiz do projeto.

`npm.cmd run build` compila também a API em `dist/api/`. O comando
`npm.cmd start` abre a IHM; `npm.cmd run start:api` inicia o serviço HTTP.
Os processos têm inicialização independente para que abrir a IHM não dependa
da disponibilidade do Kafka.

## Executar

Requer Node.js 22.9+. Enquanto Kafka estiver desativado, basta executar
`npm.cmd run start:api`; `.env` é opcional para configurar host e porta.
Ao reativar Kafka, será necessário acesso ao cluster com o tópico já criado.
Na raiz do repositório, em PowerShell:

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Edite .env com os brokers, tópico e autenticação do ambiente.
npm.cmd run start:api
```

O exemplo usa `localhost:9092` e `pcm.serial-numbers` como valores ilustrativos.
Não instala Kafka nem cria o tópico. O serviço só inicia o HTTP após conectar
ao Kafka; falhas de inicialização encerram o processo com código diferente de zero.

Por padrão escuta em `127.0.0.1:3000`. `API_HOST` e `API_PORT` são configuráveis.
Esta versão não implementa autenticação HTTP; o endereço padrão limita o acesso
ao computador local. Para disponibilizar em rede, definir o controle de acesso
da implantação. Credenciais Kafka ficam em `.env`, ignorado pelo Git.

## Contrato

`POST /api/serial-numbers` com `Content-Type: application/json`:

```json
{ "serial-number": "AbC123" }
```

Também aceita o conteúdo textual de um QR code lido pelo scanner:

```json
{ "qr-code": "https://exemplo.com/peca/AbC123" }
```

Envie exatamente um dos campos. Enviar ambos retorna HTTP 400. `qr-code` aceita
texto não vazio de até 2048 caracteres, preservando espaços e quebras de linha.
A API não decodifica imagens nem extrai um serial do conteúdo do QR code.
O consumidor Kafka recebe o campo correspondente à entrada.

O campo `serial-number` recebe o hash já calculado, sem transformá-lo. Como o algoritmo não foi
definido, a validação aceita texto de 1 a 512 caracteres sem espaços ou caracteres
de controle; não comprova que o valor é um hash válido de determinado algoritmo.
Corpo JSON limitado a 4 KB. Campos adicionais são ignorados e não são publicados.

HTTP 200, somente após confirmação do Kafka:

```json
{ "status": "OK" }
```

Erros têm sempre `status` e `msg`, por exemplo HTTP 503:

```json
{ "status": "ERROR", "msg": "Não foi possível confirmar o envio ao Kafka." }
```

| HTTP | Motivo |
| --- | --- |
| 400 | JSON inválido, serial/QR inválido ou ambos os campos enviados |
| 404 | Rota não encontrada |
| 413 | Corpo maior que 4 KB |
| 415 | Tipo de conteúdo ou codificação não suportado |
| 503 | Publicação não confirmada pelo Kafka |
| 500 | Erro interno |

Exemplo PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/serial-numbers -ContentType application/json -Body '{"serial-number":"AbC123"}'
```

## Publicação Kafka

- Destino: `KAFKA_TOPIC`; brokers separados por vírgula em `KAFKA_BROKERS`.
- Chave: valor exato de `serial-number` ou `qr-code`.
- Valor: JSON UTF-8 `{"serial-number":"AbC123"}` ou `{"qr-code":"conteúdo lido"}`.
- Confirmação com `acks: -1` (réplicas em sincronia), respeitando a configuração do broker.
- `OK` confirma publicação, não o processamento pelo consumidor.
- Não há armazenamento local nem deduplicação entre chamadas HTTP. Se a resposta
  se perder ou houver timeout, a mensagem pode ter sido publicada: uma nova
  tentativa pode duplicá-la. A chave Kafka não elimina duplicatas.
- Timeout Kafka de 10 segundos por requisição, com até duas tentativas adicionais;
  o tempo total de uma chamada HTTP pode ser maior. Configure o cliente de acordo.
- `KAFKA_SSL=true` habilita TLS. SASL opcional: `plain`, `scram-sha-256` ou
  `scram-sha-512`, com `KAFKA_SASL_USERNAME` e `KAFKA_SASL_PASSWORD`.
  `plain` exige TLS. Certificados adicionais podem usar `NODE_EXTRA_CA_CERTS`.

Referências: [produção KafkaJS](https://kafka.js.org/docs/producing) e
[configuração KafkaJS](https://kafka.js.org/docs/configuration).

## Testes

```powershell
npm.cmd run test:api
```

Os testes abrem um servidor HTTP local e substituem o produtor Kafka por um
objeto de teste. Verificam validação, contrato, payload, espera pela confirmação
e falhas de publicação. Não comprovam integração com um broker real.
