-- Run this SQL to update your database with real Vapi phone IDs
-- Execute in Supabase SQL Editor or via: npx supabase db reset

UPDATE agents SET 
  phone_number = '+1 (928) 325-9142',
  vapi_phone_number_id = '43fe1352-be91-455c-a06c-b18d4ea69d6a' 
WHERE email = 'govconhelp@gmail.com';

UPDATE agents SET 
  phone_number = '+1 (928) 363-9346',
  vapi_phone_number_id = '334ce28e-2926-4a31-a4c5-bd2877be9139' 
WHERE email = 'client2@yourdomain.com';

UPDATE agents SET 
  phone_number = '+1 (928) 325-9149',
  vapi_phone_number_id = '95b9c01c-c43a-44a4-b3af-1f18bafb9a7b' 
WHERE email = 'client3@yourdomain.com';

UPDATE agents SET 
  phone_number = '+1 (928) 323-9420',
  vapi_phone_number_id = '7fa8eec5-9b56-436f-99e0-5770c5826f07' 
WHERE email = 'client4@yourdomain.com';

UPDATE agents SET 
  phone_number = '+1 (928) 298-9331',
  vapi_phone_number_id = 'd2cdbe3a-446f-4481-a732-1d23984aacd1' 
WHERE email = 'client5@yourdomain.com';

-- Verify the updates
SELECT 
  agency_name,
  phone_number,
  vapi_phone_number_id,
  is_active
FROM agents
WHERE email LIKE '%@yourdomain.com'
ORDER BY agency_name;
