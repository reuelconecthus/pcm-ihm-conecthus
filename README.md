# conecthus.PCM

## Executar em desenvolvimento

```powershell
npm.cmd install
npm.cmd start
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


# Estrutura default
pcm-ihm/
│
├── src/
│   ├── main/
│   │   └── main.js
│   │
│   ├── preload/
│   │   └── preload.js
│   │
│   ├── renderer/
│   │   ├── views/
│   │   │   ├── home.html
│   │   │   ├── manual.html
│   │   │   └── alarms.html
│   │   │
│   │   ├── controllers/
│   │   │   └── MachineController.js
│   │   │
│   │   ├── js/
│   │   │   └── app.js
│   │   │
│   │   └── css/
│   │       └── app.css
│   │
│   ├── services/
│   │   ├── TcpService.js
│   │   └── MachineService.js
│   │
│   ├── models/
│   │   └── Machine.js
│   │
│   └── config/
│       └── machines.js
│
├── assets/
│   ├── icons/
│   └── images/
│
├── package.json
└── README.md
