# Vapi Handler - Local Testing Guide

## Prerequisites

Set environment variables (replace with your actual values):
```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
$env:VAPI_WEBHOOK_SECRET="your-webhook-secret"
```

## Start the Server

From the project root:
```powershell
deno run --allow-all .\supabase\functions\vapi-handler\index.ts
```

The server will start on `http://localhost:8000/`

## Test the Handler

In a new PowerShell terminal, run:
```powershell
.\test-handler.ps1
```

Or manually with curl:
```bash
curl -X POST http://localhost:8000/ \
  -H "Content-Type: application/json" \
  -H "x-vapi-signature: test-signature" \
  -d @test-payload.json
```

## Expected Response

The handler should return JSON with assistant configuration:
```json
{
  "assistant": {
    "name": "Agency Name Assistant",
    "firstMessage": "Hello...",
    "model": {
      "provider": "openai",
      "model": "gpt-4",
      "messages": [...]
    }
  }
}
```

## Test Scenarios

1. **New Lead** - Use a phone number not in the database
2. **Returning Lead** - Use a phone number from seeded leads
3. **Invalid Payload** - Send malformed JSON
4. **Missing Mapping** - Use unknown phoneNumberId

## Next Steps

After local testing works:
- Seed the Supabase database (see `real-estate-seed/`)
- Deploy to Supabase Edge Functions
- Configure Vapi webhook URL
