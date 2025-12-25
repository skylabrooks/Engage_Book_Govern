// verify-seed.js - Quick validation of seeded data
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verify() {
  console.log("🔍 Verifying Seeded Data...\n");

  // 1. Verify agents
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, agency_name, phone_number, booking_link, discord_webhook_url')
    .order('agency_name');

  if (agentError) {
    console.error('❌ Agent query failed:', agentError.message);
  } else {
    console.log(`✅ Agents (${agents.length}):`);
    agents.forEach(a => {
      console.log(`   📍 ${a.agency_name}`);
      console.log(`      Phone: ${a.phone_number}`);
      console.log(`      Booking: ${a.booking_link}`);
      console.log(`      Webhook: ${a.discord_webhook_url ? '✓ configured' : '✗ missing'}`);
    });
  }

  console.log();

  // 2. Verify phone mappings (phoneNumberId → agent resolution test)
  const { data: mappings, error: mapError } = await supabase
    .from('phone_mappings')
    .select(`
      phone_number_id,
      label,
      agents!inner (agency_name)
    `)
    .order('phone_number_id');

  if (mapError) {
    console.error('❌ Mapping query failed:', mapError.message);
  } else {
    console.log(`✅ Phone Mappings (${mappings.length}):`);
    mappings.forEach(m => {
      console.log(`   📞 ${m.phone_number_id} → ${m.agents.agency_name}`);
      console.log(`      Label: ${m.label}`);
    });
  }

  console.log();

  // 3. Verify leads
  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select(`
      name,
      phone_number,
      interest_level,
      summary,
      agents!inner (agency_name)
    `);

  if (leadError) {
    console.error('❌ Lead query failed:', leadError.message);
  } else {
    console.log(`✅ Leads (${leads.length}):`);
    leads.forEach(l => {
      console.log(`   👤 ${l.name} (${l.phone_number})`);
      console.log(`      Interest: ${l.interest_level}`);
      console.log(`      Agent: ${l.agents.agency_name}`);
      console.log(`      Notes: ${l.summary?.substring(0, 60)}...`);
    });
  }

  console.log();

  // 4. Verify properties (active vs pending, fresh vs stale)
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select(`
      address_full,
      status,
      last_fetched_at,
      details_json,
      agents!inner (agency_name)
    `)
    .order('address_full');

  if (propError) {
    console.error('❌ Property query failed:', propError.message);
  } else {
    console.log(`✅ Properties (${properties.length}):`);
    properties.forEach(p => {
      const daysSinceFetch = Math.floor((Date.now() - new Date(p.last_fetched_at)) / 86400000);
      const freshness = daysSinceFetch > 30 ? '🔴 STALE' : '🟢 FRESH';
      console.log(`   🏡 ${p.address_full}`);
      console.log(`      Status: ${p.status.toUpperCase()}`);
      console.log(`      Agent: ${p.agents.agency_name}`);
      console.log(`      Data: ${freshness} (${daysSinceFetch} days old)`);
      console.log(`      Beds/Baths: ${p.details_json.bedrooms}/${p.details_json.bathrooms}`);
    });
  }

  console.log("\n✅ Verification Complete!");
}

verify();
