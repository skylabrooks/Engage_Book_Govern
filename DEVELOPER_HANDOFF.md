# Developer Handoff – Arizona Transaction Assistant

_Last updated: 2025-12-25_

## Overview
- Platform: Supabase Functions (Deno) + Postgres (RLS enabled)
- Domains: Solar lease risk, water/ADWR lookup, HOA/STR rules, internal risk registry (no external CRM)
- Current OCR: Google Cloud Document AI (deployed); pending decision to migrate to Azure Form Recognizer

## What’s Complete
- **Schema & Seed**
  - Risk registry tables, enums, policies: supabase/migrations/20251224090000_risk_registry_schema.sql
  - HOA documents schema: supabase/migrations/20251224120000_hoa_documents_schema.sql
  - Default tags seed: supabase/sql/002_seed_risk_registry.sql
- **Functions**
  - Orchestrator: supabase/functions/vapi-mcp-server/index.ts
    - risk_assessment.create, note.create, tags.ensure_and_attach, risk_assessment.latest
    - water.lookup → proxies to adwr-lookup (currently stub geofence logic)
    - hoa.query → proxies to hoa-rag
    - solar.lease.scan → proxies to solar-ocr-scanner (GCP Document AI)
  - Water: supabase/functions/adwr-lookup/index.ts (stubbed geofence)
  - HOA/STR: supabase/functions/hoa-rag/index.ts (RAG scaffold + storage)
  - Solar OCR (GCP): supabase/functions/solar-ocr-scanner/index.ts
- **Docs**
  - GCP_DEPLOYMENT.md (summary)
  - GCP_SETUP_GUIDE.md (setup steps for Document AI)

## Open Gaps / Risks
- ADWR: No live ArcGIS integration; uses bounding-box stub. Needs real AMA/AWS/wildcat polygons.
- OCR: Currently wired to GCP Document AI; team prefers Azure Form Recognizer—migration pending.
- Local lease scanner proxy (Tesseract) not wired into orchestrator in this snapshot.
- No auto-tagging on high solar risk.
- Domain allowlist/SSRF guard for document_url not enforced.

## Configuration (Production)
- Supabase runtime provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
- OCR (current): GCP Document AI secrets required in solar-ocr-scanner function:
  - GCP_PROJECT_ID, GCP_SOLAR_PROCESSOR_ID, GCP_LOCATION, GOOGLE_APPLICATION_CREDENTIALS_JSON
- If/when migrating to Azure, replace with: AZURE_FORM_RECOGNIZER_ENDPOINT, AZURE_FORM_RECOGNIZER_KEY (and model ID if custom).

## Quick Test Commands
- HOA query:
  curl -i -X POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" \
    -H "Content-Type: application/json" \
    -d '{"action":"hoa.query","hoa_name":"Silverstone HOA","query":"Does this HOA allow Airbnb?"}'

- Water lookup (stub):
  curl -i -X POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" \
    -H "Content-Type: application/json" \
    -d '{"action":"water.lookup","lat":33.91,"lng":-111.52}'

- Solar OCR (needs OCR secrets):
  curl -i -X POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" \
    -H "Content-Type: application/json" \
    -d '{"action":"solar.lease.scan","agent_id":"<agent-uuid>","lead_id":"<lead-uuid>","document_url":"https://example.com/contract.pdf","vendor":"Sunrun"}'

## Recommended TODOs (Priority)
1) OCR Migration to Azure Form Recognizer
   - Swap GCP call in solar-ocr-scanner to Azure Form Recognizer (Layout/Document model or custom).
   - Update env vars and docs; keep API shape the same (`solar.lease.scan`).
   - Add retries/backoff and page-count guard.
2) ADWR Production
   - Integrate ADWR ArcGIS REST for AMA/AWS/wildcat polygons; cache results in a water_zones table.
   - Return source_layer/determination_id/confidence.
3) Local Lease Scanner Proxy (self-hosted OCR)
   - Add action `solar.lease.scan.local` to vapi-mcp-server to call local Tesseract service; resolve/create lead/property; persist risk.
4) Auto-Tagging
   - On high solar risk, call tags.ensure_and_attach to add "Solar Liability" tag to lead/property.
5) HOA/STR Quality
   - Add embeddings/pgvector for better retrieval; normalize outputs (min_lease_days, str_allowed, citation) into a table; CLI to bulk ingest CC&Rs.
6) Security & Hygiene
   - Enforce document_url allowlist to mitigate SSRF.
   - Consider unique constraint on properties(address_full, agent_id) if not already present.
7) Observability
   - Structured logs with trace IDs; SQL view/dashboard for high-risk counts per agent.

## File Map (key)
- Orchestrator: supabase/functions/vapi-mcp-server/index.ts
- Solar OCR: supabase/functions/solar-ocr-scanner/index.ts
- Water: supabase/functions/adwr-lookup/index.ts
- HOA: supabase/functions/hoa-rag/index.ts
- Migrations: supabase/migrations/*.sql
- Seeds: supabase/sql/*.sql
- Docs: GCP_DEPLOYMENT.md, GCP_SETUP_GUIDE.md

## Suggested Next Steps
- Decide on Azure vs keep GCP; if Azure, implement the swap in solar-ocr-scanner and update secrets.
- Replace ADWR stub with real ArcGIS integration.
- Wire local lease scanner proxy if you want a no-cloud fallback.
- Add auto-tagging on high solar risk.
