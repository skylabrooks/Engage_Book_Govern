# Expert Qualification System - Testing Guide

## 🚀 Quick Start

### 1. Deploy Database Migration
```powershell
# Apply the new qualification fields schema
npx supabase db push --include-all

# Or apply specific migration
npx supabase db execute --file supabase/migrations/20251225150000_add_qualification_fields.sql

# Verify migration
npx supabase db execute --sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads' AND column_name LIKE '%qualification%' OR column_name LIKE '%preapproval%' OR column_name LIKE '%budget%';"
```

### 2. Deploy Updated Functions
```powershell
# Deploy vapi-handler with enhanced prompt
npx supabase functions deploy vapi-handler --no-verify-jwt

# Deploy vapi-mcp-server with new actions
npx supabase functions deploy vapi-mcp-server --no-verify-jwt

# Verify deployment
npx supabase functions list
```

### 3. Test Locally First
```powershell
# Start local Supabase
supabase start

# Reset database with new schema
supabase db reset

# Test the new qualification endpoint
./test-qualification.ps1
```

---

## 🧪 Test Scenarios

### Scenario 1: HOT LEAD (Cash Buyer, Immediate Timeline)
```powershell
$leadId = "uuid-here"  # Replace with actual lead ID from seed
$agentId = "uuid-here" # Replace with actual agent ID

$body = @{
    action = "lead.update_qualification"
    agent_id = $agentId
    lead_id = $leadId
    preapproval_status = "cash"
    budget_min = 500000
    budget_max = 750000
    timeline = "immediate"
    motivation = "relocating"
    urgency_level = "critical"
    preferred_cities = @("Scottsdale", "Paradise Valley")
    bedrooms_min = 4
    bathrooms_min = 3
    must_have_features = @("pool", "3-car garage")
    has_solar_concern = $false
    has_water_concern = $false
} | ConvertTo-Json

curl -i --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Content-Type: application/json" `
  --data $body

# Expected: qualification_score = 85-100, qualification_status = "hot"
```

### Scenario 2: WARM LEAD (Pre-approved, 90-day timeline)
```powershell
$body = @{
    action = "lead.update_qualification"
    agent_id = $agentId
    lead_id = $leadId
    preapproval_status = "letter"
    budget_min = 350000
    budget_max = 450000
    down_payment_pct = 10
    credit_score_range = "good"
    timeline = "90days"
    motivation = "growing_family"
    urgency_level = "high"
    preferred_cities = @("Gilbert", "Chandler")
    bedrooms_min = 4
    bathrooms_min = 2.5
    must_have_features = @("casita")
    needs_multi_gen = $true
    has_solar_concern = $false
} | ConvertTo-Json

curl -i --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Content-Type: application/json" `
  --data $body

# Expected: qualification_score = 60-75, qualification_status = "warm"
```

### Scenario 3: QUALIFYING LEAD (Verbal pre-qual, 6-month timeline)
```powershell
$body = @{
    action = "lead.update_qualification"
    agent_id = $agentId
    lead_id = $leadId
    preapproval_status = "verbal"
    budget_max = 300000
    timeline = "6months"
    motivation = "first_home"
    urgency_level = "medium"
    preferred_cities = @("Mesa", "Tempe")
    bedrooms_min = 3
    bathrooms_min = 2
    has_solar_concern = $false
} | ConvertTo-Json

curl -i --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Content-Type: application/json" `
  --data $body

# Expected: qualification_score = 40-55, qualification_status = "qualifying"
```

### Scenario 4: COLD LEAD (No financing, vague timeline)
```powershell
$body = @{
    action = "lead.update_qualification"
    agent_id = $agentId
    lead_id = $leadId
    preapproval_status = "none"
    timeline = "exploring"
    motivation = "unknown"
    urgency_level = "low"
    has_solar_concern = $false
} | ConvertTo-Json

curl -i --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Content-Type: application/json" `
  --data $body

