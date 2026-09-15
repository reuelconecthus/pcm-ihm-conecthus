# Produtor e consumidor Kafka

Par de utilitários genéricos para publicar e consumir mensagens em um tópico Kafka.
Independente do fluxo de entrada da linha PCM: não altera `POST /api/serial-numbers`
nem o que é gravado no MySQL. Para o adaptador Kafka antigo, específico da bipagem e
fora de uso, veja `src/modules/pcm/entry/integrations/` e [docs/api](../api/README.md).

## Subir o Kafka

```powershell
copy .env.example .env
npm.cmd run kafka:up
```

Veja a [seção de Docker no README](../../README.md#produtor-e-consumidor-kafka) para
subir Kafka e MySQL juntos com `infra:up`.

## Configuração

Variáveis lidas de `.env` (veja `.env.example`):

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `KAFKA_BROKERS` | sim | Lista separada por vírgula, ex. `localhost:9092`. |
| `KAFKA_TOPIC` | sim | Nome do tópico usado pelo produtor e pelo consumidor. |
| `KAFKA_CLIENT_ID` | não | Identifica o cliente perante o broker. Padrão `pcm-kafka-client`. |
| `KAFKA_CONSUMER_GROUP_ID` | não | Grupo do consumidor. Padrão `pcm-kafka-consumer`. |
| `KAFKA_SSL` | não | `true` ou `false`. Padrão `false`. |
| `KAFKA_SASL_MECHANISM` | não | `plain`, `scram-sha-256` ou `scram-sha-512`. `plain` exige `KAFKA_SSL=true`. |
| `KAFKA_SASL_USERNAME` / `KAFKA_SASL_PASSWORD` | com SASL | Credenciais do mecanismo escolhido. |

`readKafkaConfig` (`src/modules/kafka/config/kafkaConfig.ts`) valida tudo isso e lança
erro descritivo em caso de configuração inválida ou incompleta.

## Publicar uma mensagem

```powershell
npm.cmd run kafka:produce -- "mensagem de teste" chave-opcional
```

`src/kafka/producer.ts` conecta, publica a mensagem (`value`, com `key` opcional) no
tópico configurado e desconecta. `publishMessage(value, key)` também pode ser importado
e chamado programaticamente por outro módulo.

## Consumir mensagens

```powershell
npm.cmd run kafka:consume
```

`src/kafka/consumer.ts` conecta, assina o tópico configurado (a partir das mensagens
novas; não relê o histórico) e loga cada mensagem recebida no console com tópico,
partição, offset, chave, valor e horário. Fica em execução até `Ctrl+C`/`SIGTERM`, que
encerram a conexão antes de finalizar o processo. `startConsumer()` também pode ser
importado por outro módulo que queira reagir às mensagens de outra forma; hoje ele só
loga, servindo de esqueleto para plugar lógica de negócio depois.

## Estrutura

- `src/modules/kafka/config/kafkaConfig.ts`: lê e valida `KAFKA_*` do ambiente.
- `src/modules/kafka/services/kafkaProducerService.ts`: conecta sob demanda e publica.
- `src/modules/kafka/services/kafkaConsumerService.ts`: assina o tópico e repassa cada
  mensagem a um handler.
- `src/kafka/producer.ts` e `src/kafka/consumer.ts`: entrypoints executáveis (CLI) que
  compõem a configuração com os services, no mesmo padrão de `src/api/server.ts`.

## Testes

`npm run test:kafka` cobre a validação de configuração e o comportamento dos services
com um cliente Kafka substituído (sem broker real). Para testar contra um Kafka de
verdade, use `kafka:produce`/`kafka:consume` com o container do `docker-compose.yml` no ar.
