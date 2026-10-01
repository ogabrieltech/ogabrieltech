# Puxaí

MVP de uma plataforma de automação e direcionamento de atendimento no WhatsApp para pequenas e médias empresas.

> Seu WhatsApp recebe. O Puxaí direciona.

## Objetivo

Permitir que uma empresa configure fluxos simples sem IA: mensagem inicial, menus, coleta de dados, respostas automáticas, regras por horário e direcionamento para vendedores ou setores via WhatsApp.

## V1 incluída

- Landing page comercial
- Dashboard operacional
- Fluxos de atendimento
- Cadastro de equipe / destinos
- Leads e status de atendimento
- Tela de conexão do WhatsApp
- Webhook de verificação da WhatsApp Cloud API
- Estrutura de banco multiempresa para Supabase
- Persistência local no protótipo para testar a UX sem custo

## Rotas

- `/` — landing page do Puxaí
- `/app` — painel da plataforma
- `/api/whatsapp/webhook` — webhook preparado para WhatsApp Cloud API

## Stack

- Next.js 15 / App Router
- React 19
- TypeScript
- CSS próprio
- Lucide React
- Supabase preparado para a próxima etapa
- WhatsApp Business Platform / Cloud API preparada para integração

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## WhatsApp Cloud API

Copie `.env.example` para `.env.local` e informe os dados do aplicativo Meta quando for conectar um número real.

## Próximos passos

1. Auth + multiempresa real no Supabase.
2. Persistir fluxos, equipe e leads no banco.
3. Processar mensagens recebidas e avançar o fluxo automaticamente.
4. Enviar mensagens pela Cloud API.
5. Adicionar templates e regras de janela de atendimento.
6. Deploy e onboarding do primeiro cliente.

## Direitos autorais

© 2026 ogabrieltech. Todos os direitos reservados.
