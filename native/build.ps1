$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$RepoName = "disk-usage-mcp"
$Triple = "x86_64-pc-windows-msvc"
$ResourceDir = "$PSScriptRoot\resources"
$DevDir = "$PSScriptRoot\binaries"
New-Item -ItemType Directory -Force -Path $ResourceDir, $DevDir | Out-Null

Write-Host "=== ${RepoName} Tauri Release Build ===" -ForegroundColor Cyan

# Naked `bun` inherits whatever PATH the invoking shell happened to have,
# which can predate bun's installer PATH registration in an already-open
# shell (BUG-045). Resolve a qualified path once instead.
$bunExe = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"
if (-not (Test-Path $bunExe)) { $bunExe = (Get-Command bun -ErrorAction SilentlyContinue).Source }
if (-not $bunExe) { throw "bun not found — install from https://bun.sh" }

# Step 1: Frontend build
$frontend = Join-Path $Root "web_sota"
if (Test-Path "$frontend\package.json") {
    Write-Host "-> [1/4] Building frontend..." -ForegroundColor Yellow
    Push-Location $frontend
    & $bunExe install 2>$null
    & $bunExe run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    Pop-Location
}

# Step 2: PyInstaller backend
Write-Host "-> [2/4] PyInstaller backend..." -ForegroundColor Yellow
$specFile = "$Root\${RepoName}-backend.spec"
if (Test-Path $specFile) {
    $entryFile = "$Root\run_server.py"
    if (-not (Test-Path $entryFile)) {
        throw "run_server.py not found at $entryFile"
    }
    Push-Location $Root
    $pyiExe = "$Root\.venv\Scripts\pyinstaller.exe"
    if (-not (Test-Path $pyiExe)) {
        Write-Host "  Installing pyinstaller..." -ForegroundColor Yellow
        uv add --dev pyinstaller
        $pyiExe = "$Root\.venv\Scripts\pyinstaller.exe"
    }
    Remove-Item "$Root\dist\${RepoName}-backend.exe" -Force -ErrorAction SilentlyContinue
    & $pyiExe "$specFile" --clean --noconfirm
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }

    $frozenExe = "$Root\dist\${RepoName}-backend.exe"
    if (Test-Path $frozenExe) {
        $sizeMB = (Get-Item $frozenExe).Length / 1MB
        $sizeRound = [math]::Round($sizeMB, 1)
        if ($sizeMB -lt 5) { throw "Backend exe is only ${sizeRound} MB" }
        Write-Host "  Backend exe: ${sizeRound} MB" -ForegroundColor Green
    }
}

# Step 3: Embed in Tauri resources
Write-Host "-> [3/4] Embedding backend..." -ForegroundColor Yellow
$src = "$Root\dist\${RepoName}-backend.exe"
if (Test-Path $src) {
    Copy-Item $src "$ResourceDir\${RepoName}-backend.exe" -Force
    Copy-Item $src "$DevDir\${RepoName}-backend-$Triple.exe" -Force
}

$envExample = "$Root\.env.example"
if (Test-Path $envExample) {
    Copy-Item $envExample "$ResourceDir\.env.example" -Force
}

# Step 4: Tauri NSIS bundle
Write-Host "-> [4/4] Tauri NSIS bundle..." -ForegroundColor Yellow
Push-Location $PSScriptRoot
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
npx @tauri-apps/cli build --bundles nsis
if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }
Pop-Location

$distDir = Join-Path $Root "dist"
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
$nsisDir = "$PSScriptRoot\target\release\bundle\nsis"
if (Test-Path $nsisDir) {
    Copy-Item "$nsisDir\*-setup.exe" "$distDir\" -Force
}

Write-Host "=== Build complete ===" -ForegroundColor Green
Write-Host "Ship: $nsisDir\*.exe"
