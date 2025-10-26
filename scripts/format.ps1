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

# 1) Run Prettier (prefer local, fallback to dlx)
if (Test-Path (Join-Path $repo "package.json")) {
  $hasLocal = Test-Path (Join-Path $repo "node_modules\.bin\prettier")
  if ($hasLocal) {
    RunStep "Prettier" "pnpm prettier --write ."
  } else {
    RunStep "Prettier (dlx)" "pnpm dlx prettier --write ."
  }
} else {
  Write-Host "package.json not found - skipping Prettier" -ForegroundColor Yellow
}

# 2) Run ESLint autofix only if config exists
if (Test-Path (Join-Path $repo ".eslintrc.cjs")) {
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
