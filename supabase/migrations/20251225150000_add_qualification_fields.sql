-- Add expert-level qualification fields to leads table
-- Migration: 20251225150000_add_qualification_fields.sql

-- Add qualification scoring fields to leads
alter table public.leads add column if not exists qualification_score int default 0;
alter table public.leads add column if not exists qualification_status text default 'unqualified'
  check (qualification_status in ('unqualified','qualifying','hot','warm','cold','disqualified'));

-- Financial qualification
alter table public.leads add column if not exists preapproval_status text
  check (preapproval_status is null or preapproval_status in ('none','verbal','letter','cash'));
alter table public.leads add column if not exists budget_min numeric;
alter table public.leads add column if not exists budget_max numeric;
alter table public.leads add column if not exists down_payment_pct numeric;
alter table public.leads add column if not exists credit_score_range text
  check (credit_score_range is null or credit_score_range in ('poor','fair','good','excellent','unknown'));

-- Timeline & motivation
alter table public.leads add column if not exists timeline text
  check (timeline is null or timeline in ('immediate','30days','90days','6months','exploring'));
alter table public.leads add column if not exists motivation text
  check (motivation is null or motivation in ('relocating','growing_family','downsizing','investment','first_home','upgrading','unknown'));
alter table public.leads add column if not exists urgency_level text default 'medium'
  check (urgency_level in ('low','medium','high','critical'));

-- Property preferences
alter table public.leads add column if not exists preferred_cities text[];
alter table public.leads add column if not exists bedrooms_min int;
alter table public.leads add column if not exists bathrooms_min numeric;
alter table public.leads add column if not exists must_have_features text[];
alter table public.leads add column if not exists deal_breakers text[];

-- Risk flags
alter table public.leads add column if not exists has_solar_concern boolean default false;
alter table public.leads add column if not exists has_water_concern boolean default false;
alter table public.leads add column if not exists has_hoa_concern boolean default false;
alter table public.leads add column if not exists needs_multi_gen boolean default false;

-- Qualification metadata
alter table public.leads add column if not exists qualified_at timestamptz;
alter table public.leads add column if not exists disqualification_reason text;
alter table public.leads add column if not exists appointment_booked_at timestamptz;
alter table public.leads add column if not exists appointment_url text;

-- Add indexes for common queries
create index if not exists idx_leads_qualification_status on public.leads(agent_id, qualification_status);
create index if not exists idx_leads_urgency on public.leads(agent_id, urgency_level);
create index if not exists idx_leads_qualified_at on public.leads(agent_id, qualified_at) where qualified_at is not null;

-- Add function to calculate qualification score
create or replace function public.calculate_qualification_score(lead_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  score int := 0;
  lead_rec record;
begin
  select * into lead_rec from public.leads where id = lead_id;
  
  if not found then
    return 0;
  end if;
  
  -- Preapproval status (0-30 points)
  score := score + case lead_rec.preapproval_status
    when 'cash' then 30
    when 'letter' then 25
    when 'verbal' then 15
    when 'none' then 5
    else 0
  end;
  
  -- Timeline urgency (0-25 points)
  score := score + case lead_rec.timeline
    when 'immediate' then 25
    when '30days' then 20
    when '90days' then 15
    when '6months' then 8
    when 'exploring' then 3
    else 0
  end;
  
  -- Budget clarity (0-20 points)
  if lead_rec.budget_min is not null and lead_rec.budget_max is not null then
    score := score + 20;
  elsif lead_rec.budget_max is not null then
    score := score + 12;
  end if;
  
  -- Motivation clarity (0-15 points)
  if lead_rec.motivation is not null and lead_rec.motivation != 'unknown' then
    score := score + 15;
  end if;
  
  -- Location specificity (0-10 points)
  if lead_rec.preferred_cities is not null and array_length(lead_rec.preferred_cities, 1) > 0 then
    score := score + 10;
  end if;
  
  -- Penalty for risk flags (-5 to -15 points)
  if lead_rec.has_solar_concern then
    score := score - 5;
  end if;
  if lead_rec.has_water_concern then
    score := score - 5;
  end if;
  
  -- Auto-assign qualification status based on score
  update public.leads
  set 
    qualification_score = score,
    qualification_status = case
      when score >= 70 then 'hot'
      when score >= 50 then 'warm'
      when score >= 30 then 'qualifying'
      when score >= 15 then 'cold'
      else 'unqualified'
    end,
    qualified_at = case when score >= 50 and qualified_at is null then now() else qualified_at end
  where id = lead_id;
  
  return score;
end;
$$;

-- Trigger to auto-calculate score on lead updates
create or replace function public.trigger_calculate_qualification_score()
returns trigger
language plpgsql
as $$
begin
  perform public.calculate_qualification_score(new.id);
  return new;
end;
$$;

create trigger leads_qualification_score_trigger
  after insert or update of preapproval_status, budget_min, budget_max, timeline, motivation, 
    preferred_cities, has_solar_concern, has_water_concern
  on public.leads
  for each row
  execute function trigger_calculate_qualification_score();

comment on table public.leads is 'Lead records with expert-level qualification fields and auto-scoring';
comment on column public.leads.qualification_score is 'Auto-calculated score 0-100 based on preapproval, timeline, budget, motivation';
comment on function public.calculate_qualification_score is 'Calculates qualification score and updates lead status automatically';
