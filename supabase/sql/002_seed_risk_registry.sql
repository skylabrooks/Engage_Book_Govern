-- Seed 5 initial client agents with Vapi phone numbers (928 area code)
-- Replace vapi_phone_number_id values with actual Vapi IDs after configuring phone numbers

INSERT INTO public.agents (
  name,
  email,
  agency_name,
  phone_number,
  vapi_phone_number_id,
  is_active
) VALUES
  ('Client 1 Agent', 'client1@yourdomain.com', 'Desert Realty Group', '+1 (928) 325-9142', '43fe1352-be91-455c-a06c-b18d4ea69d6a', true),
  ('Client 2 Agent', 'client2@yourdomain.com', 'Sonoran Properties', '+1 (928) 363-9346', '334ce28e-2926-4a31-a4c5-bd2877be9139', true),
  ('Client 3 Agent', 'client3@yourdomain.com', 'Cactus Real Estate', '+1 (928) 325-9149', '95b9c01c-c43a-44a4-b3af-1f18bafb9a7b', true),
  ('Client 4 Agent', 'client4@yourdomain.com', 'Grand Canyon Homes', '+1 (928) 323-9420', '7fa8eec5-9b56-436f-99e0-5770c5826f07', true),
  ('Client 5 Agent', 'client5@yourdomain.com', 'Arizona Dream Homes', '+1 (928) 298-9331', 'd2cdbe3a-446f-4481-a732-1d23984aacd1', true)
ON CONFLICT (email) DO NOTHING;

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
