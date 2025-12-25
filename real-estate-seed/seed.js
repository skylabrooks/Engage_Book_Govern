// seed.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with the Service Role Key to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper: find an auth user by email so seeding can be rerun idempotently
async function findUserIdByEmail(email) {
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function seedDatabase() {
  console.log("🌱 Starting Seeding Sequence...");

  // --- 1. Create Auth Users (The Login Credentials) ---
  const agents = [
    { email: 'sarah@phoenix-premier.com', password: 'password123', name: 'Sarah Connor', agency: 'Phoenix Premier Realty' },
    { email: 'john@sedona-luxury.com', password: 'password123', name: 'John Rambo', agency: 'Sedona Luxury Estates' }
  ];

  for (const agent of agents) {
    // A. Create the Auth User
    let userId = await findUserIdByEmail(agent.email);
    if (!userId) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: agent.email,
        password: agent.password,
        email_confirm: true,
        user_metadata: { full_name: agent.name }
      });

      if (authError) {
        console.error(`⚠️ Error creating auth for ${agent.name}:`, authError.message);
      }

      userId = authData?.user?.id ?? null;
    }

    if (!userId) {
      console.error(`ℹ️ Could not obtain user id for ${agent.name}; skipping.`);
      continue;
    }

    console.log(`✅ Auth User Ready: ${agent.name}`);

    // --- 2. Create the Agent Profile ---
    // For testing Discord notifications, use webhook.site or a real Discord webhook
    // Discord webhook format: https://discord.com/api/webhooks/{webhook.id}/{webhook.token}
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1234567890/test-webhook-token-placeholder';
    const calBookingLink = agent.email.includes('sarah') 
      ? 'https://cal.com/sarah-realty/listing-consult' 
      : 'https://cal.com/john-luxury/private-viewing';
    
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .upsert({
        id: userId,
        user_id: userId,
        agency_name: agent.agency,
        market: 'AZ',
        phone_number: agent.email.includes('sarah') ? '+19283259142' : '+16025550199',
        booking_link: calBookingLink,
        rentcast_api_key: 'rc_test_key_123', 
        discord_webhook_url: discordWebhookUrl,
        is_active: true
      }, { onConflict: 'id' })
      .select()
      .single();

    if (agentError) {
        console.error(`⚠️ Agent creation error for ${agent.name}:`, agentError.message);
        continue;
    }

    const agentId = agentData.id;
    console.log(`   └─ 🏠 Agent Profile Created: ${agentId}`);

    // --- 3. Create Phone Mappings ---
    const isLiveTestAgent = agent.email.includes('sarah');
    
    // Use simple test IDs that match our test-payload.json
    const VAPI_PHONE_ID = isLiveTestAgent ? 'phoenix-test-agent' : 'sedona-test-agent';

    const mapping = {
      agent_id: agentId,
      phone_number_id: VAPI_PHONE_ID,
      label: isLiveTestAgent ? 'Main Phoenix Line' : 'Main Sedona Line',
      is_active: true
    };

    const { error: mapError } = await supabase
      .from('phone_mappings')
      .upsert(mapping, { onConflict: 'phone_number_id' });
    
    if (mapError) console.error(`   └─ ❌ Mapping Error:`, mapError.message);
    else console.log(`   └─ 📞 Phone Mapped: ${VAPI_PHONE_ID}`);

    // --- 4. Create Mock Leads (returning lead fixture) ---
    if (isLiveTestAgent) {
      const { error: leadError } = await supabase
        .from('leads')
        .upsert({
          agent_id: agentId,
          phone_number: '+16025559988', 
          name: 'Mike Investor',
          summary: 'Interested in multifamily units in Tempe. Looking at properties with solar panels.',
          interest_level: 'warm',
          last_called_at: new Date(Date.now() - 86400000).toISOString() // Called yesterday
        }, { onConflict: 'agent_id, phone_number' });
      
      if (leadError) console.error('   └─ ❌ Lead Error:', leadError.message);
      else console.log(`   └─ 👤 Mock Lead 'Mike Investor' created.`);
    }

    // --- 5. Create Mock RentCast Properties (active, pending, fresh, stale) ---
    const properties = [
      {
        agent_id: agentId,
        address_full: isLiveTestAgent ? '1234 Desert Bloom Ln, Phoenix, AZ 85001' : '555 Red Rock Vista Dr, Sedona, AZ 86336',
        city: isLiveTestAgent ? 'Phoenix' : 'Sedona',
        state: 'AZ',
        postal_code: isLiveTestAgent ? '85001' : '86336',
        status: 'active',
        details_json: {
          bedrooms: isLiveTestAgent ? 3 : 4,
          bathrooms: isLiveTestAgent ? 2 : 3.5,
          squareFootage: isLiveTestAgent ? 1800 : 3200,
          yearBuilt: isLiveTestAgent ? 2018 : 2021,
          features: isLiveTestAgent ? ['Pool', 'Solar Panels (Owned)', 'Mountain View'] : ['Gated', 'Golf Course View', 'Wine Cellar']
        },
        valuation_data: {
          price: isLiveTestAgent ? 450000 : 950000,
          rent_estimate: isLiveTestAgent ? 2200 : 4800,
          last_updated: new Date().toISOString()
        },
        last_fetched_at: new Date().toISOString(), // Fresh data
        listed_at: new Date(Date.now() - 7 * 86400000).toISOString() // Listed 7 days ago
      },
      {
        agent_id: agentId,
        address_full: isLiveTestAgent ? '789 Cactus Flower Rd, Scottsdale, AZ 85251' : '222 Oak Creek Canyon Rd, Sedona, AZ 86336',
        city: isLiveTestAgent ? 'Scottsdale' : 'Sedona',
        state: 'AZ',
        postal_code: isLiveTestAgent ? '85251' : '86336',
        status: 'pending',
        details_json: {
          bedrooms: 4,
          bathrooms: 3,
          squareFootage: 2400,
          yearBuilt: 2020,
          features: ['Solar Lease (Sunrun)', 'Smart Home', 'RV Parking']
        },
        valuation_data: {
          price: 575000,
          rent_estimate: 3000,
          last_updated: new Date().toISOString()
        },
        last_fetched_at: new Date(Date.now() - 35 * 86400000).toISOString(), // Stale data (35 days old)
        listed_at: new Date(Date.now() - 45 * 86400000).toISOString()
      }
    ];

    for (const property of properties) {
      const { error: propError } = await supabase
        .from('properties')
        .upsert(property, { onConflict: 'agent_id, address_full' });
      
      if (propError) console.error(`   └─ ❌ Property Error:`, propError.message);
      else console.log(`   └─ 🏡 Property: ${property.address_full} (${property.status})`);
    }
  }
}

