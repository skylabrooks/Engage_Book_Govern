# Multi-Tenant Architecture Implementation

**Status**: ✅ Complete  
**Date**: December 25, 2025

---

## What Was Built

You now have a **multi-tenant, per-agent tracking system** with 5 client slots and usage-based billing:

### 1. **Phone Number Routing** (Per-Agent)
- Each client gets a unique **928 area code** phone number
- Vapi calls → webhook → lookup agent by `vapi_phone_number_id`
- Agent context flows through entire call flow (solar detection, lead creation, RLS enforcement)

### 2. **Usage Tracking** (Per-Agent)
Every billable event is logged to `agent_usage_metrics`:
- **solar_ocr_scan**: $0.075/scan (Gemini Vision)
- **water_lookup**: $0/lookup (free ArcGIS)
- **vapi_call_minutes**: Track in Vapi, log to metrics
- Custom metadata for audit trails

### 3. **Row Level Security** (Strict Isolation)
✅ Agents can only see their own:
- Leads
- Properties
- Risk assessments
- Tags
- Usage metrics

### 4. **Database Schema Changes**

**New Tables:**
- `agent_usage_metrics` — Tracks OCR, water, Vapi usage per agent

**Modified Tables:**
- `agents` — Added `phone_number`, `vapi_phone_number_id`, `user_id` columns

**Removed:**
- `phone_mappings` table (replaced by direct agents lookup)

---

## Architecture Diagram

```
5 Vapi Phone Numbers (928-xxx-xxxx)
    ↓
Inbound Call
    ↓
Vapi Webhook: POST /vapi-handler?
    - phoneNumberId: "ph_abc123..."
    ↓
vapi-handler looks up:
    SELECT * FROM agents WHERE vapi_phone_number_id = "ph_abc123..."
    ↓
Agent found → Load context:
    - agency_name
    - discord_webhook_url
    - (Optional: user_id for auth)
    ↓
Lead lookup/creation (scoped to agent_id)
    ↓
Solar detection → risk_assessments.insert()
    ↓
Vapi gets OpenAI assistant prompt
    ↓
Call flows with Spanglish persona + Arizona context
    ↓
When OCR/water called:
    agent_usage_metrics.insert({ agent_id, metric_type, cost_usd })
```

---

## Files Changed

### Migrations (Applied)
- `20251225100000_add_agent_phone_numbers.sql` — Add phone tracking columns
- `20251225100001_create_agent_usage_metrics.sql` — Usage metrics table + RLS
- `20251225100002_enhance_rls_policies.sql` — Strict agent isolation via RLS

### Seeding
- `supabase/sql/002_seed_risk_registry.sql` — 5 agents with phone numbers (Vapi IDs as placeholders)

### Functions (Deployed)
- `vapi-handler/index.ts` — Changed from `phone_mappings` → `agents` table lookup
- `solar-ocr-scanner/index.ts` — Added `agent_usage_metrics.insert()` call
- `adwr-lookup/index.ts` — Added `agent_usage_metrics.insert()` call (free)

### Documentation
- `VAPI_SETUP_GUIDE.md` — Complete setup + testing guide

---

## Next Steps: To Go Live

### 1. **Get Vapi Phone Numbers**
```bash
# In Vapi Dashboard:
1. Buy 5 phone numbers (area code 928)
2. Copy vapi_phone_number_id values (e.g., ph_abc123def456...)
3. Configure webhook for each: https://[project].supabase.co/functions/v1/vapi-handler
```

### 2. **Update Database**
```bash
# Replace placeholder Vapi IDs in seed:
supabase/sql/002_seed_risk_registry.sql

# Or run SQL directly:
UPDATE agents SET vapi_phone_number_id = 'ph_real_id_1' WHERE email = 'client1@...';
```

### 3. **Set Up Auth (Optional but Recommended)**
If using individual agent logins:
```bash
# Create Supabase Auth accounts for each agent
# Link user_id to agents table
# Use RLS policies to enforce "see own data only"
```

### 4. **Test**
```bash
# Call each 928 number and verify:
✅ Correct agency greeting
✅ Lead auto-creation
✅ Solar detection triggers qualification script
✅ Usage is logged to agent_usage_metrics
```

### 5. **Monitor Usage**
```sql
-- Monthly cost per agent
SELECT 
  a.agency_name,
  a.phone_number,
  COUNT(*) FILTER (WHERE metric_type = 'solar_ocr_scan') as ocr_scans,
  SUM(cost_usd) as total_cost_usd
FROM agents a
LEFT JOIN agent_usage_metrics aum ON a.id = aum.agent_id
WHERE aum.created_at >= date_trunc('month', NOW())
GROUP BY a.id, a.agency_name;
```

---

## Billing Model

### Fixed (Per Agent)
- **Subscription**: $249/month
- **Setup Fee**: $500 (one-time)

### Variable (Per Agent, Tracked)
- **OCR Scans**: $0.075 per scan
- **Water Lookups**: Free (ArcGIS)
- **Vapi Minutes**: ~$0.10–$0.30/min (Vapi pricing)

### Example Monthly Cost (100 leads)
- Supabase Pro: $25
- Gemini OCR (10 scans): $0.75
- ADWR (100 lookups): $0
- Vapi (400 minutes): $40–$120
- **Total**: $65.75–$145.75 (vs. $249 revenue = 46–74% profit margin)

---

## Architectural Benefits

✅ **True Isolation**: Agents can't see each other's leads/data  
✅ **Usage Tracking**: Billable metrics logged automatically  
✅ **Scalable**: Add more agents = just add rows + Vapi numbers  
✅ **Secure**: RLS policies enforce agent_id checks on all queries  
✅ **Audit Trail**: Every OCR/water call logged with agent_id + cost  

---

## Known Limitations & TODOs

1. **Vapi Minutes Tracking**
   - Currently logged manually via function calls
   - Should also track in Vapi's API and sync daily
   - TODO: Add webhook to capture call duration from Vapi

2. **Auth Setup**
   - Seeded agents have no user_id yet
   - If using per-agent auth: create Supabase Auth accounts + link
   - If not using auth: all calls via service role (less secure for client dashboards)

3. **Multi-tenant Personas**
   - System prompt in vapi-handler is generic Arizona-focused
   - TODO: Allow per-agent prompt overrides (stored in agents table)

4. **Cost Calculation**
   - Cost_usd values are hardcoded in functions
   - TODO: Move to `pricing_config` table for dynamic updates

5. **Vapi Call Duration**
   - Not currently tracked per lead
   - TODO: Capture from Vapi webhook `call.duration` field

---

## Rollback Plan

If anything breaks:

```bash
# Revert last 3 migrations
npx supabase db reset --version 20251224120000

# Or just drop usage metrics table
DROP TABLE agent_usage_metrics;

# vapi-handler will still work with phone_mappings if you recreate it
```

---

## Questions?

See detailed setup: [VAPI_SETUP_GUIDE.md](VAPI_SETUP_GUIDE.md)

---

**Next**: Buy Vapi numbers → Update database → Test phone calls → Go live!
