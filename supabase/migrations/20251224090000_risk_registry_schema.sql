-- Risk Registry schema for internal storage (no external CRM)
-- Adds: enums, risk_assessments, tags, notes, associations

-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Enum for water source classification
do $$
begin
  if not exists (select 1 from pg_type where typname = 'water_source_type') then
    create type water_source_type as enum ('municipal','private_well','shared_well','hauled');
  end if;
end$$;

-- Cultural / feature tags (e.g., Multi-Generational Potential)
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz default now(),
  constraint tags_unique_per_agent unique (agent_id, name)
);
create index if not exists idx_tags_agent on public.tags(agent_id);

-- Lead ⇄ Tag association
create table if not exists public.lead_tags (
  lead_id uuid references public.leads(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (lead_id, tag_id)
);

-- Property ⇄ Tag association
create table if not exists public.property_tags (
  property_id uuid references public.properties(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (property_id, tag_id)
);

-- Risk assessments linked to leads/properties per agent
create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  -- Solar fields
  solar_status text check (solar_status in ('owned','leased','none')),
  solar_escalator boolean,
  solar_escalator_pct numeric,
  solar_monthly_payment numeric,
  solar_buyout_amount numeric,
  solar_transfer_fee numeric,
  -- Water
  water_source water_source_type,
  water_zone text,
  -- HOA / STR
  hoa_rental_cap boolean,
  -- Overall
  risk_level text check (risk_level in ('low','medium','high')),
  assessment_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_risk_assessments_agent on public.risk_assessments(agent_id);
create index if not exists idx_risk_assessments_lead on public.risk_assessments(lead_id);
create index if not exists idx_risk_assessments_property on public.risk_assessments(property_id);

-- Notes for agent handoff/risk summaries
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  title text,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists idx_notes_agent on public.notes(agent_id);

-- RLS enablement
alter table public.tags enable row level security;
alter table public.lead_tags enable row level security;
alter table public.property_tags enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.notes enable row level security;

-- RLS policies: scope all to owning agent
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'tags_select_owner') then
    create policy tags_select_owner on public.tags for select using (auth.uid() = agent_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'tags_ins_owner') then
    create policy tags_ins_owner on public.tags for insert with check (auth.uid() = agent_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'tags_update_owner') then
    create policy tags_update_owner on public.tags for update using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'lead_tags_select_owner') then
    create policy lead_tags_select_owner on public.lead_tags for select using (exists (select 1 from public.leads l join public.tags t on t.id = lead_tags.tag_id where l.id = lead_tags.lead_id and t.agent_id = auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'lead_tags_ins_owner') then
    create policy lead_tags_ins_owner on public.lead_tags for insert with check (exists (select 1 from public.leads l join public.tags t on t.id = lead_tags.tag_id where l.id = lead_tags.lead_id and t.agent_id = auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'property_tags_select_owner') then
    create policy property_tags_select_owner on public.property_tags for select using (exists (select 1 from public.properties p join public.tags t on t.id = property_tags.tag_id where p.id = property_tags.property_id and t.agent_id = auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'property_tags_ins_owner') then
    create policy property_tags_ins_owner on public.property_tags for insert with check (exists (select 1 from public.properties p join public.tags t on t.id = property_tags.tag_id where p.id = property_tags.property_id and t.agent_id = auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'risk_assessments_select_owner') then
    create policy risk_assessments_select_owner on public.risk_assessments for select using (auth.uid() = agent_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'risk_assessments_ins_owner') then
    create policy risk_assessments_ins_owner on public.risk_assessments for insert with check (auth.uid() = agent_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'risk_assessments_update_owner') then
    create policy risk_assessments_update_owner on public.risk_assessments for update using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'notes_select_owner') then
    create policy notes_select_owner on public.notes for select using (auth.uid() = agent_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'notes_ins_owner') then
    create policy notes_ins_owner on public.notes for insert with check (auth.uid() = agent_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'notes_update_owner') then
    create policy notes_update_owner on public.notes for update using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
  end if;
end $$;

-- Helper view: latest risk per lead/property
create or replace view public.latest_risk_assessments as
select distinct on (agent_id, coalesce(lead_id, property_id))
  id, agent_id, lead_id, property_id, risk_level, solar_status, water_source, hoa_rental_cap, created_at
from public.risk_assessments
order by agent_id, coalesce(lead_id, property_id), created_at desc;
