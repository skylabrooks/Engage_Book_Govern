# Risk Registry (Supabase)

This module stores all internal risk data (no external CRM) for the Arizona Transaction Assistant.

## Tables
- **agents**: tenant/agency owners (existing)
- **leads**: inbound callers per agent (existing)
- **properties**: cached property records (existing)
- **risk_assessments**: solar/water/HOA outcomes per lead/property
- **tags**: reusable labels (cultural, zoning, risk)
- **lead_tags** / **property_tags**: associations
- **notes**: AI handoff summaries linked to lead/property
- **hoa_documents**: HOA CC&R documents with chunked text for RAG

## Enums
- **water_source_type**: `municipal | private_well | shared_well | hauled`

## Apply Migrations & Seed
Use Supabase CLI locally.

```powershell
supabase start
supabase db reset
supabase db execute --file supabase/migrations/20251224090000_risk_registry_schema.sql
supabase db execute --file supabase/migrations/20251224120000_hoa_documents_schema.sql
supabase db execute --file supabase/sql/002_seed_risk_registry.sql
```

## Function Endpoints

### vapi-mcp-server (Orchestrator)
- `risk_assessment.create`: Insert assessment; auto-create lead/property by phone/address
- `note.create`: Persist a handoff note
- `tags.ensure_and_attach`: Ensure tag exists for agent and attach to lead/property
- `risk_assessment.latest`: Fetch latest by lead/property
- `water.lookup`: Call ADWR geofencing service for zone/water source detection
- `hoa.query`: Call HOA RAG service for rental restriction queries
- `solar.lease.scan`: Call OCR scanner for solar contract extraction

### Microservices
- **adwr-lookup**: Point-in-polygon lookup for water zones (Phoenix/Tucson/Pinal AMAs, wildcat zones)
- **hoa-rag**: Keyword-based HOA restriction retrieval with Arizona Condominium Act KB
- **solar-ocr-scanner**: OpenAI Vision API extraction of solar contract financial terms

## Example Requests

### Create Risk Assessment
```powershell
curl -i --location --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Authorization: Bearer $(supabase functions tokens get anon)" `
  --header "Content-Type: application/json" `
  --data '{
    "action":"risk_assessment.create",
    "agent_id":"<agent-uuid>",
    "lead":{"phone_number":"+16025550123","name":"John Doe"},
    "property":{"address_full":"123 Desert Lane, New River, AZ"},
    "risk":{
      "solar_status":"leased",
      "solar_escalator":true,
      "solar_escalator_pct":2.9,
      "solar_monthly_payment":180,
      "water_source":"hauled",
      "risk_level":"high",
      "assessment_json":{"source":"ai"}
    }
  }'
```

### Attach Tag to Lead
```powershell
curl -i --location --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Authorization: Bearer $(supabase functions tokens get anon)" `
  --header "Content-Type: application/json" `
  --data '{
    "action":"tags.ensure_and_attach",
    "agent_id":"<agent-uuid>",
    "name":"Multi-Generational Potential",
    "attachTo":"lead",
    "lead_id":"<lead-uuid>"
  }'
```

### Fetch Latest Risk for Lead
```powershell
curl -i --location --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Authorization: Bearer $(supabase functions tokens get anon)" `
  --header "Content-Type: application/json" `
  --data '{
    "action":"risk_assessment.latest",
    "agent_id":"<agent-uuid>",
    "lead_id":"<lead-uuid>"
  }'
```

### Water Lookup (ADWR Geofencing)
```powershell
curl -i --location --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Authorization: Bearer $(supabase functions tokens get anon)" `
  --header "Content-Type: application/json" `
  --data '{
    "action":"water.lookup",
    "lat":33.7286,
    "lng":-111.9551
  }'
```

**Response** (New River wildcat zone example):
```json
{
  "ok": true,
  "water_source": "hauled",
  "water_zone": "New River Wildcat",
  "in_ama": false,
  "has_aws": false,
  "zone_risk_level": "high",
  "note": "Hauled/shared water area; no AMA regulations apply"
}
```

### HOA Rental Query
```powershell
curl -i --location --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Authorization: Bearer $(supabase functions tokens get anon)" `
  --header "Content-Type: application/json" `
  --data '{
    "action":"hoa.query",
    "hoa_name":"Silverstone HOA",
    "query":"Are short-term rentals allowed?"
  }'
```

**Response**:
```json
{
  "ok": true,
  "hoa_name": "Silverstone HOA",
  "answer": "Based on Arizona Condominium Act § 33-1806.01, short-term rentals (less than 30 days) are typically prohibited unless explicitly allowed in CC&Rs. Silverstone HOA likely restricts STRs to protect community stability. Verify specific CC&Rs for exceptions."
}
```

### Solar Contract OCR Extraction (Google Cloud Document AI)
```powershell
curl -i --location --request POST "http://127.0.0.1:54321/functions/v1/vapi-mcp-server" `
  --header "Authorization: Bearer $(supabase functions tokens get anon)" `
  --header "Content-Type: application/json" `
  --data '{
    "action":"solar.lease.scan",
    "agent_id":"<agent-uuid>",
    "property_id":"<property-uuid>",
    "document_url":"https://example.com/sunrun-contract.pdf",
    "vendor":"Sunrun"
  }'
```

**Response** (extracted financial terms):
```json
{
  "ok": true,
  "risk_assessment_id": "uuid",
  "extracted_data": {
    "monthly_payment": 185,
    "escalator_clause": true,
    "escalator_pct": 2.9,
    "buyout_amount": 45000,
    "transfer_fee": 450,
    "lease_term_years": 20,
    "contract_type": "lease",
    "vendor": "Sunrun",
    "confidence_score": 0.92
  },
  "risk_level": "high",
  "assessment_json": {
    "extraction_method": "google-document-ai",
    "extracted_fields": { /* ... */ },
    "scan_timestamp": "2025-12-25T14:30:00Z"
  }
}
```

## Notes
- RLS policies scope reads/writes to `agent_id`.
- Use service role in backend functions; use anon key for client reads obeying RLS.
- Solar OCR scanning requires `OPENAI_API_KEY` set in function secrets.
- ADWR lookup uses hardcoded bounding boxes; integrate ArcGIS REST for production accuracy.
- HOA RAG uses keyword matching; integrate vector embeddings for semantic search as KB grows.

