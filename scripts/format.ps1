param(
  [switch]$NoCommit
)

$ErrorActionPreference = "Stop"

$repo = (git rev-parse --show-toplevel)

function RunStep($name, $cmd) {
  Write-Host "==> $name" -ForegroundColor Cyan
  & $env:ComSpec /c $cmd | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "$name failed" }
}

# 1) Run Prettier (docs, configs, source files)
if (Test-Path (Join-Path $repo "package.json")) {
  RunStep "Prettier" "pnpm prettier --write ."
} else {
  Write-Host "package.json not found - skipping Prettier" -ForegroundColor Yellow
}

# 2) Run ESLint autofix if available
if (Test-Path (Join-Path $repo ".eslintrc") -or (Test-Path (Join-Path $repo ".eslintrc.js"))) {
  RunStep "ESLint" "pnpm eslint . --fix"
}

# 3) Stage and commit unless suppressed
if (-not $NoCommit) {
  git -C $repo add -A
  $changes = git -C $repo diff --cached --name-only
  if ($changes) {
    git -C $repo commit -m "style: format code and docs"
    git -C $repo push
  } else {
    Write-Host "No formatting changes to commit." -ForegroundColor Green
  }
}
