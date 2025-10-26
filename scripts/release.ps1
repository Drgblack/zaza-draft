PARAM(
  [Parameter(Mandatory = $true)]
  [string]$Version
)
$ErrorActionPreference = "Stop"
if ($Version -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z\.-]+)?$') { throw "Version must be semver, e.g. 0.1.0 or 1.0.0-rc.1" }
$dirty = git status --porcelain
if ($dirty) { throw "Working tree not clean. Commit or stash changes first." }
$repo = (git rev-parse --show-toplevel)
$chlog = Join-Path $repo "docs\CHANGELOG.md"
$pkg   = Join-Path $repo "package.json"
if (-not (Test-Path $chlog)) { throw "Missing docs/CHANGELOG.md" }
$today = Get-Date -Format "yyyy-MM-dd"
$cl = Get-Content $chlog -Raw
$rxUnrel = [regex]'(?ms)^##\s*\[Unreleased\]\s*(?<body>.*?)(?=^\#\#\s*\[|\Z)'
$m = $rxUnrel.Match($cl); if (-not $m.Success) { throw "CHANGELOG missing '## [Unreleased]'" }
$unreleasedBody = ($m.Groups['body'].Value).Trim()
if (-not $unreleasedBody) {
  $unreleasedBody = @"
### Added
- 

### Changed
- 

### Fixed
- 

### Security
- 
"@
}
$newSection = "## [$Version] - $today`r`n$unreleasedBody`r`n"
$unreleasedTemplate = @"
## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 

### Security
- 
"@
$clUpdated = $cl
$clUpdated = [regex]::Replace($clUpdated, '(?ms)^##\s*\[Unreleased\]\s*.*?(?=^\#\#\s*\[|\Z)', $unreleasedTemplate.TrimEnd() + "`r`n`r`n")
$clUpdated = $clUpdated -replace '(^##\s*\[Unreleased\][\s\S]*?\r?\n\r?\n)', "`$1$newSection"
$clUpdated | Set-Content -Encoding UTF8 $chlog
if (Test-Path $pkg) {
  $json = Get-Content $pkg -Raw | ConvertFrom-Json
  $json.version = $Version
  $json | ConvertTo-Json -Depth 20 | Out-File -Encoding UTF8 $pkg
}
function RunStep($name, $cmd) { Write-Host "==> $name" -ForegroundColor Cyan; & $env:ComSpec /c $cmd | Out-Host; if ($LASTEXITCODE -ne 0) { throw "$name failed" } }
if (Test-Path (Join-Path $repo "pnpm-lock.yaml")) {
  RunStep "Install" "pnpm install --frozen-lockfile"
  RunStep "Lint" "pnpm lint"
  RunStep "Typecheck" "pnpm typecheck"
  RunStep "Test" "pnpm test"
  RunStep "Build" "pnpm build"
} else { Write-Host "No pnpm-lock.yaml found - skipping install/lint/test/build." -ForegroundColor Yellow }
git -C $repo add "docs/CHANGELOG.md"; if (Test-Path $pkg) { git -C $repo add "package.json" | Out-Null }
git -C $repo commit -m "chore(release): $Version"
git -C $repo tag -a "v$Version" -m "Release $Version"
git -C $repo push
git -C $repo push --tags
Write-Host "Release $Version complete." -ForegroundColor Green