// Cleanup function to remove test data
async function cleanupDatabase() {
  console.log("🧹 Starting Cleanup Sequence...");

  const { error: phoneMappingError } = await supabase
    .from('phone_mappings')
    .delete()
    .in('phone_number_id', ['phoenix-test-agent', 'sedona-test-agent']);

  if (phoneMappingError) {
    console.error('   └─ ❌ Phone Mapping Cleanup Error:', phoneMappingError.message);
  } else {
    console.log('   └─ ✔️ Phone Mappings Cleared.');
  }

  const { error: leadError } = await supabase
    .from('leads')
    .delete()
    .eq('phone_number', '+16025559988');

  if (leadError) {
    console.error('   └─ ❌ Lead Cleanup Error:', leadError.message);
  } else {
    console.log('   └─ ✔️ Leads Cleared.');
  }

  const { error: propertyError } = await supabase
    .from('properties')
    .delete()
    .in('address_full', [
      '1234 Desert Bloom Ln, Phoenix, AZ 85001',
      '789 Cactus Flower Rd, Scottsdale, AZ 85251',
      '555 Red Rock Vista Dr, Sedona, AZ 86336',
      '222 Oak Creek Canyon Rd, Sedona, AZ 86336'
    ]);

  if (propertyError) {
    console.error('   └─ ❌ Property Cleanup Error:', propertyError.message);
  } else {
    console.log('   └─ ✔️ Properties Cleared.');
  }

  const { error: agentError } = await supabase
    .from('agents')
    .delete()
    .in('agency_name', ['Phoenix Premier Realty', 'Sedona Luxury Estates']);

  if (agentError) {
    console.error('   └─ ❌ Agent Cleanup Error:', agentError.message);
  } else {
    console.log('   └─ ✔️ Agents Cleared.');
  }
}

// Uncomment to run cleanup before seeding
// cleanupDatabase()
seedDatabase();