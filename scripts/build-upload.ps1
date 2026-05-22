# ============================================================
# Script para gerar um .zip pronto para subir na Hostinger.
# Uso (PowerShell, na raiz do projeto):
#   powershell -ExecutionPolicy Bypass -File scripts\build-upload.ps1
#
# Gera: dist\colegio-app-YYYYMMDD-HHmm.zip
# Inclui apenas o que precisa estar no servidor.
# ============================================================

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$distDir = Join-Path $root "dist"
$stagingDir = Join-Path $distDir "staging-$timestamp"
$zipFile = Join-Path $distDir "colegio-app-$timestamp.zip"

if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }
if (Test-Path $stagingDir) { Remove-Item -Recurse -Force $stagingDir }
New-Item -ItemType Directory -Path $stagingDir | Out-Null

$include = @(
  "server.js",
  "package.json",
  "package-lock.json",
  "README.md",
  "DEPLOY.md",
  "UPLOAD-CHECKLIST.txt"
)
$includeDirs = @("src", "public", "database")

foreach ($file in $include) {
  $src = Join-Path $root $file
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination $stagingDir -Force
    Write-Host "  + $file"
  }
}
foreach ($dir in $includeDirs) {
  $src = Join-Path $root $dir
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination $stagingDir -Recurse -Force
    Write-Host "  + $dir/"
  }
}

# Limpar uploads para nao subir arquivos de teste
$uploadsClean = Join-Path $stagingDir "public\uploads"
if (Test-Path $uploadsClean) {
  Get-ChildItem -Path $uploadsClean -Force | Where-Object { $_.Name -ne ".gitkeep" } | Remove-Item -Recurse -Force
}

# Garantir que .gitkeep existe na pasta de uploads
$gitkeep = Join-Path $stagingDir "public\uploads\.gitkeep"
if (-not (Test-Path $gitkeep)) { New-Item -ItemType File -Path $gitkeep -Force | Out-Null }

if (Test-Path $zipFile) { Remove-Item -Force $zipFile }
Compress-Archive -Path "$stagingDir\*" -DestinationPath $zipFile

Remove-Item -Recurse -Force $stagingDir

$size = [math]::Round((Get-Item $zipFile).Length / 1MB, 2)
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Pronto: $zipFile" -ForegroundColor Green
Write-Host " Tamanho: $size MB" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Suba este .zip no Gerenciador de Arquivos da Hostinger,"
Write-Host "extraia dentro da pasta da sua aplicacao e siga DEPLOY.md."
