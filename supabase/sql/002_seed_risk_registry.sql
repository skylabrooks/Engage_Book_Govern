-- Seed default cultural tags for all active agents
insert into public.tags (agent_id, name, category)
select a.id, 'Multi-Generational Potential', 'cultural'
from public.agents a
where a.is_active = true
on conflict (agent_id, name) do nothing;

insert into public.tags (agent_id, name, category)
select a.id, 'Main Floor Bedroom', 'cultural'
from public.agents a
where a.is_active = true
on conflict (agent_id, name) do nothing;

insert into public.tags (agent_id, name, category)
select a.id, 'Zoning/Land Use Check Required', 'zoning'
from public.agents a
where a.is_active = true
on conflict (agent_id, name) do nothing;

-- Optional: create a helper tag for Solar Liability
insert into public.tags (agent_id, name, category)
select a.id, 'Solar Liability', 'risk'
from public.agents a
where a.is_active = true
on conflict (agent_id, name) do nothing;
