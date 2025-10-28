<#
.SYNOPSIS
  Smoke-test protected Vercel previews with a protection-bypass token.

.PARAMETER BaseUrl
  Your preview URL, e.g. https://zaza-draft-...vercel.app (no trailing slash required)

.PARAMETER Token
  The Protection Bypass for Automation secret value you saved in Vercel settings.

.PARAMETER Mode
  How to pass the bypass token: 'header' (default) or 'cookie'

.PARAMETER Notes
  Notes text for the draft generator (defaults to a safe sample)

.PARAMETER Tone
  Tone label (e.g., warm | professional | direct | empathetic)

.PARAMETER Language
  ISO code (e.g., en, de)

.PARAMETER Dev
  Switch to send dev=true

.EXAMPLE
  pwsh scripts/vercel-bypass-smoke.ps1 -BaseUrl https://...vercel.app -Token $env:VERCEL_AUTOMATION_BYPASS_SECRET

.EXAMPLE
  pwsh scripts/vercel-bypass-smoke.ps1 -BaseUrl https://...vercel.app -Token $t -Mode cookie -Tone professional -Language en
#>

param(
  [Parameter(Mandatory=$true)] [string]$BaseUrl,
  [Parameter(Mandatory=$true)] [string]$Token,
  [ValidateSet('header','cookie')] [string]$Mode = 'header',
  [string]$Notes = "Student improving in group work; needs help starting writing.",
  [string]$Tone = "warm",
  [string]$Language = "en",
  [switch]$Dev
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# Compose common payload
$body = @{
  notes    = $Notes
  tone     = $Tone
  language = $Language
}
if ($Dev) { $body.dev = $true }
$json = $body | ConvertTo-Json -Depth 5

try {
  if ($Mode -eq 'cookie') {
    Write-Step "Setting bypass cookie"
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $cookieUrl = "$base/api/health?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=$Token"
    Invoke-WebRequest $cookieUrl -WebSession $session | Out-Null

    Write-Step "GET /api/health"
    $health = Invoke-RestMethod "$base/api/health" -WebSession $session
    $ok = $health.ok -eq $true
    if (-not $ok) { Fail "Health check returned: $($health | ConvertTo-Json -Depth 5)" }
    Write-Host "HEALTH OK" -ForegroundColor Green

    Write-Step "POST /api/draft/generate"
    $draft = Invoke-RestMethod -Method Post -Uri "$base/api/draft/generate" `
      -ContentType "application/json" -Body $json -WebSession $session

  } else {
    $hdr = @{ "x-vercel-protection-bypass" = $Token }

    Write-Step "GET /api/health"
    $health = Invoke-RestMethod "$base/api/health" -Headers $hdr
    $ok = $health.ok -eq $true
    if (-not $ok) { Fail "Health check returned: $($health | ConvertTo-Json -Depth 5)" }
    Write-Host "HEALTH OK" -ForegroundColor Green

    Write-Step "POST /api/draft/generate"
    $draft = Invoke-RestMethod -Method Post -Uri "$base/api/draft/generate" `
      -Headers $hdr -ContentType "application/json" -Body $json
  }

  Write-Host "DRAFT OK" -ForegroundColor Green
  # Print the important bits cleanly
  $summary = [PSCustomObject]@{
    opening_line       = $draft.opening_line
    main_comment       = $draft.main_comment
    closing_line       = $draft.closing_line
    tone               = $draft.tone
    safeguards_applied = ($draft.safeguards_applied -join ', ')
    language           = $draft.meta.language
    version            = $draft.meta.version
  }
  $summary | Format-List

  exit 0
}
catch {
  # Bubble up server error details (Ajv, auth, etc.)
  try {
    $resp = $_.Exception.Response
    if ($resp -and $resp.GetResponseStream()) {
      $reader = New-Object IO.StreamReader($resp.GetResponseStream())
      $text = $reader.ReadToEnd()
      Fail("HTTP $($resp.StatusCode.value__) — $text")
    } else {
      Fail($_.Exception.Message)
    }
  } catch {
    Fail($_.ToString())
  }
}
