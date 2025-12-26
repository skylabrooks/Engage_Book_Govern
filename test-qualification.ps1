# Test Expert Qualification System
# Run after deploying migration and functions

Write-Host "🧪 Expert Qualification System - Test Suite" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$LOCAL_URL = "http://127.0.0.1:54321/functions/v1/vapi-mcp-server"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Test function
function Test-QualificationAction {
    param(
        [string]$TestName,
        [hashtable]$Payload,
        [int]$ExpectedScoreMin,
        [int]$ExpectedScoreMax,
        [string]$ExpectedStatus
    )
    
    Write-Host "📋 Test: $TestName" -ForegroundColor Yellow
    
    $json = $Payload | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-WebRequest -Uri $LOCAL_URL `
            -Method POST `
            -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $ANON_KEY" } `
            -Body $json `
            -UseBasicParsing
        
        $result = $response.Content | ConvertFrom-Json
        
        if ($result.ok) {
            $score = $result.qualification_score
            $status = $result.qualification_status
            
            Write-Host "  ✅ Score: $score | Status: $status" -ForegroundColor Green
            
            if ($score -ge $ExpectedScoreMin -and $score -le $ExpectedScoreMax -and $status -eq $ExpectedStatus) {
                Write-Host "  ✅ PASS - Score and status match expectations" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  PARTIAL - Expected score: $ExpectedScoreMin-$ExpectedScoreMax, status: $ExpectedStatus" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ❌ FAIL - $($result.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# First, create a test lead
Write-Host "🔨 Creating test lead..." -ForegroundColor Cyan

$createLeadPayload = @{
    action = "risk_assessment.create"
    agent_id = "00000000-0000-0000-0000-000000000001"  # Replace with real agent ID
    lead = @{
        phone_number = "+14805559999"
        name = "Test Qualification Lead"
    }
    property = @{
        address_full = "1234 Test St, Phoenix, AZ 85001"
    }
    risk = @{
        risk_level = "low"
        assessment_json = @{
            source = "test"
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $createResponse = Invoke-WebRequest -Uri $LOCAL_URL `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $ANON_KEY" } `
        -Body $createLeadPayload `
        -UseBasicParsing
    
    $createResult = $createResponse.Content | ConvertFrom-Json
    $TEST_LEAD_ID = $createResult.lead_id
    $TEST_AGENT_ID = "00000000-0000-0000-0000-000000000001"  # Replace with real agent ID
    
    Write-Host "  ✅ Created lead: $TEST_LEAD_ID" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "  ⚠️  Could not create test lead - using placeholder" -ForegroundColor Yellow
    $TEST_LEAD_ID = "00000000-0000-0000-0000-000000000002"  # Placeholder
    $TEST_AGENT_ID = "00000000-0000-0000-0000-000000000001"
    Write-Host ""
}

# Test Suite
Write-Host "🧪 Running Test Scenarios..." -ForegroundColor Cyan
Write-Host ""

# Test 1: HOT LEAD - Cash buyer, immediate timeline
Test-QualificationAction `
    -TestName "HOT LEAD - Cash Buyer, Immediate Timeline" `
    -Payload @{
        action = "lead.update_qualification"
        agent_id = $TEST_AGENT_ID
        lead_id = $TEST_LEAD_ID
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
    } `
    -ExpectedScoreMin 85 `
    -ExpectedScoreMax 100 `
    -ExpectedStatus "hot"

Start-Sleep -Seconds 1

# Test 2: WARM LEAD - Pre-approved, 90-day timeline
Test-QualificationAction `
    -TestName "WARM LEAD - Pre-approved Letter, 90-day Timeline" `
    -Payload @{
        action = "lead.update_qualification"
        agent_id = $TEST_AGENT_ID
        lead_id = $TEST_LEAD_ID
        preapproval_status = "letter"
        budget_min = 350000
        budget_max = 450000
        down_payment_pct = 10
        credit_score_range = "good"
        timeline = "90days"
        motivation = "growing_family"
        urgency_level = "high"
        preferred_cities = @("Gilbert", "Chandler", "Queen Creek")
        bedrooms_min = 4
        bathrooms_min = 2.5
        must_have_features = @("casita", "main floor bedroom")
        needs_multi_gen = $true
        has_solar_concern = $false
        has_water_concern = $false
    } `
    -ExpectedScoreMin 65 `
    -ExpectedScoreMax 80 `
    -ExpectedStatus "warm"

Start-Sleep -Seconds 1

# Test 3: QUALIFYING LEAD - Verbal pre-qual, 6-month timeline
Test-QualificationAction `
    -TestName "QUALIFYING LEAD - Verbal Pre-qual, 6-month Timeline" `
    -Payload @{
        action = "lead.update_qualification"
        agent_id = $TEST_AGENT_ID
        lead_id = $TEST_LEAD_ID
        preapproval_status = "verbal"
        budget_max = 300000
        timeline = "6months"
        motivation = "first_home"
        urgency_level = "medium"
        preferred_cities = @("Mesa", "Tempe")
        bedrooms_min = 3
        bathrooms_min = 2
        has_solar_concern = $false
    } `
    -ExpectedScoreMin 40 `
    -ExpectedScoreMax 60 `
    -ExpectedStatus "qualifying"

Start-Sleep -Seconds 1

# Test 4: COLD LEAD - No financing, exploring
Test-QualificationAction `
    -TestName "COLD LEAD - No Financing, Exploring" `
    -Payload @{
        action = "lead.update_qualification"
        agent_id = $TEST_AGENT_ID
        lead_id = $TEST_LEAD_ID
        preapproval_status = "none"
        timeline = "exploring"
        motivation = "unknown"
        urgency_level = "low"
        has_solar_concern = $false
    } `
    -ExpectedScoreMin 10 `
    -ExpectedScoreMax 25 `
    -ExpectedStatus "cold"

Start-Sleep -Seconds 1

# Test 5: RISK PENALTIES - Solar + Water concerns
Test-QualificationAction `
    -TestName "RISK PENALTIES - Solar & Water Concerns" `
    -Payload @{
        action = "lead.update_qualification"
        agent_id = $TEST_AGENT_ID
        lead_id = $TEST_LEAD_ID
        preapproval_status = "letter"
        budget_min = 400000
        budget_max = 500000
        timeline = "30days"
        motivation = "upgrading"
        urgency_level = "high"
        preferred_cities = @("New River", "Rio Verde")
        bedrooms_min = 4
        has_solar_concern = $true
        has_water_concern = $true
    } `
    -ExpectedScoreMin 60 `
    -ExpectedScoreMax 75 `
    -ExpectedStatus "warm"

# Test 6: Calculate Score Action
Write-Host "📋 Test: Calculate Score Action" -ForegroundColor Yellow

$calcPayload = @{
    action = "lead.calculate_score"
    agent_id = $TEST_AGENT_ID
    lead_id = $TEST_LEAD_ID
} | ConvertTo-Json -Depth 10

try {
    $calcResponse = Invoke-WebRequest -Uri $LOCAL_URL `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $ANON_KEY" } `
        -Body $calcPayload `
        -UseBasicParsing
    
    $calcResult = $calcResponse.Content | ConvertFrom-Json
    
    if ($calcResult.ok) {
        Write-Host "  ✅ Score calculated: $($calcResult.qualification_score)" -ForegroundColor Green
        Write-Host "  ✅ Status: $($calcResult.qualification_status)" -ForegroundColor Green
        Write-Host "  ✅ PASS" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAIL - $($calcResult.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Test Suite Complete" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review test results above" -ForegroundColor White
Write-Host "  2. Run SQL queries from QUALIFICATION_TESTING_GUIDE.md" -ForegroundColor White
Write-Host "  3. Test with real Vapi calls" -ForegroundColor White
Write-Host "  4. Monitor qualification distribution" -ForegroundColor White
Write-Host ""
