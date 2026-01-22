# Parsing `.env` keys in PowerShell

We store several Firebase credentials inside `.env` files, and some automation scripts in this repo need to read those keys without exposing secrets or hitting `metadata.google.internal`. Older examples leaned on PCRE-style shortcuts such as `\Q...\E` to escape literal keys, but those sequences are **not supported** by the .NET regex engine that PowerShell uses.

Use `[regex]::Escape($key)` any time you interpolate an environment key into a pattern (especially keys with underscores or special characters). Otherwise the parser silently fails on `FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_API_KEY`, etc.

```powershell
$key     = "FIREBASE_PROJECT_ID"
$pattern = "^\s*$([regex]::Escape($key))\s*=\s*(?<value>.+)$"
$content = Get-Content .env.local -Raw
$match   = [regex]::Match($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
if ($match.Success) {
    $projectId = $match.Groups["value"].Value.Trim()
}
```

The `[regex]::Escape($key)` call turns `FIREBASE_PROJECT_ID` into a safe literal before the regex engine tries to parse it. It avoids runtime errors and ensures underscores stay intact.

## `scripts/env-helpers.ps1`

The helper script in this repo centralizes the regex logic plus the `NEXT_PUBLIC_FIREBASE_*` mirroring that the client bundle expects. Run it with:

```powershell
.\scripts\env-helpers.ps1 -EnvPath ".env.local"
```

It prints the `FIREBASE_*` keys it found along with `NEXT_PUBLIC_FIREBASE_*` equivalents that are guaranteed to match the same value. This leaves space to set server-only values while ensuring the client environment always stays in sync.

## Regression check

The script also ships with a small self-test so you can confirm it never regresses:

```powershell
.\scripts\env-helpers.ps1 -SelfTest
```

The test feeds a sample `.env` string containing underscored keys like `FIREBASE_PROJECT_ID`, verifies the parser still reads them, and checks that the corresponding `NEXT_PUBLIC_FIREBASE_*` entries are appended. If the test runs, you will see:

```
Self-test: underscores preserved and NEXT_PUBLIC mappings appended.
```

If it fails, the script throws an error and keeps you from accidentally breaking the parser again.
