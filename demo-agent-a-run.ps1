# Agent A Demo - Quick Run Script

Write-Host "🚀 Agent A Demo - Starting..." -ForegroundColor Cyan

# Step 1: Start vapi-handler in background
Write-Host "`n📡 Step 1: Starting vapi-handler locally..." -ForegroundColor Yellow
$handler = Start-Process powershell -ArgumentList "-NoExit", "-Command", "deno run --allow-all --env-file=real-estate-seed\.env supabase\functions\vapi-handler\index.ts" -PassThru -WindowStyle Normal
Write-Host "⏳ Waiting for handler to start (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 2: Send test payload
Write-Host "`n📤 Step 2: Sending test webhook payload..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/' -Method POST -ContentType 'application/json' -InFile '.\test-payload.json'
    Write-Host "✅ Response received!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error sending payload: $_" -ForegroundColor Red
}

# Step 3: Show next steps
Write-Host "`n✅ Demo Complete!" -ForegroundColor Green
Write-Host "`n📋 What to check:" -ForegroundColor Cyan
Write-Host "  1. Discord #leads channel - should see NEW LEAD message"
Write-Host "  2. Database - run demo-agent-a-verify.sql to see inserted lead"
Write-Host "  3. Handler window - check for Discord notification confirmation"

Write-Host "`n🛑 To stop the handler, close the other PowerShell window or press Ctrl+C there" -ForegroundColor Yellow
Write-Host "`nPress any key to exit this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
