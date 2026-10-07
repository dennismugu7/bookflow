<#
.SYNOPSIS
  Builds a release APK of Bookflow on this laptop, signed with Dennis's release key
  (docs/specs/ops-04-release-apk.md).

.DESCRIPTION
  assembleRelease: not debuggable, minified, JS bundle embedded, no dev client or dev menu. Same
  app ID (com.mugulabs.bookflow) and version as app.json, OTA updates on the "preview" channel like
  the EAS preview APK. No Expo cloud. See docs/testing/release-apk.md.

  The keystore's password is asked for at run time (or read from BOOKFLOW_KEYSTORE_PASSWORD if you
  set it yourself in this window). It is handed to Gradle through process environment variables,
  never on a command line or in a file, and cleared at the end. The key password is the same as the
  keystore password (PKCS12). The APK must verify with the release key's SHA-1, or the script stops.

  Supabase's public values, the Google web client ID and google-services.json come in as for the
  debug APK (build-debug-apk.ps1).

.EXAMPLE
  pnpm --filter owner build:release-apk
.EXAMPLE
  powershell -File apps/owner/scripts/build-release-apk.ps1 -VersionCode 4
#>
param(
  [string]$Keystore = 'C:\Users\denni\secrets\bookflow-release.p12',
  [string]$KeyAlias = 'bookflow',
  # Never lower than the newest EAS build (3): Android won't install a lower versionCode over it.
  [ValidateRange(3, 2100000000)]
  [int]$VersionCode = 3,
  [string]$GoogleServices = $(if ($env:BOOKFLOW_GOOGLE_SERVICES_JSON) { $env:BOOKFLOW_GOOGLE_SERVICES_JSON } else { 'C:\Users\denni\secrets\google-services.json' }),
  [string]$SupabaseUrl = $env:EXPO_PUBLIC_SUPABASE_URL,
  [string]$SupabaseAnonKey = $env:EXPO_PUBLIC_SUPABASE_ANON_KEY,
  [string]$GoogleWebClientId = $env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  [string]$OutDir = $(if ($env:BOOKFLOW_BUILDS_DIR) { $env:BOOKFLOW_BUILDS_DIR } else { 'C:\Users\denni\builds' })
)

$ErrorActionPreference = 'Stop'
$ownerDir = Split-Path -Parent $PSScriptRoot
Import-Module (Join-Path $PSScriptRoot 'apk-common.psm1') -Force

# The release key's certificate (public). Registered as the Android OAuth client in Google Cloud.
$ExpectedSha1 = 'F2:D1:7D:B2:41:BC:67:03:8C:F9:1B:40:5B:C4:59:F6:EA:8F:97:69'
$PackageName = 'com.mugulabs.bookflow'

function Normalize-Sha1([string]$value) { ($value -replace '[^0-9A-Fa-f]', '').ToUpperInvariant() }

# Runs a native tool and returns its output with stderr merged; Windows PowerShell would otherwise
# stop on the first stderr line (keytool and apksigner print warnings there).
function Invoke-Native([string]$exe, [string[]]$arguments) {
  $ErrorActionPreference = 'Continue'
  & $exe @arguments 2>&1 | ForEach-Object { "$_" }
}

# 1. Prerequisites --------------------------------------------------------------------------------
Step 'Checking prerequisites'
$check = Test-ApkPrerequisites $GoogleServices $SupabaseUrl $SupabaseAnonKey
$missing = $check.Missing
$SupabaseUrl = $check.SupabaseUrl
$SupabaseAnonKey = $check.SupabaseAnonKey
if (-not (Test-Path $Keystore)) { $missing += "Release keystore not found at $Keystore (pass -Keystore)." }
if (-not (Get-Command keytool -ErrorAction SilentlyContinue)) { $missing += 'keytool is not on PATH (it comes with JDK 17).' }
Show-MissingAndExit $missing

$GoogleWebClientId = Resolve-GoogleWebClientId $GoogleWebClientId
if (-not $GoogleWebClientId) {
  Fail 'No Google web client ID: pass -GoogleWebClientId, set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, or sign in to gh to read the GOOGLE_WEB_CLIENT_ID repository variable. A release APK needs Google sign-in.'
}

$buildTools = Get-BuildTools
$apksigner = Join-Path $buildTools 'apksigner.bat'
$aapt = Join-Path $buildTools 'aapt.exe'
if (-not (Test-Path $apksigner)) { Fail "apksigner not found in $buildTools." }
if (-not (Test-Path $aapt)) { Fail "aapt not found in $buildTools." }

$version = (Get-Content (Join-Path $ownerDir 'app.json') -Raw | ConvertFrom-Json).expo.version
$sha = Get-BuildSha $ownerDir
Write-Host "Bookflow $version release, versionCode $VersionCode, at $sha"

# 2. The password -----------------------------------------------------------------------------------
# Only ever in process environment variables (Gradle reads ORG_GRADLE_PROJECT_* as -P properties,
# keytool reads -storepass:env), never on a command line, in a file or on screen.
$passwordVar = 'BOOKFLOW_RELEASE_STOREPASS'
$signingProperty = 'ORG_GRADLE_PROJECT_android.injected.signing'
$secretVars = @($passwordVar, "$signingProperty.store.password", "$signingProperty.key.password")

function Clear-Secrets {
  foreach ($name in $secretVars) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
  if ($env:BOOKFLOW_KEYSTORE_PASSWORD) { Remove-Item Env:BOOKFLOW_KEYSTORE_PASSWORD }
}

