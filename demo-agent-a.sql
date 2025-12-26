-- Agent A Demo Setup SQL
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/rxutdpcbzwmpombmbkkq/sql

-- Update Agent A with Discord webhook and Vapi phone ID
UPDATE public.agents
SET vapi_phone_number_id = 'phoenix-test-agent',
    discord_webhook_url = 'https://discord.com/api/webhooks/1453895850987356201/q1AUM9tDbqMFHtvJrFDfzTIFsYqRIuOnMPu4X81vefoZh6n8p9SqB98SK9TrfewMay2N'
WHERE agency_name = 'Phoenix Premier Realty';

-- Verify the update
SELECT agency_name, vapi_phone_number_id, discord_webhook_url
FROM public.agents
WHERE agency_name = 'Phoenix Premier Realty';
