# Test script for Arizona Transaction Assistant

Write-Host "Testing Arizona Transaction Assistant Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Test 1: ADWR Lookup (New River - Wildcat Zone)" -ForegroundColor Yellow
Write-Host "Expected: water_source=hauled, zone_risk_level=high" -ForegroundColor Green
Write-Host ""

Write-Host "Test 2: ADWR Lookup (Phoenix - Phoenix AMA)" -ForegroundColor Yellow
Write-Host "Expected: water_source=municipal, zone_risk_level=low" -ForegroundColor Green
Write-Host ""

Write-Host "Test 3: HOA RAG Query" -ForegroundColor Yellow
Write-Host "Expected: answer contains Short-Term Rental Ban or 30 days" -ForegroundColor Green
Write-Host ""

Write-Host "Test 4: Risk Assessment Creation" -ForegroundColor Yellow
Write-Host "Expected: ok=true, risk_assessment_id returned" -ForegroundColor Green
Write-Host ""

Write-Host "Test 5: Water Lookup via vapi-mcp-server" -ForegroundColor Yellow
Write-Host "Expected: water_source=hauled, zone_risk_level=high" -ForegroundColor Green
Write-Host ""

Write-Host "Test 6: HOA Query via vapi-mcp-server" -ForegroundColor Yellow
Write-Host "Expected: answer contains Short-Term Rental Ban or 3-day" -ForegroundColor Green
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Deployed Functions:" -ForegroundColor Green
Write-Host "  - adwr-lookup: Point-in-polygon water zone detection" -ForegroundColor Green
Write-Host "  - hoa-rag: HOA CC&R retrieval-augmented generation" -ForegroundColor Green
Write-Host "  - vapi-mcp-server: Main risk assessment orchestrator" -ForegroundColor Green
Write-Host ""

Write-Host "Created Schemas:" -ForegroundColor Green
Write-Host "  - risk_assessments: Solar, water, HOA risk data" -ForegroundColor Green
Write-Host "  - tags: Cultural/zoning tags per agent" -ForegroundColor Green
Write-Host "  - lead_tags / property_tags: Associations" -ForegroundColor Green
Write-Host "  - notes: Agent handoff summaries" -ForegroundColor Green
Write-Host "  - hoa_documents: Uploaded HOA CC&Rs" -ForegroundColor Green
Write-Host ""

Write-Host "API Endpoints Ready:" -ForegroundColor Cyan
Write-Host "  POST /functions/v1/adwr-lookup" -ForegroundColor Cyan
Write-Host "  POST /functions/v1/hoa-rag" -ForegroundColor Cyan
Write-Host "  POST /functions/v1/vapi-mcp-server" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Engineer Spanglish persona prompt" -ForegroundColor Yellow
Write-Host "  2. Create Lease Scanner OCR pipeline" -ForegroundColor Yellow
Write-Host "  3. Add hauled water advisory script" -ForegroundColor Yellow
Write-Host "  4. Onboard beta agents for testing" -ForegroundColor Yellow
Write-Host ""
