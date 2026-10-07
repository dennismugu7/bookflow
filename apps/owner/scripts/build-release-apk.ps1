<#
.SYNOPSIS
  Builds a release APK of Bookflow on this laptop, signed with Dennis's release key
  (docs/specs/ops-04-release-apk.md). With -Bundle, builds the Google Play bundle (.aab) instead
  (docs/specs/ops-05-release-aab.md).

.DESCRIPTION
  assembleRelease: not debuggable, minified, JS bundle embedded, no dev client or dev menu. Same
  app ID (com.mugulabs.bookflow) and version as app.json, OTA updates on the "preview" channel like
  the EAS preview APK. No Expo cloud. See docs/testing/release-apk.md.

  -Bundle: bundleRelease with the same app config, but OTA updates on the "production" channel.
  -VersionCode is required and must be higher than every number in release-versions.json (Play
  rejects a repeated one); after a successful build the new number is recorded there.

  The keystore's password is asked for at run time (or read from BOOKFLOW_KEYSTORE_PASSWORD if you
  set it yourself in this window). It is handed to Gradle through process environment variables,
  never on a command line or in a file, and cleared at the end. The key password is the same as the
  keystore password (PKCS12). The APK or AAB must verify with the release key's SHA-1, or the
  script stops.

  Supabase's public values, the Google web client ID and google-services.json come in as for the
  debug APK (build-debug-apk.ps1).

.EXAMPLE
  pnpm --filter owner build:release-apk
.EXAMPLE
  powershell -File apps/owner/scripts/build-release-apk.ps1 -VersionCode 4
.EXAMPLE
  powershell -File apps/owner/scripts/build-release-apk.ps1 -Bundle -VersionCode 4
