# Project Handoff – Arizona Transaction Assistant

## Scope
MVP focuses on two features: Arizona persona (Spanglish, solar/water awareness) and solar liability detection in the Vapi voice handler.

## Current Implementation
- Solar liability detection engine with keyword triggers and qualification script in [supabase/functions/vapi-handler/index.ts](supabase/functions/vapi-handler/index.ts).
- Arizona persona system prompt (Spanglish, solar/water guidance, cultural vocabulary) injected into the Vapi assistant response in [supabase/functions/vapi-handler/index.ts](supabase/functions/vapi-handler/index.ts#L260-L330) (line numbers approximate; verify after edits).
- Discord lead notifications already wired for inbound calls in [supabase/functions/vapi-handler/index.ts](supabase/functions/vapi-handler/index.ts).

## Known Warnings (pre-existing)
- Deno lint: inline `npm:` import for Supabase (`createClient`) flagged; consider moving to deno.json dependencies.
- Type lint: one `any` usage when parsing JSON payload; can replace with typed interface.

## Next Priorities
1) Finish data layer (from [phase_5.md](phase_5.md))
   - Define/confirm tables: agents, phone_mappings, leads, properties, interactions, discord_logs; apply RLS per tenant.
   - Seed two agents (Phoenix/Sedona), phoneNumberId mappings, Discord webhooks, Cal.com links, mock RentCast properties (active/pending, fresh/stale), returning lead fixture.
   - Add validation SQL scripts for phoneNumberId→agent, property lookup, webhook null check.
2) Tighten Vapi handler
   - Replace `any` parse with typed payload interface; guard rails for missing fields.
   - Surface solar detection in responses/CRM tags when available.
   - Add water-zone awareness hook (placeholder for ADWR lookup microservice once ready).
3) Notifications & logging
   - Add discord_logs table; log delivery status; graceful fallback if webhook missing/invalid.
4) Testing
   - Local POST fixture for assistant-request payload to simulate inbound calls.
   - Verify prompt content includes solar qualification script when solar terms are present in lead context.

## Environment & Secrets
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY required by edge function.
- VAPI_WEBHOOK_SECRET optional; signature verified if present.
- Discord webhook per agent stored in DB; ensure valid https://discord.com/api/webhooks/... format.

## How to Run/Check
- Supabase edge function (Vapi handler) entry: [supabase/functions/vapi-handler/index.ts](supabase/functions/vapi-handler/index.ts).
- For manual curl test, post assistant-request payload with phoneNumberId and customer.number to the deployed function URL (or local supabase functions serve).

## References
- Architecture and seeding plan: [phase_5.md](phase_5.md).
- Current voice handler logic: [supabase/functions/vapi-handler/index.ts](supabase/functions/vapi-handler/index.ts).
