-- Data layer schema for Arizona Transaction Assistant
-- Migrates existing tables to new schema structure

-- Extensions
create extension if not exists "pgcrypto";

-- Drop existing tables to rebuild with correct schema
drop table if exists public.phone_mappings cascade;
drop table if exists public.properties cascade;
drop table if exists public.leads cascade;
drop table if exists public.interactions cascade;
drop table if exists public.discord_logs cascade;
drop table if exists public.agents cascade;

-- Core agents/tenants table (replaces old tenants table)
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  agency_name text not null,
  market text default 'AZ',
  phone_number text,
  booking_link text,
  rentcast_api_key text,
  discord_webhook_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint agents_phone_format check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  constraint agents_webhook_format check (
    discord_webhook_url is null
    or discord_webhook_url ~ '^https://discord\.com/api/webhooks/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$'
  )
);

-- Backward-compatible view for existing code paths (drop table if exists first)
drop table if exists public.tenants cascade;
create or replace view public.tenants as
select id, agency_name, rentcast_api_key, discord_webhook_url
from public.agents
where is_active = true;

-- Phone number → agent mapping
create table public.phone_mappings (
  phone_number_id text primary key,
  agent_id uuid references public.agents(id) on delete cascade,
  label text,
  prompt_override text,
  is_active boolean default true,
  created_at timestamptz default now(),
  constraint phone_mappings_active_agent check (is_active = true or is_active = false)
);
create index idx_phone_mappings_agent on public.phone_mappings(agent_id);

-- Leads tracked per agent
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  phone_number text not null,
  name text,
  interest_level text default 'warm',
  summary text,
  last_called_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint leads_phone_format check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  constraint leads_unique_per_agent unique (agent_id, phone_number)
);
create index idx_leads_agent_phone on public.leads(agent_id, phone_number);

-- Cached property data (mock RentCast)
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  address_full text not null,
  city text,
  state text,
  postal_code text,
  status text not null default 'active',
  details_json jsonb default '{}'::jsonb,
  valuation_data jsonb default '{}'::jsonb,
  last_fetched_at timestamptz,
  listed_at timestamptz,
  created_at timestamptz default now(),
  constraint properties_status check (status in ('active','pending','off-market','sold')),
  constraint properties_unique_per_agent unique (agent_id, address_full)
);
create index idx_properties_agent on public.properties(agent_id);

-- Interaction/call history
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  phone_number text,
  call_id text unique,
  transcript_summary text,
  sentiment text check (sentiment in ('positive','neutral','negative')),
  solar_detected boolean default false,
  solar_keywords text[],
  water_flag boolean default false,
  discord_notification_sent boolean default false,
  created_at timestamptz default now()
);
create index idx_interactions_agent on public.interactions(agent_id);

-- Discord delivery logs
create table public.discord_logs (
  id bigserial primary key,
  agent_id uuid references public.agents(id) on delete cascade,
  interaction_id uuid references public.interactions(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  webhook_url text,
  status_code int,
  error text,
  sent_at timestamptz default now(),
  retry_count int default 0,
  constraint discord_logs_webhook_format check (
    webhook_url is null
    or webhook_url ~ '^https://discord\.com/api/webhooks/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$'
  )
);
create index idx_discord_logs_agent on public.discord_logs(agent_id);

-- Row Level Security (RLS) per tenant/agent
alter table public.agents enable row level security;
alter table public.phone_mappings enable row level security;
alter table public.leads enable row level security;
alter table public.properties enable row level security;
alter table public.interactions enable row level security;
alter table public.discord_logs enable row level security;

-- Agents: self-only access
create policy agents_select_self on public.agents
  for select using (auth.uid() = id or auth.uid() = user_id);
create policy agents_update_self on public.agents
  for update using (auth.uid() = id or auth.uid() = user_id)
  with check (auth.uid() = id or auth.uid() = user_id);

-- Phone mappings tied to owning agent
create policy phone_mappings_select_owner on public.phone_mappings
  for select using (auth.uid() = agent_id);
create policy phone_mappings_ins_upd_owner on public.phone_mappings
  for insert with check (auth.uid() = agent_id);
create policy phone_mappings_update_owner on public.phone_mappings
  for update using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

-- Leads scoped to agent
create policy leads_select_owner on public.leads
  for select using (auth.uid() = agent_id);
create policy leads_ins_owner on public.leads
  for insert with check (auth.uid() = agent_id);
create policy leads_update_owner on public.leads
  for update using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

-- Properties scoped to agent
create policy properties_select_owner on public.properties
  for select using (auth.uid() = agent_id);
create policy properties_ins_owner on public.properties
  for insert with check (auth.uid() = agent_id);
create policy properties_update_owner on public.properties
  for update using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

-- Interactions scoped to agent
create policy interactions_select_owner on public.interactions
  for select using (auth.uid() = agent_id);
create policy interactions_ins_owner on public.interactions
  for insert with check (auth.uid() = agent_id);
create policy interactions_update_owner on public.interactions
  for update using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

-- Discord logs scoped to agent
create policy discord_logs_select_owner on public.discord_logs
  for select using (auth.uid() = agent_id);
create policy discord_logs_ins_owner on public.discord_logs
  for insert with check (auth.uid() = agent_id);
create policy discord_logs_update_owner on public.discord_logs
  for update using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

-- Validation queries (run manually in SQL editor)
-- 1) PhoneNumberId → Agent resolution
-- select a.agency_name, pm.label from public.phone_mappings pm join public.agents a on a.id = pm.agent_id where pm.phone_number_id = '<phone-id>';

-- 2) Property lookup + staleness check
-- select address_full, status, last_fetched_at, (last_fetched_at < now() - interval '30 days') as is_stale from public.properties where agent_id = '<agent-uuid>';

-- 3) Webhook null/invalid audit
-- select id, agency_name from public.agents where discord_webhook_url is null or discord_webhook_url !~ '^https://discord\.com/api/webhooks/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$';
