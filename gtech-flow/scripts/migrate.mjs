import postgres from "postgres";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1, prepare: false });
const hashToken = (value) => createHash("sha256").update(value).digest("hex");

try {
  await sql.unsafe(`
    create table if not exists workspaces (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      slug text not null unique,
      main_phone text,
      timezone text not null default 'America/Sao_Paulo',
      business_hours jsonb not null default '{"mon":{"enabled":true,"start":"08:00","end":"18:00"},"tue":{"enabled":true,"start":"08:00","end":"18:00"},"wed":{"enabled":true,"start":"08:00","end":"18:00"},"thu":{"enabled":true,"start":"08:00","end":"18:00"},"fri":{"enabled":true,"start":"08:00","end":"18:00"},"sat":{"enabled":false,"start":"08:00","end":"12:00"},"sun":{"enabled":false,"start":"08:00","end":"12:00"}}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      email text not null unique,
      name text not null,
      password_hash text not null,
      role text not null default 'admin' check (role in ('admin','agent')),
      must_change_password boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      token_hash text not null unique,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );

    create table if not exists setup_tokens (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null unique references workspaces(id) on delete cascade,
      token_hash text not null,
      used_at timestamptz,
      created_at timestamptz not null default now()
    );

    create table if not exists team_members (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      name text not null,
      department text not null default 'Comercial',
      role text not null default 'Vendedor',
      phone text,
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists flows (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      name text not null,
      description text,
      active boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists flow_steps (
      id uuid primary key default gen_random_uuid(),
      flow_id uuid not null references flows(id) on delete cascade,
      position integer not null,
      type text not null check (type in ('message','menu','question','redirect','business_hours','link','end')),
      title text,
      config jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(flow_id, position)
    );

    create table if not exists flow_runs (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      flow_id uuid not null references flows(id) on delete cascade,
      contact_name text,
      contact_phone text,
      current_position integer not null default 1,
      context jsonb not null default '{}'::jsonb,
      status text not null default 'running' check (status in ('running','redirected','completed','abandoned','error')),
      channel text not null default 'simulator' check (channel in ('simulator','whatsapp')),
      created_at timestamptz not null default now(),
      completed_at timestamptz
    );

    create table if not exists messages (
      id uuid primary key default gen_random_uuid(),
      run_id uuid not null references flow_runs(id) on delete cascade,
      direction text not null check (direction in ('in','out')),
      body text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists leads (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      flow_id uuid references flows(id) on delete set null,
      run_id uuid references flow_runs(id) on delete set null,
      name text not null default 'Contato',
      phone text,
      interest text,
      destination text,
      destination_phone text,
      status text not null default 'Novo' check (status in ('Novo','Direcionado','Em atendimento','Concluído','Perdido')),
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists whatsapp_channels (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      display_phone text,
      phone_number_id text,
      business_account_id text,
      status text not null default 'not_configured' check (status in ('not_configured','test','connected','error')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(workspace_id)
    );

    create index if not exists idx_team_workspace on team_members(workspace_id);
    create index if not exists idx_flows_workspace on flows(workspace_id);
    create index if not exists idx_steps_flow on flow_steps(flow_id, position);
    create index if not exists idx_leads_workspace_created on leads(workspace_id, created_at desc);
    create index if not exists idx_runs_workspace_created on flow_runs(workspace_id, created_at desc);
    create index if not exists idx_sessions_hash on sessions(token_hash);
  `);

  const workspaceName = process.env.PUXAI_WORKSPACE_NAME || "ogabrieltech";
  const workspaceSlug = (process.env.PUXAI_WORKSPACE_SLUG || "ogabrieltech")
    .toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

  const [workspace] = await sql`
    insert into workspaces (name, slug)
    values (${workspaceName}, ${workspaceSlug})
    on conflict (slug) do update set name = excluded.name, updated_at = now()
    returning id, name, slug
  `;

  // Optional fully automated bootstrap for private deployments. In the hosted Puxaí
  // environment no password is stored in source or Railway variables; a one-time
  // setup token is generated instead.
  if (process.env.PUXAI_ADMIN_PASSWORD && process.env.PUXAI_ADMIN_EMAIL) {
    const adminEmail = process.env.PUXAI_ADMIN_EMAIL.toLowerCase().trim();
    const adminName = process.env.PUXAI_ADMIN_NAME || "Administrador";
    const passwordHash = await bcrypt.hash(process.env.PUXAI_ADMIN_PASSWORD, 12);
    await sql`
      insert into users (workspace_id, email, name, password_hash, role, must_change_password)
      values (${workspace.id}, ${adminEmail}, ${adminName}, ${passwordHash}, 'admin', false)
      on conflict (email) do nothing
    `;
    await sql`delete from setup_tokens where workspace_id = ${workspace.id}`;
  } else {
    // Remove only the known temporary account from early MVP deploys, and only if
    // the password had never been changed (must_change_password=true).
    await sql`
      delete from sessions
      where user_id in (
        select id from users where workspace_id=${workspace.id}
          and email='admin@puxai.local' and must_change_password=true
      )
    `;
    await sql`
      delete from users
      where workspace_id=${workspace.id}
        and email='admin@puxai.local' and must_change_password=true
    `;

    const [{ count: userCount }] = await sql`
      select count(*)::int as count from users where workspace_id = ${workspace.id}
    `;
    if (userCount === 0) {
      const setupToken = randomBytes(24).toString("base64url");
      await sql`
        insert into setup_tokens (workspace_id, token_hash, used_at, created_at)
        values (${workspace.id}, ${hashToken(setupToken)}, null, now())
        on conflict (workspace_id) do update
          set token_hash=excluded.token_hash, used_at=null, created_at=now()
      `;
      console.log(`PUXAI_SETUP_TOKEN=${setupToken}`);
    } else {
      await sql`delete from setup_tokens where workspace_id=${workspace.id} and used_at is null`;
    }
  }

  const channelStatus = process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID ? "connected" : "not_configured";
  await sql`
    insert into whatsapp_channels (workspace_id, phone_number_id, business_account_id, status)
    values (
      ${workspace.id}, ${process.env.WHATSAPP_PHONE_NUMBER_ID || null},
      ${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null}, ${channelStatus}
    )
    on conflict (workspace_id) do update set
      phone_number_id = coalesce(excluded.phone_number_id, whatsapp_channels.phone_number_id),
      business_account_id = coalesce(excluded.business_account_id, whatsapp_channels.business_account_id),
      status = excluded.status,
      updated_at = now()
  `;

  const [{ count: teamCount }] = await sql`
    select count(*)::int as count from team_members where workspace_id = ${workspace.id}
  `;
  if (teamCount === 0) {
    await sql`
      insert into team_members (workspace_id, name, department, role, phone)
      values (${workspace.id}, 'Gabriel', 'Comercial', 'Vendedor', null),
             (${workspace.id}, 'Financeiro', 'Financeiro', 'Setor', null)
    `;
  }

  const [{ count: flowCount }] = await sql`
    select count(*)::int as count from flows where workspace_id = ${workspace.id}
  `;
  if (flowCount === 0) {
    const [flow] = await sql`
      insert into flows (workspace_id, name, description, active)
      values (${workspace.id}, 'Atendimento principal', 'Recebe o contato, apresenta opções e direciona para a equipe.', true)
      returning id
    `;

    await sql`
      insert into flow_steps (flow_id, position, type, title, config) values
      (${flow.id}, 1, 'message', 'Boas-vindas', ${sql.json({ text: 'Olá! 👋 Bem-vindo. Como podemos ajudar você hoje?' })}),
      (${flow.id}, 2, 'menu', 'Menu principal', ${sql.json({ prompt: 'Escolha uma opção:', options: [
        { label: 'Solicitar orçamento', value: 'orcamento', next_position: 3 },
        { label: 'Financeiro', value: 'financeiro', next_position: 7 },
        { label: 'Horário de atendimento', value: 'horario', next_position: 8 },
        { label: 'Falar com atendente', value: 'atendente', next_position: 9 }
      ] })}),
      (${flow.id}, 3, 'question', 'Nome', ${sql.json({ prompt: 'Perfeito. Qual é o seu nome?', field: 'name', next_position: 4 })}),
      (${flow.id}, 4, 'question', 'Produto ou serviço', ${sql.json({ prompt: 'O que você gostaria de orçar?', field: 'interest', next_position: 5 })}),
      (${flow.id}, 5, 'question', 'Telefone', ${sql.json({ prompt: 'Qual telefone devemos usar para o contato?', field: 'phone', next_position: 6 })}),
      (${flow.id}, 6, 'redirect', 'Comercial', ${sql.json({ department: 'Comercial', text: 'Tudo certo. Vou direcionar seu atendimento para o comercial.' })}),
      (${flow.id}, 7, 'redirect', 'Financeiro', ${sql.json({ department: 'Financeiro', text: 'Vou direcionar você para o financeiro.' })}),
      (${flow.id}, 8, 'business_hours', 'Horário', ${sql.json({ open_text: 'Estamos em horário de atendimento agora.', closed_text: 'No momento estamos fora do horário de atendimento.' })}),
      (${flow.id}, 9, 'redirect', 'Atendente', ${sql.json({ department: 'Comercial', text: 'Certo. Vou colocar você em contato com um atendente.' })})
    `;
  }

  console.log(`Puxaí DB pronta. Workspace: ${workspace.name} (${workspace.slug})`);
} finally {
  await sql.end({ timeout: 5 });
}