# Expected: qualification_score = 10-25, qualification_status = "cold"
```

### Scenario 5: SOLAR RISK PENALTY
```powershell
$body = @{
    action = "lead.update_qualification"
    agent_id = $agentId
    lead_id = $leadId
    preapproval_status = "letter"
    budget_min = 400000
    budget_max = 500000
    timeline = "30days"
    motivation = "upgrading"
    urgency_level = "high"
    preferred_cities = @("Queen Creek")
    bedrooms_min = 4
    has_solar_concern = $true  # Penalty: -5 points
    has_water_concern = $true  # Penalty: -5 points
} | ConvertTo-Json

curl -i --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Content-Type: application/json" `
  --data $body

# Expected: qualification_score reduced by 10 points due to risk flags
```

---

## 🔍 Verification Queries

### Check Qualification Distribution
```sql
-- View qualification status breakdown
SELECT 
  qualification_status,
  COUNT(*) as count,
  AVG(qualification_score) as avg_score,
  MIN(qualification_score) as min_score,
  MAX(qualification_score) as max_score
FROM public.leads
WHERE agent_id = '<agent-uuid>'
GROUP BY qualification_status
ORDER BY avg_score DESC;
```

### View Hot Leads (Priority Follow-up)
```sql
-- All hot leads needing immediate attention
SELECT 
  id,
  name,
  phone_number,
  qualification_score,
  preapproval_status,
  timeline,
  budget_max,
  preferred_cities,
  qualified_at,
  appointment_booked_at
FROM public.leads
WHERE agent_id = '<agent-uuid>'
  AND qualification_status = 'hot'
  AND appointment_booked_at IS NULL
ORDER BY qualification_score DESC, qualified_at ASC;
```

### Check Score Calculation Accuracy
```sql
-- Manual score verification
SELECT 
  id,
  name,
  qualification_score,
  preapproval_status,
  timeline,
  budget_min,
  budget_max,
  motivation,
  preferred_cities,
  has_solar_concern,
  has_water_concern
FROM public.leads
WHERE agent_id = '<agent-uuid>'
ORDER BY qualification_score DESC
LIMIT 10;
```

### Trigger Test (Auto-scoring)
```sql
-- Update a field and verify trigger fires
UPDATE public.leads
SET timeline = 'immediate'
WHERE id = '<lead-uuid>';

-- Check if score was auto-updated
SELECT qualification_score, qualification_status, qualified_at
FROM public.leads
WHERE id = '<lead-uuid>';
```

---

## 📞 Vapi Integration Testing

### Test Enhanced Vapi Handler
```powershell
# Test with mock Vapi payload
$vapiPayload = @{
    message = @{
        type = "assistant-request"
        call = @{
            phoneNumberId = "<your-vapi-phone-id>"
            customer = @{
                number = "+14805551234"
                name = "Test Caller"
            }
        }
    }
} | ConvertTo-Json -Depth 5

curl -i --request POST "http://127.0.0.1:54321/functions/v1/vapi-handler" `
  --header "Content-Type: application/json" `
  --header "x-vapi-signature: test" `
  --data $vapiPayload

# Verify response includes:
# - Enhanced qualification prompts
# - BANT+M framework questions
# - Scoring targets
```

---

## 🎯 KPI Dashboard Queries

### Qualification Funnel
```sql
-- See conversion rates through qualification stages
SELECT 
  qualification_status,
  COUNT(*) as leads,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.leads WHERE agent_id = '<agent-uuid>'), 2) as percentage,
  COUNT(CASE WHEN appointment_booked_at IS NOT NULL THEN 1 END) as booked_appointments,
  ROUND(
    COUNT(CASE WHEN appointment_booked_at IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 
    2
  ) as booking_rate
FROM public.leads
WHERE agent_id = '<agent-uuid>'
GROUP BY qualification_status
ORDER BY 
  CASE qualification_status
    WHEN 'hot' THEN 1
    WHEN 'warm' THEN 2
    WHEN 'qualifying' THEN 3
    WHEN 'cold' THEN 4
    WHEN 'unqualified' THEN 5
    WHEN 'disqualified' THEN 6
  END;
```

