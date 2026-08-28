[CmdletBinding()]
param(
  [string]$ProjectRef = 'akdmobvbombhqvvglayn',
  [switch]$RunDatabaseTests
)

$ErrorActionPreference = 'Stop'
$mainProjectRef = 'akdmobvbombhqvvglayn'
$repositoryRoot = Split-Path -Parent $PSScriptRoot

if ($ProjectRef -ne $mainProjectRef) {
  throw "Projeto recusado: este procedimento foi definido exclusivamente para o banco principal $mainProjectRef."
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'Dependência ausente no PATH: npx'
}

Push-Location $repositoryRoot
try {
  Write-Host '1/3 Conferindo disponibilidade dos backups gerenciados...'
  & npx supabase backups list --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o estado dos backups.' }

  Write-Host '2/3 Conferindo alinhamento das migrations...'
  & npx supabase migration list --linked
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível comparar as migrations locais e remotas.' }

  if ($RunDatabaseTests) {
    Write-Host '3/3 Executando testes remotos transacionais de Storage, isolamento, sessões e retenção...'
    & npx supabase test db --linked supabase/tests/004_secure_storage_remote_smoke.sql supabase/tests/005_storage_permissions_isolation_remote.sql supabase/tests/006_sessions_retention_remote.sql
    if ($LASTEXITCODE -ne 0) { throw 'A validação transacional do banco principal falhou.' }
  } else {
    Write-Host '3/3 Testes remotos não solicitados; use -RunDatabaseTests quando Docker estiver disponível.'
  }
} finally {
  Pop-Location
}

Write-Host 'Prontidão de recuperação validada sem restaurar, limpar ou sobrescrever dados do banco principal.'
