# GTECH Desk Agent

Agente local do dashboard GTECH Desk. Ele roda no Windows e fornece para a Echo Show, pela rede local:

- CPU e RAM em tempo real
- temperatura disponível do PC (CPU/ACPI ou GPU como fallback)
- tarefas de hoje e atrasadas do Todoist
- status HTTP de serviços Railway/Vercel
- temperatura/clima usando a localização fornecida pelo navegador
- dashboard de foco e Pomodoro

## Iniciar no Windows

1. Tenha Python 3.11+ instalado.
2. Dê dois cliques em `start.bat`.
3. Se o Windows Firewall perguntar, permita em **redes privadas**.
4. A janela mostrará dois endereços, por exemplo:
   - PC: `http://127.0.0.1:8765`
   - Echo: `http://192.168.0.10:8765`
5. No PC, abra `http://127.0.0.1:8765/setup` e configure as integrações.
6. Na Echo Show, abra o endereço `Echo` exibido pelo agente.

## Todoist

Cole o token pessoal do Todoist na página `/setup`. O token é salvo somente no arquivo local `config.local.json`, que está ignorado pelo Git.

O agente usa a API v1 do Todoist e carrega tarefas com o filtro `today | overdue`.

## Railway e Vercel

Na página `/setup`, informe as URLs públicas dos serviços que deseja monitorar. O agente testa essas URLs em paralelo e exibe `ONLINE`, `OFFLINE`, `ERRO` ou `CONFIGURAR`.

Isso evita guardar credenciais de Railway/Vercel no navegador da Echo.

## Temperatura do PC

O agente tenta, nesta ordem:

1. sensores expostos pelo sistema/psutil;
2. sensor ACPI do Windows;
3. temperatura da GPU via `nvidia-smi`, quando disponível.

Algumas placas-mãe não expõem temperatura de CPU para o Windows sem software do fabricante. Nesses casos o painel continuará funcionando e mostrará `--°`.

## Segurança

O endpoint do dashboard pode ser aberto por dispositivos da sua rede local. A página de configuração e o endpoint que altera credenciais só aceitam acesso a partir do próprio PC (`127.0.0.1`).
