# Test script for vapi-handler
$payload = @"
{
  "message": {
    "call": {
      "phoneNumberId": "test-phone-123",
      "customer": {
        "number": "+16025550199"
      }
    }
  }
}
"@

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:8000/' -Method POST -Body $payload -ContentType 'application/json'
    Write-Host "Success! Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_"
    Write-Host $_.Exception.Message
}
