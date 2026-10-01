# Puxaí

Plataforma de automação e direcionamento de atendimento no WhatsApp para pequenas e médias empresas.

> Seu WhatsApp recebe. O Puxaí direciona.

## O que já funciona

- Landing page comercial
- Login com sessão segura por cookie HTTP-only
- Workspace persistente
- Dashboard com métricas reais
- CRUD de fluxos de atendimento
- Editor de blocos sem código
- Blocos de mensagem, menu, pergunta, horário, link, redirecionamento e finalização
- Cadastro e edição de vendedores/setores
- Leads persistidos com mudança de status
- Simulador que utiliza o mesmo modelo de fluxo e grava execuções, mensagens e leads reais no banco
- Redirecionamento para `wa.me` do vendedor com mensagem contextualizada
- PostgreSQL persistente no Railway
- Migração e seed automáticos antes de cada deploy
- Healthcheck que valida aplicação + banco
- Webhook de verificação da Meta
- Processamento de mensagens recebidas pela WhatsApp Cloud API
- Envio de respostas pela Graph API
- Validação opcional de assinatura `X-Hub-Signature-256`

## Rotas

- `/` — landing page
- `/login` — acesso ao painel
- `/app` — painel autenticado
- `/api/health` — healthcheck da aplicação e banco
- `/api/puxai/*` — API interna autenticada
- `/api/whatsapp/webhook` — webhook da WhatsApp Cloud API

## Stack

- Next.js 15 / App Router
- React 19
- TypeScript
- PostgreSQL
- Railway
- CSS Modules
- Lucide React
- WhatsApp Business Platform / Cloud API
- Meta Graph API v26.0 por padrão, configurável por ambiente

## Banco de dados

O schema de produção é criado por `scripts/migrate.mjs`.

Principais entidades:

- `workspaces`
- `users`
- `sessions`
- `team_members`
- `flows`
- `flow_steps`
- `flow_runs`
- `messages`
- `leads`
- `whatsapp_channels`

O banco é isolado do Nort e do PCP360 e roda em um serviço PostgreSQL dedicado no projeto Railway do Puxaí.

## Rodando localmente

```bash
npm install
npm run db:migrate
npm run dev
```

É necessário definir `DATABASE_URL` antes da migração.

## Teste funcional

1. Acesse `/login`.
2. Entre com a conta inicial criada pela migração.
3. Vá em **Equipe** e configure o WhatsApp do destino Comercial.
4. Vá em **Testar**.
5. Execute o fluxo `Atendimento principal`.
6. Escolha **Solicitar orçamento**.
7. Preencha nome, interesse e telefone.
8. Confirme o lead na aba **Leads**.
9. Use o botão de redirecionamento para abrir o WhatsApp do vendedor.
10. Troque a senha inicial em **Configurações**.

## WhatsApp Cloud API

Para ativar um número real, configure no Railway:

```env
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_GRAPH_VERSION=v26.0
```

O callback da Meta deve apontar para:

```text
https://SEU_DOMINIO/api/whatsapp/webhook
```

Sem essas credenciais, o painel e o simulador continuam totalmente funcionais em modo de teste.

## Deploy

O serviço web executa `npm run db:migrate` como pre-deploy. O Railway só considera o deploy saudável quando `/api/health` consegue consultar o PostgreSQL.

## Direitos autorais

© 2026 ogabrieltech. Todos os direitos reservados.
