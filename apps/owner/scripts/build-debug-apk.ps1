<#
.SYNOPSIS
  Builds the testers' debug APK of Bookflow Owner on this laptop (docs/specs/ops-03-debug-apk.md).

.DESCRIPTION
  Debuggable, signed with the standard Android debug key, JS bundle embedded (opens without
  Metro), no expo-dev-client, no OTA updates, app ID com.mugulabs.bookflow. No Expo cloud, no
  release keystore. See docs/testing/debug-apk.md.

  Supabase's public URL and anon key come from -SupabaseUrl/-SupabaseAnonKey, else the
  EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables, else the GitHub
  repository variables SUPABASE_URL/SUPABASE_ANON_KEY (gh variable get). No .env file is read.

.EXAMPLE
  pnpm --filter owner build:debug-apk
.EXAMPLE
  powershell -File apps/owner/scripts/build-debug-apk.ps1 -GoogleServices D:\keys\google-services.json
#>
param(
  [string]$GoogleServices = $(if ($env:BOOKFLOW_GOOGLE_SERVICES_JSON) { $env:BOOKFLOW_GOOGLE_SERVICES_JSON } else { 'C:\Users\denni\secrets\google-services.json' }),
  [string]$SupabaseUrl = $env:EXPO_PUBLIC_SUPABASE_URL,
  [string]$SupabaseAnonKey = $env:EXPO_PUBLIC_SUPABASE_ANON_KEY,
  [string]$OutDir = $(if ($env:BOOKFLOW_BUILDS_DIR) { $env:BOOKFLOW_BUILDS_DIR } else { 'C:\Users\denni\builds' })
)

$ErrorActionPreference = 'Stop'
$ownerDir = Split-Path -Parent $PSScriptRoot

function Fail([string]$message) {
  Write-Host "ERROR: $message" -ForegroundColor Red
  exit 1
}
function Step([string]$message) { Write-Host "==> $message" -ForegroundColor Cyan }

# 1. Prerequisites --------------------------------------------------------------------------------
Step 'Checking prerequisites'
$missing = @()

$java = Get-Command java -ErrorAction SilentlyContinue
if (-not $java) {
  $missing += 'JDK 17: install Temurin 17 (https://adoptium.net) and put its bin folder on PATH.'
} else {
  # java -version writes to stderr.
  $javaVersion = (& cmd /c 'java -version 2>&1' | Select-Object -First 1)
  if ($javaVersion -notmatch '"17\.') {
    $missing += "JDK 17 is needed, found: $javaVersion. Set JAVA_HOME and PATH to a JDK 17."
  }
}

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
if (-not $sdk) {
  $missing += 'ANDROID_HOME is not set: point it at the Android SDK folder (e.g. C:\Android).'
} elseif (-not (Test-Path (Join-Path $sdk 'platforms'))) {
  $missing += "ANDROID_HOME ($sdk) has no 'platforms' folder: install an Android SDK platform with sdkmanager or Android Studio."
} elseif (-not (Test-Path (Join-Path $sdk 'build-tools'))) {
  $missing += "ANDROID_HOME ($sdk) has no 'build-tools' folder: install Android SDK build-tools."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += 'Node.js is not on PATH.' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { $missing += 'git is not on PATH.' }

if (-not (Test-Path $GoogleServices)) {
  $missing += "google-services.json not found at $GoogleServices (pass -GoogleServices or set BOOKFLOW_GOOGLE_SERVICES_JSON). Push won't work without it."
}

if (-not $SupabaseUrl -or -not $SupabaseAnonKey) {
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    if (-not $SupabaseUrl) { $SupabaseUrl = (& gh variable get SUPABASE_URL 2>$null) }
    if (-not $SupabaseAnonKey) { $SupabaseAnonKey = (& gh variable get SUPABASE_ANON_KEY 2>$null) }
  }
  if (-not $SupabaseUrl -or -not $SupabaseAnonKey) {
    $missing += 'Supabase URL and anon key: pass -SupabaseUrl/-SupabaseAnonKey, set EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY, or sign in to gh (gh auth login) to read the repository variables.'
  }
}

if ($missing.Count -gt 0) {
  Write-Host 'Missing prerequisites:' -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}

$version = (Get-Content (Join-Path $ownerDir 'app.json') -Raw | ConvertFrom-Json).expo.version
$sha = (& git -C $ownerDir rev-parse --short HEAD).Trim()
$dirty = (& git -C $ownerDir status --porcelain -- .) -ne $null
if ($dirty) { Write-Host 'Note: apps/owner has uncommitted changes; they are included in this build.' -ForegroundColor Yellow }
Write-Host "Bookflow Owner $version-debug at $sha"

# 2. Prebuild with the debug-APK flag ---------------------------------------------------------------
# Set for this build only; the previous values come back at the end.
$envNames = 'BOOKFLOW_DEBUG_APK', 'BOOKFLOW_DEBUG_SHA', 'GOOGLE_SERVICES_JSON', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'CI'
$savedEnv = @{}
foreach ($name in $envNames) { $savedEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$env:BOOKFLOW_DEBUG_APK = '1'
$env:BOOKFLOW_DEBUG_SHA = $sha
$env:GOOGLE_SERVICES_JSON = (Resolve-Path $GoogleServices).Path
$env:EXPO_PUBLIC_SUPABASE_URL = $SupabaseUrl
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY = $SupabaseAnonKey
$env:CI = '1'

Push-Location $ownerDir
try {
  Step 'expo prebuild --platform android --clean'
  & npx expo prebuild --platform android --clean --no-install
  if ($LASTEXITCODE -ne 0) { Fail 'expo prebuild failed.' }

  # 3. Gradle ----------------------------------------------------------------------------------------
  Step 'gradlew assembleDebug'
  Push-Location (Join-Path $ownerDir 'android')
  try {
    & .\gradlew.bat assembleDebug --console=plain
    if ($LASTEXITCODE -ne 0) { Fail 'gradlew assembleDebug failed.' }
  } finally { Pop-Location }

  # 4. Copy out --------------------------------------------------------------------------------------
  $apk = Join-Path $ownerDir 'android\app\build\outputs\apk\debug\app-debug.apk'
  if (-not (Test-Path $apk)) { Fail "No APK at $apk." }
  New-Item -ItemType Directory -Force $OutDir | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
  $target = Join-Path $OutDir "bookflow-owner-$version-debug-$stamp-$sha.apk"
  Copy-Item $apk $target -Force
  $sizeMb = [math]::Round((Get-Item $target).Length / 1MB, 1)
  Step 'Done'
  Write-Host "APK:  $target"
  Write-Host "Size: $sizeMb MB"
} finally {
  Pop-Location
  foreach ($name in $envNames) { [Environment]::SetEnvironmentVariable($name, $savedEnv[$name], 'Process') }
}
