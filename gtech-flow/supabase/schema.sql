create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  department text not null,
  phone text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  trigger_type text not null default 'incoming_message',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists flow_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid references flows(id) on delete cascade,
  position integer not null,
  type text not null,
  title text not null,
  config jsonb not null default '{}'::jsonb
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text,
  phone text not null,
  interest text,
  destination text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  phone_number_id text,
  display_phone text,
  status text not null default 'disconnected',
  created_at timestamptz default now()
);