#>
param(
  [string]$Keystore = 'C:\Users\denni\secrets\bookflow-release.p12',
  [string]$KeyAlias = 'bookflow',
  # Never lower than the newest EAS build (3): Android won't install a lower versionCode over it.
  [ValidateRange(3, 2100000000)]
  [int]$VersionCode = 3,
  # The Google Play bundle (.aab) instead of the APK; needs -VersionCode.
  [switch]$Bundle,
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
# Play installs get only OTA updates published to "production"; the shared APK stays on "preview".
$Channel = if ($Bundle) { 'production' } else { 'preview' }
$releaseVersions = Join-Path $PSScriptRoot 'release-versions.cjs'

function Normalize-Sha1([string]$value) { ($value -replace '[^0-9A-Fa-f]', '').ToUpperInvariant() }

# Runs a native tool and returns its output with stderr merged; Windows PowerShell would otherwise
# stop on the first stderr line (keytool and apksigner print warnings there).
function Invoke-Native([string]$exe, [string[]]$arguments) {
  $ErrorActionPreference = 'Continue'
  & $exe @arguments 2>&1 | ForEach-Object { "$_" }
}

# 1. Prerequisites --------------------------------------------------------------------------------
Step 'Checking prerequisites'
if ($Bundle) {
  if (-not $PSBoundParameters.ContainsKey('VersionCode')) {
    Fail 'A Play bundle needs -VersionCode <n>, higher than every number in apps/owner/release-versions.json.'
  }
  $problem = Invoke-Native node @($releaseVersions, 'check', "$VersionCode")
  if ($LASTEXITCODE -ne 0) { Fail ($problem -join ' ') }
}
$check = Test-ApkPrerequisites $GoogleServices $SupabaseUrl $SupabaseAnonKey
$missing = $check.Missing
$SupabaseUrl = $check.SupabaseUrl
$SupabaseAnonKey = $check.SupabaseAnonKey
if (-not (Test-Path $Keystore)) { $missing += "Release keystore not found at $Keystore (pass -Keystore)." }
if (-not (Get-Command keytool -ErrorAction SilentlyContinue)) { $missing += 'keytool is not on PATH (it comes with JDK 17).' }
if ($Bundle -and -not (Get-Command jarsigner -ErrorAction SilentlyContinue)) { $missing += 'jarsigner is not on PATH (it comes with JDK 17).' }
Show-MissingAndExit $missing

$GoogleWebClientId = Resolve-GoogleWebClientId $GoogleWebClientId
if (-not $GoogleWebClientId) {
  Fail 'No Google web client ID: pass -GoogleWebClientId, set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, or sign in to gh to read the GOOGLE_WEB_CLIENT_ID repository variable. A release APK needs Google sign-in.'
}

$buildTools = Get-BuildTools
$apksigner = Join-Path $buildTools 'apksigner.bat'
$aapt = Join-Path $buildTools 'aapt.exe'
$aapt2 = Join-Path $buildTools 'aapt2.exe'
if (-not (Test-Path $apksigner)) { Fail "apksigner not found in $buildTools." }
if (-not (Test-Path $aapt)) { Fail "aapt not found in $buildTools." }
if ($Bundle -and -not (Test-Path $aapt2)) { Fail "aapt2 not found in $buildTools." }

$version = (Get-Content (Join-Path $ownerDir 'app.json') -Raw | ConvertFrom-Json).expo.version
$sha = Get-BuildSha $ownerDir
$kind = if ($Bundle) { 'Play bundle' } else { 'release' }
Write-Host "Bookflow $version $kind, versionCode $VersionCode, at $sha"

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

# The base module of an AAB as a proto-format APK (manifest and resources.pb at the root), which
# aapt2 can dump. Returns the temporary file's path.
function New-BaseModuleApk([string]$aab) {
  Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
  $target = Join-Path ([IO.Path]::GetTempPath()) "bookflow-base-$PID.apk"
  if (Test-Path $target) { Remove-Item -Force $target }
  $source = [IO.Compression.ZipFile]::OpenRead($aab)
  $out = [IO.Compression.ZipFile]::Open($target, 'Create')
  try {
    foreach ($pair in @(@('base/manifest/AndroidManifest.xml', 'AndroidManifest.xml'), @('base/resources.pb', 'resources.pb'))) {
      $entry = $source.GetEntry($pair[0])
      if (-not $entry) { Fail "The AAB has no $($pair[0])." }
      $from = $entry.Open()
      $to = $out.CreateEntry($pair[1]).Open()
      try { $from.CopyTo($to) } finally { $to.Dispose(); $from.Dispose() }
    }
  } finally { $out.Dispose(); $source.Dispose() }
  $target
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
  # Set for this build only; the previous values come back at the end. The APK always gets
  # "preview", even if BOOKFLOW_UPDATES_CHANNEL is set in this window.
  $savedEnv = Set-BuildEnv @{
    BOOKFLOW_RELEASE_APK             = '1'
    BOOKFLOW_VERSION_CODE            = "$VersionCode"
    BOOKFLOW_UPDATES_CHANNEL         = $Channel
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
  $task = if ($Bundle) { 'bundleRelease' } else { 'assembleRelease' }
  Invoke-Gradle $ownerDir @(
    $task, '--no-daemon',
    "-Pandroid.injected.signing.store.file=$((Resolve-Path $Keystore).Path)",
    "-Pandroid.injected.signing.key.alias=$KeyAlias"
  )
  Clear-Secrets

  if ($Bundle) {
    # 5. Verify the bundle -------------------------------------------------------------------------------
    $aab = Join-Path $ownerDir 'android\app\build\outputs\bundle\release\app-release.aab'
    if (-not (Test-Path $aab)) { Fail "No AAB at $aab." }

    Step 'Verifying the signature'
    $verify = Invoke-Native jarsigner @('-verify', '-verbose', '-certs', $aab)
    if ($LASTEXITCODE -ne 0 -or -not ($verify | Select-String -SimpleMatch 'jar verified.')) {
      $verify | Select-Object -Last 20 | Write-Host
      Fail 'jarsigner could not verify the AAB.'
    }
    if ($verify | Select-String 'jar is unsigned|unsigned entries') { Fail 'The AAB has unsigned entries.' }
    $certs = Invoke-Native keytool @('-printcert', '-jarfile', $aab)
    if ($LASTEXITCODE -ne 0) { $certs | Write-Host; Fail 'keytool could not read the AAB certificate.' }
    $signers = @($certs | Select-String '^Signer #')
    if ($signers.Count -ne 1) { Fail "Expected one signer, found $($signers.Count)." }
    $signedSha1 = (($certs | Select-String '^\s*SHA1:' | Select-Object -First 1).ToString() -split 'SHA1:')[1].Trim()
    if ((Normalize-Sha1 $signedSha1) -ne (Normalize-Sha1 $ExpectedSha1)) {
      Fail "The AAB is signed with SHA-1 $signedSha1, not the release key $ExpectedSha1."
    }

    $baseApk = New-BaseModuleApk $aab
    try {
      $badging = Invoke-Native $aapt2 @('dump', 'badging', $baseApk)
      if ($LASTEXITCODE -ne 0) { $badging | Write-Host; Fail 'aapt2 could not read the AAB manifest.' }
      $manifest = Invoke-Native $aapt2 @('dump', 'xmltree', '--file', 'AndroidManifest.xml', $baseApk)
    } finally { Remove-Item -Force $baseApk -ErrorAction SilentlyContinue }
    $built = $aab
    $bundleEntry = 'base/assets/index.android.bundle'
  } else {
    # 5. Verify the APK ----------------------------------------------------------------------------------
    $apk = Join-Path $ownerDir 'android\app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path $apk)) { Fail "No APK at $apk." }

    Step 'Verifying the signature'
    $certs = Invoke-Native $apksigner @('verify', '--print-certs', $apk)
    if ($LASTEXITCODE -ne 0) { $certs | Write-Host; Fail 'apksigner verify failed.' }
    $signers = @($certs | Select-String 'certificate SHA-1 digest:')
    if ($signers.Count -ne 1) { Fail "Expected one signer, found $($signers.Count)." }
    $signedSha1 = ($signers[0].ToString() -split 'digest:')[1].Trim()
    if ((Normalize-Sha1 $signedSha1) -ne (Normalize-Sha1 $ExpectedSha1)) {
      Fail "The APK is signed with SHA-1 $signedSha1, not the release key $ExpectedSha1."
    }

    $badging = Invoke-Native $aapt @('dump', 'badging', $apk)
    $built = $apk
    $bundleEntry = 'assets/index.android.bundle'
  }

  $packageLine = ($badging | Select-String '^package:' | Select-Object -First 1).ToString()
  if ($packageLine -notmatch "name='$([regex]::Escape($PackageName))'") { Fail "Wrong package: $packageLine" }
  if ($packageLine -notmatch "versionCode='$VersionCode'") { Fail "Wrong versionCode: $packageLine" }
  if ($packageLine -notmatch "versionName='$([regex]::Escape($version))'") { Fail "Wrong versionName: $packageLine" }
  if ($badging | Select-String 'application-debuggable') { Fail "The $(if ($Bundle) { 'AAB' } else { 'APK' }) is debuggable." }
  if ($Bundle) {
    # expo-updates reads the channel from this manifest value.
    $channelHeader = '{"expo-channel-name":"' + $Channel + '"}'
    if (-not ($manifest | Select-String -SimpleMatch $channelHeader)) { Fail "The AAB's update channel isn't $Channel." }
  }

  Assert-GoogleClientIdInBundle $built $GoogleWebClientId -EntryPath $bundleEntry

  # 6. Copy out ----------------------------------------------------------------------------------------
  $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
  if ($Bundle) {
    $null = Copy-Apk $built $OutDir "bookflow-$version-$VersionCode-play-$stamp-$sha.aab" -Label 'AAB'
  } else {
    $null = Copy-Apk $built $OutDir "bookflow-$version-release-$stamp-$sha.apk"
  }
  Write-Host "versionCode: $VersionCode"
  if ($Bundle) { Write-Host "Channel: $Channel" }
  Write-Host "Signed with SHA-1: $(($signedSha1 -replace '[^0-9A-Fa-f]', '').ToUpperInvariant() -replace '(..)(?!$)', '$1:') (verified)"

  if ($Bundle) {
    $recorded = Invoke-Native node @($releaseVersions, 'record', "$VersionCode", 'play-aab', $version, $sha)
    if ($LASTEXITCODE -ne 0) { $recorded | Write-Host; Fail 'Could not record the versionCode in release-versions.json.' }
    $recorded | Write-Host
    Write-Host 'Commit apps/owner/release-versions.json (through a PR) so the number is never used again.' -ForegroundColor Yellow
  }
} finally {
  Clear-Secrets
  if ($savedEnv) { Restore-BuildEnv $savedEnv }
  Pop-Location
}
