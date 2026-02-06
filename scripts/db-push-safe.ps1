$ErrorActionPreference = "Stop"

Write-Host "== Supabase Safe DB Push ==" -ForegroundColor Cyan

supabase --version | Out-Host

Write-Host "`n[1/3] Checking link + status..." -ForegroundColor Yellow
supabase status | Out-Host

Write-Host "`n[2/3] Showing target project ref (from supabase link)..." -ForegroundColor Yellow
if (Test-Path ".supabase\config.toml") {
  Get-Content ".supabase\config.toml" | Select-String "project_ref|project_id" | Out-Host
}
else {
  Write-Host "No .supabase/config.toml found. Did you run 'supabase link'?" -ForegroundColor Red
  exit 1
}

Write-Host "`n[3/3] Type YES to confirm DB push to REMOTE" -ForegroundColor Red
$confirm = Read-Host "Confirm"
if ($confirm -ne "YES") {
  Write-Host "Cancelled." -ForegroundColor Gray
  exit 0
}

Write-Host "`nRunning: supabase db push" -ForegroundColor Green
supabase db push

Write-Host "`nDone." -ForegroundColor Green