### Average Time to Qualification
```sql
-- How long does it take to qualify a lead?
SELECT 
  qualification_status,
  AVG(EXTRACT(EPOCH FROM (qualified_at - created_at)) / 60) as avg_minutes_to_qualify,
  COUNT(*) as count
FROM public.leads
WHERE agent_id = '<agent-uuid>'
  AND qualified_at IS NOT NULL
GROUP BY qualification_status;
```

### Risk Flag Analysis
```sql
-- How do risk flags impact qualification?
SELECT 
  has_solar_concern,
  has_water_concern,
  has_hoa_concern,
  COUNT(*) as leads,
  AVG(qualification_score) as avg_score,
  ROUND(
    COUNT(CASE WHEN qualification_status IN ('hot', 'warm') THEN 1 END) * 100.0 / 
    COUNT(*), 
    2
  ) as hot_warm_pct
FROM public.leads
WHERE agent_id = '<agent-uuid>'
GROUP BY has_solar_concern, has_water_concern, has_hoa_concern
ORDER BY avg_score DESC;
```

---

## 🐛 Troubleshooting

### Issue: Qualification score not calculating
**Check:**
1. Trigger is installed: `SELECT * FROM pg_trigger WHERE tgname = 'leads_qualification_score_trigger';`
2. Function exists: `SELECT proname FROM pg_proc WHERE proname = 'calculate_qualification_score';`
3. Run manually: `SELECT calculate_qualification_score('<lead-uuid>');`

### Issue: MCP actions returning errors
**Check:**
1. Function deployed: `npx supabase functions list`
2. Logs: `npx supabase functions logs vapi-mcp-server`
3. Service role key set: `npx supabase secrets list`

### Issue: Vapi not using new prompts
**Check:**
1. Handler deployed: `npx supabase functions deploy vapi-handler --no-verify-jwt`
2. Test locally: `deno run --allow-all supabase/functions/vapi-handler/index.ts`
3. Check response includes BANT+M framework text

---

## 📊 Expected Outcomes

### Qualification Distribution (Target)
- **Hot (70-100):** 15-20% of leads
- **Warm (50-69):** 25-35% of leads
- **Qualifying (30-49):** 20-30% of leads
- **Cold (15-29):** 15-20% of leads
- **Unqualified (0-14):** 5-10% of leads

### Booking Rates by Tier (Target)
- **Hot leads:** 80%+ should book appointments
- **Warm leads:** 60-70% should book appointments
- **Qualifying leads:** 30-40% should book appointments
- **Cold leads:** <20% booking rate (nurture campaign)

---

## 🔐 Production Deployment Checklist

- [ ] Run migration: `npx supabase db push --include-all`
- [ ] Verify migration: Check `leads` table has new columns
- [ ] Deploy vapi-handler: `npx supabase functions deploy vapi-handler --no-verify-jwt`
- [ ] Deploy vapi-mcp-server: `npx supabase functions deploy vapi-mcp-server --no-verify-jwt`
- [ ] Test qualification flow with real Vapi call
- [ ] Monitor logs for 24 hours: `npx supabase functions logs vapi-handler --tail`
- [ ] Review first 10 qualified leads manually
- [ ] Set up Discord alerts for hot leads (if not already configured)
- [ ] Train team on new qualification criteria
- [ ] Create dashboard for real-time qualification metrics

---

## 📝 Next Steps

1. **Week 1:** Deploy and monitor, fix any edge cases
2. **Week 2:** Analyze qualification distribution, tune scoring weights if needed
3. **Week 3:** Add automated follow-up sequences by tier
4. **Week 4:** Integrate with CRM (HubSpot/Follow Up Boss) if needed

---

**Document Version:** 1.0  
**Last Updated:** December 25, 2025
