# Start the vapi-handler and show output
Write-Host "Setting environment variables from real-estate-seed\.env ..."
Get-Content ".\real-estate-seed\.env" | ForEach-Object {
    if ($_ -match '^\s*([^=#+]+)=(.*)$') {
        $name = $matches[1].Trim()
        $val = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $val, 'Process')
        Write-Host "  Set $name"
    }
}
Write-Host ""
Write-Host "Starting Deno server on http://localhost:8000/"
Write-Host "Press Ctrl+C to stop"
Write-Host ""

deno run --allow-all .\supabase\functions\vapi-handler\index.ts
