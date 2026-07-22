param([switch]$Headless, [switch]$BackendOnly, [switch]$NoBrowser)
$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath
$BackendPort = 11114
$FrontendPort = 11115

# Port zombie clearing
Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# Start backend
$BackendJob = Start-Job -Name "backend" -ScriptBlock {
    param($Root, $Port)
    Set-Location $Root
    $env:MCP_PORT = "$Port"
    $env:MCP_HOST = "127.0.0.1"
    uv run python -m disk_usage_mcp.server
} -ArgumentList $ScriptRoot, $BackendPort

# Readiness poll
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) { break }
    } catch {}
    Start-Sleep 1
}

if ($BackendOnly) {
    Write-Host "Backend running on http://127.0.0.1:$BackendPort" -ForegroundColor Green
    while ($true) { Start-Sleep 10 }
}

# Start frontend
$WebRoot = Join-Path $ScriptRoot "web_sota"
$FrontendProcess = Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "vite --port $FrontendPort --host" -WorkingDirectory $WebRoot -PassThru

Start-Sleep 3

if (-not $Headless -and -not $NoBrowser) {
    Start-Process "http://127.0.0.1:$FrontendPort"
}

Write-Host "Backend: http://127.0.0.1:$BackendPort" -ForegroundColor Cyan
Write-Host "Frontend: http://127.0.0.1:$FrontendPort" -ForegroundColor Cyan

# Keep-alive
try {
    while ($true) {
        if ($BackendJob.State -eq "Completed" -or $BackendJob.State -eq "Failed") {
            Receive-Job $BackendJob
            break
        }
        Start-Sleep 2
    }
} finally {
    if (-not $FrontendProcess.HasExited) { $FrontendProcess.Kill() }
    Stop-Job $BackendJob -ErrorAction SilentlyContinue
    Remove-Job $BackendJob -ErrorAction SilentlyContinue
}
