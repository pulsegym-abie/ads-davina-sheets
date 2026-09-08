# Deploy data baru untuk Ads Performance (Davina Sheets)
# Pakai: .\deploy-data.ps1 "data: tambah laporan September 2026"
#
# Urutan: npm run generate:data (di front/) -> git add -> git commit -> git push (di root repo)
# Setelah push, Vercel auto-rebuild.

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Write-Host "==> Generate data (npm run generate:data)" -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot "front")
try {
    npm run generate:data
    if ($LASTEXITCODE -ne 0) { throw "generate:data gagal (exit code $LASTEXITCODE)" }
}
finally {
    Pop-Location
}

Push-Location $repoRoot
try {
    Write-Host "==> git add -A" -ForegroundColor Cyan
    git add -A

    $staged = git diff --cached --name-only
    if (-not $staged) {
        Write-Host "Tidak ada perubahan untuk di-commit. Selesai." -ForegroundColor Yellow
        return
    }

    Write-Host "==> git commit -m `"$Message`"" -ForegroundColor Cyan
    git commit -m "$Message"
    if ($LASTEXITCODE -ne 0) { throw "git commit gagal (exit code $LASTEXITCODE)" }

    Write-Host "==> git push" -ForegroundColor Cyan
    git push
    if ($LASTEXITCODE -ne 0) { throw "git push gagal (exit code $LASTEXITCODE)" }

    Write-Host "==> Selesai. Vercel akan auto-rebuild." -ForegroundColor Green
}
finally {
    Pop-Location
}
