# scripts/cleanup.ps1 — Clean up temporary test artifacts
Write-Host "🧹 Cleaning up BuildProp project folder..." -ForegroundColor Cyan

$root = Split-Path -Parent $PSScriptRoot

$tempFiles = @(
  "ai-context-test.ps1",
  "build_out2.txt",
  "build_output.txt",
  "build-output.txt",
  "build-output2.txt",
  "buildlog.txt",
  "debug-test.ps1",
  "full-test.ps1",
  "qa-full-test.ps1",
  "qa-test-v2.ps1",
  "qa-test.ps1",
  "test-results.txt",
  "CLAUDE.md",
  "build_output3.txt",
  "qa-final-results.txt",
  "qa-results.txt"
)

$count = 0
foreach ($file in $tempFiles) {
  $path = Join-Path $root $file
  if (Test-Path $path) {
    Remove-Item -Path $path -Force -ErrorAction SilentlyContinue
    Write-Host "  Deleted: $file" -ForegroundColor Gray
    $count++
  }
}

# Also clean dist-electron if it exists
$distElectron = Join-Path $root "dist-electron"
if (Test-Path $distElectron) {
  Remove-Item -Recurse -Force $distElectron -ErrorAction SilentlyContinue
  Write-Host "  Removed: dist-electron/" -ForegroundColor Gray
  $count++
}

Write-Host "`n✅ Cleaned up $count item(s)!" -ForegroundColor Green
