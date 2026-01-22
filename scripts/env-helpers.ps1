param(
    [string]$EnvPath = ".env.local",
    [switch]$SelfTest
)

function Get-EnvContent {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Environment file '$Path' not found."
    }

    return Get-Content $Path -Raw
}

function Get-EnvValue {
    param(
        [string]$Content,
        [string]$Key
    )

    $escapedKey = [regex]::Escape($Key)
    $pattern = "^\s*$escapedKey\s*=\s*(?<value>.+)$"
    $match = [regex]::Match($Content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)

    if ($match.Success) {
        return $match.Groups["value"].Value.Trim(" `"'")
    }

    return $null
}

function Build-FirebaseMapping {
    param([string]$Content)

    $keys = @(
        "FIREBASE_API_KEY",
        "FIREBASE_AUTH_DOMAIN",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_APP_ID",
        "FIREBASE_MESSAGING_SENDER_ID",
        "FIREBASE_MEASUREMENT_ID"
    )

    $result = [ordered]@{}

    foreach ($key in $keys) {
        $value = Get-EnvValue -Content $Content -Key $key
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            $result[$key] = $value
            $result["NEXT_PUBLIC_$key"] = $value
        }
    }

    return $result
}

function Show-EnvMapping {
    param([hashtable]$Mapping)

    foreach ($entry in $Mapping.GetEnumerator()) {
        Write-Output "$($entry.Key)=$($entry.Value)"
    }
}

if ($SelfTest.IsPresent) {
    $example = @"
FIREBASE_PROJECT_ID=local_foo_01
FIREBASE_API_KEY=abc123
NEXT_PUBLIC_FIREBASE_API_KEY=old_value
"@
    $mapping = Build-FirebaseMapping -Content $example

    if (
        $mapping["FIREBASE_PROJECT_ID"] -ne "local_foo_01" -or
        $mapping["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] -ne "local_foo_01" -or
        $mapping["FIREBASE_API_KEY"] -ne "abc123" -or
        $mapping["NEXT_PUBLIC_FIREBASE_API_KEY"] -ne "abc123"
    ) {
        throw "Env parser regression detected."
    }

    Write-Host "Self-test: underscores preserved and NEXT_PUBLIC mappings appended."
    return
}

$content = Get-EnvContent -Path $EnvPath
$mapping = Build-FirebaseMapping -Content $content
Show-EnvMapping -Mapping $mapping
