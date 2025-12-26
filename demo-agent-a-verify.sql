-- Verify Agent A Demo Results
-- Run this in Supabase SQL Editor after running the demo

-- Check the latest leads (should show the test number)
SELECT id, agent_id, phone_number, name, created_at
FROM public.leads
ORDER BY created_at DESC
LIMIT 10;

-- Check if any risk assessments were created
SELECT id, lead_id, risk_level, assessment_json, created_at
FROM public.risk_assessments
ORDER BY created_at DESC
LIMIT 5;

-- Verify Agent A mapping
SELECT agency_name, vapi_phone_number_id, discord_webhook_url
FROM public.agents
WHERE agency_name = 'Phoenix Premier Realty';
