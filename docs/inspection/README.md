# Módulo de inspeção

Abra **INSPEÇÃO 01** ou **INSPEÇÃO 02** na home (`npm run dev`).
As duas telas usam `src/renderer/modules/inspection/inspection.html`, com um
identificador de máquina na URL. Cada máquina possui sua própria sessão.

## Arquivos

- `inspectionModel.ts`: configuração das máquinas, contrato `Capture` e fila `Session`.
- `inspection.ts`: apresentação, controles de simulação e estado da janela.
- `inspection.html` e `inspection.css`: interface compartilhada.

O modelo não depende de Electron, câmera, TCP ou API. Para uma integração futura,
um adaptador poderá entregar capturas à sessão correspondente usando `enqueue`.
Capturas de outra máquina e IDs duplicados no histórico/fila são rejeitados.
As máquinas têm nomes provisórios configurados em `Inspection.machines`.

## Funcionamento inicial

A inspeção 01 apresenta dados de demonstração. A inspeção 02 inicia limpa,
sem capturas simuladas e sem restaurar o antigo histórico de demonstração.
Essa escolha é configurada pelo campo `demo` de cada máquina.

- Dados de demonstração, sem conexão com câmera, Kafka ou API.
- Prévia ilustrativa vazia; não são usadas fotografias reais de peças.
- A tela apresenta um histórico inicial de demonstração. O painel de fila e os
  controles de simulação foram removidos; o modelo de fila permanece disponível
  para a futura integração com a câmera.
- Ver seleciona uma captura do histórico para exibir código e resultado.
- Filtro por resultado e resumo da produção por hora.
- Fila limitada a 50 e histórico limitado às últimas 200 capturas por máquina.
- Indicadores da hora calculados com base no histórico disponível. Sem código
  conta separadamente das reprovações. Ciclo médio é o intervalo médio entre capturas.
- Estado salvo no `sessionStorage`, separado pelo ID da máquina. Ao trocar de
  tela, filas e históricos são restaurados ao voltar na mesma
  janela. Fechar a janela descarta os dados. Não há persistência de produção real.

## Verificação

`npm run test:inspection` compila e testa isolamento das máquinas, ordem da fila,
duplicatas e limites. Os testes de modelo não validam a integração com câmera.
