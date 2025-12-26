# Webhook Configuration Checklist

Your Supabase Project Ref: `rxutdpcbzwmpombmbkkq`

**Webhook URL (same for all 5 numbers):**
```
https://rxutdpcbzwmpombmbkkq.supabase.co/functions/v1/vapi-handler
```

---

## ☑️ Configuration Steps per Phone Number

**Repeat for each number in Vapi Dashboard:**
1. Go to **Phone Numbers** → click the number
2. Navigate to **Webhook Settings**
3. Add the webhook:
   - **URL:** `https://rxutdpcbzwmpombmbkkq.supabase.co/functions/v1/vapi-handler`
   - **Event Type:** `assistant-request`
   - **Method:** POST
   - **Authentication:** None (leave blank)
4. Save

---

## Phone-by-Phone Checklist

**Number 1: Desert Realty Group**
- Phone: +1 (928) 325-9142
- Vapi ID: 43fe1352-be91-455c-a06c-b18d4ea69d6a
- Webhook: `https://rxutdpcbzwmpombmbkkq.supabase.co/functions/v1/vapi-handler`
- Status: ⬜ Not configured

**Number 2: Sonoran Properties**
- Phone: +1 (928) 363-9346
- Vapi ID: 334ce28e-2926-4a31-a4c5-bd2877be9139
- Webhook: `https://rxutdpcbzwmpombmbkkq.supabase.co/functions/v1/vapi-handler`
- Status: ⬜ Not configured

**Number 3: Cactus Real Estate**
- Phone: +1 (928) 325-9149
- Vapi ID: 95b9c01c-c43a-44a4-b3af-1f18bafb9a7b
- Webhook: `https://rxutdpcbzwmpombmbkkq.supabase.co/functions/v1/vapi-handler`
- Status: ⬜ Not configured

**Number 4: Grand Canyon Homes**
- Phone: +1 (928) 323-9420
- Vapi ID: 7fa8eec5-9b56-436f-99e0-5770c5826f07
- Webhook: `https://rxutdpcbzwmpombmbkkq.supabase.co/functions/v1/vapi-handler`
- Status: ⬜ Not configured

**Number 5: Arizona Dream Homes**
- Phone: +1 (928) 298-9331
- Vapi ID: d2cdbe3a-446f-4481-a732-1d23984aacd1
- Webhook: `https://rxutdpcbzwmpombmbkkq.supabase.co/functions/v1/vapi-handler`
- Status: ⬜ Not configured

---

## 🧪 Test Each Number (After Webhook Configuration)

**Quick curl test** (replace `VAPI_NUMBER_ID` with actual ID):
```bash
curl -X POST https://rxutdpcbzwmpombmbkkq.supabase.co/functions/v1/vapi-handler \
  -H "Content-Type: application/json" \
  -d '{"assistantId":"test","phoneNumberId":"43fe1352-be91-455c-a06c-b18d4ea69d6a"}'
```

**Manual test (best option):**
1. Call each phone number from your mobile
2. System should answer with agency greeting (e.g., "Thanks for calling Desert Realty Group")
3. Say your name or respond to prompts
4. On second call (same number), system should recognize returning lead
5. Say a solar keyword (e.g., "I'm interested in solar") and system should log risk assessment

---

## Optional: Enable HMAC Security

If you want to secure webhooks with a shared secret:

1. In Vapi Dashboard → **Settings** → **Webhooks** → generate secret
2. Copy the secret and run:
   ```powershell
   npx supabase secrets set VAPI_WEBHOOK_SECRET=your_secret_here
   ```
3. Redeploy:
   ```powershell
   npx supabase functions deploy vapi-handler --no-verify-jwt
   ```

---

## Troubleshooting

**Webhook not firing?**
- Check Vapi Dashboard webhook logs
- Verify URL is exactly: `https://rxutdpcbzwmpombmbkkq.supabase.co/functions/v1/vapi-handler`
- Confirm event type is `assistant-request`
- Ensure phone number is in `agents` table with correct `vapi_phone_number_id`

**Wrong greeting or no response?**
- Check that `vapi_phone_number_id` matches in database (run: `SELECT * FROM agents WHERE vapi_phone_number_id LIKE '%';`)
- Verify phone number format matches seed: `+1 (928) XXX-XXXX`

**Database not updated yet?**
```powershell
npx supabase db reset
```
This will run migrations + seed with your real Vapi IDs.

---

## Next Steps

- [ ] Configure webhooks for all 5 numbers in Vapi
- [ ] Test calls on each number
- [ ] Verify leads appear in database
- [ ] Check solar risk detection works
- [ ] Enable HMAC (optional)
