# Fleet local biome hook: runs `bun run biome:ci` in whichever web root exists.
$ErrorActionPreference = "Stop"
$roots = @("web_sota", "webapp", "webapp/frontend", "web", "web_sota/frontend") | Where-Object { Test-Path (Join-Path $PSScriptRoot ".." $_) }
if (-not $roots) { Write-Host "biome hook: no web root, skipping."; exit 0 }
foreach ($rel in $roots) {
  $dir = Join-Path (Join-Path $PSScriptRoot "..") $rel
  Push-Location $dir
  try {
    & bun run biome:ci
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
}
