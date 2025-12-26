-- Add phone number tracking to agents table for multi-tenant Vapi integration
-- Each agent gets their own 928 area code phone number from Vapi

ALTER TABLE agents 
ADD COLUMN phone_number VARCHAR(20) UNIQUE,
ADD COLUMN vapi_phone_number_id VARCHAR(100) UNIQUE,
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for fast phoneNumberId lookup from Vapi webhooks
CREATE INDEX idx_agents_vapi_phone_number_id ON agents(vapi_phone_number_id);
CREATE INDEX idx_agents_user_id ON agents(user_id);

-- Add comments
COMMENT ON COLUMN agents.phone_number IS 'Display phone number (e.g., 928-555-0001)';
COMMENT ON COLUMN agents.vapi_phone_number_id IS 'Vapi internal phone number ID for webhook routing';
COMMENT ON COLUMN agents.user_id IS 'Supabase Auth user ID if using individual agent logins';
