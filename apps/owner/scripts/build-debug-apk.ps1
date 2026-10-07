<#
.SYNOPSIS
  Builds the testers' debug APK of Bookflow on this laptop (docs/specs/ops-03-debug-apk.md).

.DESCRIPTION
  Debuggable, signed with the standard Android debug key, JS bundle embedded (opens without
  Metro), no expo-dev-client, no OTA updates, app ID com.mugulabs.bookflow. No Expo cloud, no
  release keystore. See docs/testing/debug-apk.md.

  Supabase's public URL and anon key come from -SupabaseUrl/-SupabaseAnonKey, else the
  EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables, else the GitHub
  repository variables SUPABASE_URL/SUPABASE_ANON_KEY (gh variable get). No .env file is read.

  Signed with this laptop's Android debug key (-Keystore, default %USERPROFILE%\.android\debug.keystore),
  not the public key in Expo's template, so Google can tell it apart (release 1.0.0 part 2). Its SHA-1
  is printed at the end; register it on the Android OAuth client. Google sign-in needs the public web
  client ID: -GoogleWebClientId, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID or the GOOGLE_WEB_CLIENT_ID repository variable.

.EXAMPLE
  pnpm --filter owner build:debug-apk
.EXAMPLE
  powershell -File apps/owner/scripts/build-debug-apk.ps1 -GoogleServices D:\keys\google-services.json
#>
param(
  [string]$GoogleServices = $(if ($env:BOOKFLOW_GOOGLE_SERVICES_JSON) { $env:BOOKFLOW_GOOGLE_SERVICES_JSON } else { 'C:\Users\denni\secrets\google-services.json' }),
  [string]$SupabaseUrl = $env:EXPO_PUBLIC_SUPABASE_URL,
  [string]$SupabaseAnonKey = $env:EXPO_PUBLIC_SUPABASE_ANON_KEY,
  [string]$GoogleWebClientId = $env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  [string]$Keystore = (Join-Path $env:USERPROFILE '.android\debug.keystore'),
  [string]$OutDir = $(if ($env:BOOKFLOW_BUILDS_DIR) { $env:BOOKFLOW_BUILDS_DIR } else { 'C:\Users\denni\builds' })
)

$ErrorActionPreference = 'Stop'
$ownerDir = Split-Path -Parent $PSScriptRoot
Import-Module (Join-Path $PSScriptRoot 'apk-common.psm1') -Force

# 1. Prerequisites --------------------------------------------------------------------------------
Step 'Checking prerequisites'
$check = Test-ApkPrerequisites $GoogleServices $SupabaseUrl $SupabaseAnonKey
$missing = $check.Missing
$SupabaseUrl = $check.SupabaseUrl
$SupabaseAnonKey = $check.SupabaseAnonKey

if (-not (Test-Path $Keystore)) {
  $missing += "Android debug keystore not found at $Keystore (pass -Keystore). Create one with: keytool -genkeypair -v -keystore `"$Keystore`" -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname `"CN=Android Debug,O=Android,C=US`""
}
if (-not (Get-Command keytool -ErrorAction SilentlyContinue)) { $missing += 'keytool is not on PATH (it comes with JDK 17).' }
Show-MissingAndExit $missing

$GoogleWebClientId = Resolve-GoogleWebClientId $GoogleWebClientId
if (-not $GoogleWebClientId) {
  Write-Host 'Note: no Google web client ID (-GoogleWebClientId or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID); Google sign-in will say it is not set up.' -ForegroundColor Yellow
}

$version = (Get-Content (Join-Path $ownerDir 'app.json') -Raw | ConvertFrom-Json).expo.version
$sha = Get-BuildSha $ownerDir
Write-Host "Bookflow $version-debug at $sha"

# 2. Prebuild with the debug-APK flag ---------------------------------------------------------------
# Set for this build only; the previous values come back at the end.
$savedEnv = Set-BuildEnv @{
  BOOKFLOW_DEBUG_APK               = '1'
  BOOKFLOW_DEBUG_SHA               = $sha
  GOOGLE_SERVICES_JSON             = (Resolve-Path $GoogleServices).Path
  EXPO_PUBLIC_SUPABASE_URL         = $SupabaseUrl
  EXPO_PUBLIC_SUPABASE_ANON_KEY    = $SupabaseAnonKey
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = $GoogleWebClientId
  CI                               = '1'
}

Push-Location $ownerDir
try {
  Invoke-Prebuild $ownerDir

  # The template signs debug builds with its public key; use this laptop's instead.
  Copy-Item $Keystore (Join-Path $ownerDir 'android\app\debug.keystore') -Force

  # 3. Gradle ----------------------------------------------------------------------------------------
  Clear-MetroCache
  Invoke-Gradle $ownerDir @('assembleDebug')

  # 4. Copy out --------------------------------------------------------------------------------------
  $apk = Join-Path $ownerDir 'android\app\build\outputs\apk\debug\app-debug.apk'
  $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
  $target = Copy-Apk $apk $OutDir "bookflow-owner-$version-debug-$stamp-$sha.apk"
  $sha1 = (& keytool -list -v -keystore $Keystore -alias androiddebugkey -storepass android 2>$null | Select-String 'SHA1:').ToString().Trim()
  Write-Host "Signing key $sha1 (register it on the Android OAuth client for com.mugulabs.bookflow)"

  Assert-GoogleClientIdInBundle $target $GoogleWebClientId
} finally {
  Pop-Location
  Restore-BuildEnv $savedEnv
}
