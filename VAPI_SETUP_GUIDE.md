# Vapi Phone Number Setup Guide

**Goal**: Configure 5 Vapi phone numbers (928 area code) to route calls to your multi-tenant real estate system.

---

## Step 1: Purchase Phone Numbers in Vapi

1. Log into [Vapi Dashboard](https://dashboard.vapi.ai)
2. Go to **Phone Numbers** → **Buy Number**
3. Filter by **Area Code: 928** (Arizona - Prescott, Flagstaff, Yuma region)
4. Purchase **5 phone numbers** (you have 10 free on your plan)
5. Save these numbers for your records:

```
Client 1: +1 (928) 325-9142 → vapi_phone_number_id: 43fe1352-be91-455c-a06c-b18d4ea69d6a
Client 2: +1 (928) 363-9346 → vapi_phone_number_id: 334ce28e-2926-4a31-a4c5-bd2877be9139
Client 3: +1 (928) 325-9149 → vapi_phone_number_id: 95b9c01c-c43a-44a4-b3af-1f18bafb9a7b
Client 4: +1 (928) 323-9420 → vapi_phone_number_id: 7fa8eec5-9b56-436f-99e0-5770c5826f07
Client 5: +1 (928) 298-9331 → vapi_phone_number_id: d2cdbe3a-446f-4481-a732-1d23984aacd1
```

---

## Step 2: Configure Webhook for Each Phone Number

For **each phone number**, configure the webhook:

### Webhook URL
```
https://[your-supabase-project].supabase.co/functions/v1/vapi-handler
```

Replace `[your-supabase-project]` with your actual project reference (e.g., `rxutdpcbzwmpombmbkkq`).

### Webhook Settings
- **Event Type**: `assistant-request` (fired when call comes in)
- **Method**: POST
- **Authentication**: None required (HMAC optional - see below)

### Steps in Vapi Dashboard:
1. Click on each phone number
2. Navigate to **Webhook Settings**
3. Add webhook URL: .co/functions/v1/vapi-handler`
4. Select event: **assistant-request**
5. Save

---

## Step 3: Update Database with Vapi Phone IDs

After purchasing numbers, you'll get `vapi_phone_number_id` values like `ph_aBc123XyZ...`

Update your database:

```sql
UPDATE agents SET vapi_phone_number_id = '43fe1352-be91-455c-a06c-b18d4ea69d6a' WHERE email = 'client1@yourdomain.com';
UPDATE agents SET vapi_phone_number_id = '334ce28e-2926-4a31-a4c5-bd2877be9139' WHERE email = 'client2@yourdomain.com';
UPDATE agents SET vapi_phone_number_id = '95b9c01c-c43a-44a4-b3af-1f18bafb9a7b' WHERE email = 'client3@yourdomain.com';
UPDATE agents SET vapi_phone_number_id = '7fa8eec5-9b56-436f-99e0-5770c5826f07' WHERE email = 'client4@yourdomain.com';
UPDATE agents SET vapi_phone_number_id = 'd2cdbe3a-446f-4481-a732-1d23984aacd1' WHERE email = 'client5@yourdomain.com';
```

Or run migration with updated IDs:

```powershell
# Edit supabase/sql/002_seed_risk_registry.sql with real Vapi IDs
npx supabase db reset
```

---

## Step 4: Test Each Phone Number

Call each 928 number and verify:

1. ✅ Vapi answers with OpenAI voice
2. ✅ Correct agency greeting (e.g., "Thanks for calling Desert Realty Group")
3. ✅ Agent can ask fo`https://your-project.supabaser caller's name
4. ✅ If you call twice, system recognizes returning lead
5. ✅ Solar keyword detection works ("I'm interested in a home with solar panels")

### Test Checklist

| Phone | Agency | Tested | Notes |
|-------|--------|--------|-------|
| +1 (928) 325-9142 | Desert Realty Group | ⬜ | |
| +1 (928) 363-9346 | Sonoran Properties | ⬜ | |
| +1 (928) 325-9149 | Cactus Real Estate | ⬜ | |
| +1 (928) 323-9420 | Grand Canyon Homes | ⬜ | |
| +1 (928) 298-9331 | Arizona Dream Homes | ⬜ | |

---

## Step 5: Enable HMAC Security (Optional)

To prevent unauthorized webhook calls:

1. In Vapi Dashboard, go to **Settings** → **Webhooks**
2. Generate a webhook secret
3. Copy the secret and add to Supabase:

```powershell
npx supabase secrets set VAPI_WEBHOOK_SECRET=your_vapi_secret_here
```

4. Redeploy vapi-handler:

```powershell
npx supabase functions deploy vapi-handler --no-verify-jwt
```

The handler will now verify HMAC signatures on incoming webhooks.

---

## Step 6: Monitor Usage

Track per-agent metrics in `agent_usage_metrics` table:

```sql
-- View usage by agent (current month)
SELECT 
  a.agency_name,
  a.phone_number,
  COUNT(*) FILTER (WHERE aum.metric_type = 'solar_ocr_scan') AS ocr_scans,
  SUM(aum.metric_value) FILTER (WHERE aum.metric_type = 'vapi_call_minutes') AS vapi_minutes,
  SUM(aum.cost_usd) AS total_cost_usd
FROM agents a
LEFT JOIN agent_usage_metrics aum ON a.id = aum.agent_id
WHERE aum.created_at >= date_trunc('month', NOW())
GROUP BY a.id, a.agency_name, a.phone_number;
```

---

## Troubleshooting

### "This number is not yet configured"

**Cause**: `vapi_phone_number_id` not found in agents table.

**Fix**: 
1. Check Vapi Dashboard for correct phone number ID
2. Run SQL update to set `vapi_phone_number_id` on agent row
3. Verify with: `SELECT * FROM agents WHERE vapi_phone_number_id = 'ph_...';`

### Webhook not firing

**Cause**: Webhook URL misconfigured in Vapi.

**Fix**:
1. Verify URL: `https://[project].supabase.co/functions/v1/vapi-handler`
2. Check Vapi webhook logs in dashboard
3. Test locally: `curl -X POST https://[project].supabase.co/functions/v1/vapi-handler`

### Wrong agent greeting

**Cause**: Phone number mapped to wrong agent.

**Fix**: Update `vapi_phone_number_id` in database to match correct agent.

---

## Production Checklist

- [ ] All 5 phone numbers purchased in Vapi
- [ ] Webhook configured for each number
- [ ] Database updated with real `vapi_phone_number_id` values
- [ ] Test calls completed for all 5 numbers
- [ ] HMAC security enabled (optional)
- [ ] Usage monitoring dashboard created
- [ ] Client onboarding docs prepared (phone number, agency name, booking link)

---

## Next Steps

1. **Client Onboarding**: Share phone number + agency name with each client
2. **Customize Personas**: Edit system prompt in vapi-handler for each agency's tone
3. **Add Booking Links**: Update `agents.booking_link` for each client's Calendly/Acuity
4. **Monitor Usage**: Set alerts for >100 scans/month or >500 Vapi minutes/month per agent