$savedEnv = $null
Push-Location $ownerDir
try {
  if ($env:BOOKFLOW_KEYSTORE_PASSWORD) {
    Write-Host 'Using the keystore password from BOOKFLOW_KEYSTORE_PASSWORD.'
    [Environment]::SetEnvironmentVariable($passwordVar, $env:BOOKFLOW_KEYSTORE_PASSWORD, 'Process')
  } else {
    $secure = Read-Host "Password for $(Split-Path -Leaf $Keystore)" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      [Environment]::SetEnvironmentVariable($passwordVar, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr), 'Process')
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
      $secure.Dispose()
    }
  }

  # Check the password and the key now, not after a 10-minute build. Only the SHA-1 is printed.
  Step 'Checking the release key'
  $keyInfo = Invoke-Native keytool @('-list', '-v', '-keystore', $Keystore, '-alias', $KeyAlias, '-storepass:env', $passwordVar)
  if ($LASTEXITCODE -ne 0) { Fail "keytool could not open alias '$KeyAlias' in $Keystore (wrong password?)." }
  $keySha1Line = $keyInfo | Select-String 'SHA1:' | Select-Object -First 1
  $keySha1 = if ($keySha1Line) { ($keySha1Line.ToString() -split 'SHA1:')[1].Trim() } else { '' }
  $keyInfo = $null
  if ((Normalize-Sha1 $keySha1) -ne (Normalize-Sha1 $ExpectedSha1)) {
    Fail "The key '$KeyAlias' has SHA-1 $keySha1, not the release key's $ExpectedSha1."
  }
  Write-Host "Release key SHA-1: $keySha1"

  # 3. Prebuild with the release-APK flag -----------------------------------------------------------
  # Set for this build only; the previous values come back at the end.
  $savedEnv = Set-BuildEnv @{
    BOOKFLOW_RELEASE_APK             = '1'
    BOOKFLOW_VERSION_CODE            = "$VersionCode"
    GOOGLE_SERVICES_JSON             = (Resolve-Path $GoogleServices).Path
    EXPO_PUBLIC_SUPABASE_URL         = $SupabaseUrl
    EXPO_PUBLIC_SUPABASE_ANON_KEY    = $SupabaseAnonKey
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = $GoogleWebClientId
    CI                               = '1'
  }
  Invoke-Prebuild $ownerDir

  # 4. Gradle, signed through AGP's injected signing properties ---------------------------------------
  $password = [Environment]::GetEnvironmentVariable($passwordVar, 'Process')
  [Environment]::SetEnvironmentVariable("$signingProperty.store.password", $password, 'Process')
  [Environment]::SetEnvironmentVariable("$signingProperty.key.password", $password, 'Process')
  $password = $null
  Clear-MetroCache
  # --no-daemon: no Gradle process outlives this build holding the password in its environment.
  Invoke-Gradle $ownerDir @(
    'assembleRelease', '--no-daemon',
    "-Pandroid.injected.signing.store.file=$((Resolve-Path $Keystore).Path)",
    "-Pandroid.injected.signing.key.alias=$KeyAlias"
  )
  Clear-Secrets

  # 5. Verify ------------------------------------------------------------------------------------------
  $apk = Join-Path $ownerDir 'android\app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path $apk)) { Fail "No APK at $apk." }

  Step 'Verifying the signature'
  $certs = Invoke-Native $apksigner @('verify', '--print-certs', $apk)
  if ($LASTEXITCODE -ne 0) { $certs | Write-Host; Fail 'apksigner verify failed.' }
  $signers = @($certs | Select-String 'certificate SHA-1 digest:')
  if ($signers.Count -ne 1) { Fail "Expected one signer, found $($signers.Count)." }
  $apkSha1 = ($signers[0].ToString() -split 'digest:')[1].Trim()
  if ((Normalize-Sha1 $apkSha1) -ne (Normalize-Sha1 $ExpectedSha1)) {
    Fail "The APK is signed with SHA-1 $apkSha1, not the release key $ExpectedSha1."
  }

  $badging = Invoke-Native $aapt @('dump', 'badging', $apk)
  $packageLine = ($badging | Select-String '^package:' | Select-Object -First 1).ToString()
  if ($packageLine -notmatch "name='$([regex]::Escape($PackageName))'") { Fail "Wrong package: $packageLine" }
  if ($packageLine -notmatch "versionCode='$VersionCode'") { Fail "Wrong versionCode: $packageLine" }
  if ($packageLine -notmatch "versionName='$([regex]::Escape($version))'") { Fail "Wrong versionName: $packageLine" }
  if ($badging | Select-String 'application-debuggable') { Fail 'The APK is debuggable.' }

  Assert-GoogleClientIdInBundle $apk $GoogleWebClientId

  # 6. Copy out ----------------------------------------------------------------------------------------
  $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
  $null = Copy-Apk $apk $OutDir "bookflow-$version-release-$stamp-$sha.apk"
  Write-Host "versionCode: $VersionCode"
  Write-Host "Signed with SHA-1: $(($apkSha1 -replace '[^0-9A-Fa-f]', '').ToUpperInvariant() -replace '(..)(?!$)', '$1:') (verified)"
} finally {
  Clear-Secrets
  if ($savedEnv) { Restore-BuildEnv $savedEnv }
  Pop-Location
}
