$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$RepoName = "disk-usage-mcp"
$Triple = "x86_64-pc-windows-msvc"
$ResourceDir = "$PSScriptRoot\resources"
$DevDir = "$PSScriptRoot\binaries"
New-Item -ItemType Directory -Force -Path $ResourceDir, $DevDir | Out-Null

Write-Host "=== ${RepoName} Tauri Release Build ===" -ForegroundColor Cyan

# Step 1: Frontend build
$frontend = Join-Path $Root "web_sota"
if (Test-Path "$frontend\package.json") {
    Write-Host "-> [1/4] Building frontend..." -ForegroundColor Yellow
    Push-Location $frontend
    bun install 2>$null
    bun run build
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
    }
    Remove-Item "$Root\dist\${RepoName}-backend.exe" -Force -ErrorAction SilentlyContinue
    & $pyiExe "$specFile" --clean --noconfirm
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }

    $frozenExe = "$Root\dist\${RepoName}-backend.exe"
    $sizeMB = (Get-Item $frozenExe).Length / 1MB
    if ($sizeMB -lt 5) { throw "Backend exe is only ${sizeMB} MB — PyInstaller produced broken binary" }
    Write-Host "  Backend exe: $([math]::Round($sizeMB, 1)) MB" -ForegroundColor Green
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
if (Test-Path $nsisDir) { Copy-Item "$nsisDir\*-setup.exe" "$distDir\" -Force }

Write-Host "=== Build complete ===" -ForegroundColor Green
Write-Host "Ship: $nsisDir\*.exe"
