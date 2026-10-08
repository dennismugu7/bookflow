<#
  Shared steps of the laptop APK builds: build-debug-apk.ps1 (ops 03) and build-release-apk.ps1
  (ops 04, and the Play bundle with -Bundle, ops 05). No secrets pass through here: the release key's password stays in the release script.
#>

function Fail([string]$message) {
  Write-Host "ERROR: $message" -ForegroundColor Red
  exit 1
}
function Step([string]$message) { Write-Host "==> $message" -ForegroundColor Cyan }

function Get-AndroidSdk {
  if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
}

# The newest installed build-tools folder (apksigner, aapt).
function Get-BuildTools {
  $sdk = Get-AndroidSdk
  $dirs = Get-ChildItem (Join-Path $sdk 'build-tools') -Directory |
    Sort-Object { try { [version]$_.Name } catch { [version]'0.0' } } -Descending
  if (-not $dirs) { Fail "No Android build-tools in $sdk." }
  $dirs[0].FullName
}

<#
  Checks JDK 17, the Android SDK, node, git, google-services.json and the Supabase public values.
  Returns @{ Missing = <messages>; SupabaseUrl; SupabaseAnonKey } (the values filled from gh
  repository variables when not passed).
#>
function Test-ApkPrerequisites([string]$GoogleServices, [string]$SupabaseUrl, [string]$SupabaseAnonKey) {
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

  $sdk = Get-AndroidSdk
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

  @{ Missing = $missing; SupabaseUrl = $SupabaseUrl; SupabaseAnonKey = $SupabaseAnonKey }
}

function Show-MissingAndExit([string[]]$missing) {
  if ($missing.Count -eq 0) { return }
  Write-Host 'Missing prerequisites:' -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}

# The public Google web client ID: the passed value, else the GOOGLE_WEB_CLIENT_ID repository variable.
function Resolve-GoogleWebClientId([string]$GoogleWebClientId) {
  if (-not $GoogleWebClientId -and (Get-Command gh -ErrorAction SilentlyContinue)) {
    # A missing variable is handled by the caller; Windows PowerShell treats gh's stderr as an error.
    try { $GoogleWebClientId = (& gh variable get GOOGLE_WEB_CLIENT_ID 2>$null) } catch { $GoogleWebClientId = $null }
  }
  $GoogleWebClientId
}

# Short commit, with a note when apps/owner has uncommitted changes.
function Get-BuildSha([string]$ownerDir) {
  $sha = (& git -C $ownerDir rev-parse --short HEAD).Trim()
  $dirty = (& git -C $ownerDir status --porcelain -- .) -ne $null
  if ($dirty) { Write-Host 'Note: apps/owner has uncommitted changes; they are included in this build.' -ForegroundColor Yellow }
  $sha
}

# Sets process environment variables for this build; returns the previous values for Restore-BuildEnv.
function Set-BuildEnv([hashtable]$values) {
  $saved = @{}
  foreach ($name in $values.Keys) {
    $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    [Environment]::SetEnvironmentVariable($name, $values[$name], 'Process')
  }
  $saved
}
function Restore-BuildEnv([hashtable]$saved) {
  foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
}

function Invoke-Prebuild([string]$ownerDir) {
  Step 'expo prebuild --platform android --clean'
  # Prebuild rewrites package.json's "android" script; put the committed file back afterwards.
  $packageJson = Join-Path $ownerDir 'package.json'
  $packageJsonBefore = [IO.File]::ReadAllBytes($packageJson)
  try {
    & npx expo prebuild --platform android --clean --no-install
    $prebuildExit = $LASTEXITCODE
  } finally {
    [IO.File]::WriteAllBytes($packageJson, $packageJsonBefore)
  }
  if ($prebuildExit -ne 0) { Fail 'expo prebuild failed.' }
}

# Metro caches each file's transform with the EXPO_PUBLIC_* values inlined, and doesn't notice
# when only a value changes: a build without the Google client ID left it out of later builds too.
function Clear-MetroCache {
  $metroCache = Join-Path ([IO.Path]::GetTempPath()) 'metro-cache'
  if (Test-Path $metroCache) {
    Step 'Clearing the Metro cache'
    Remove-Item -Recurse -Force $metroCache
  }
}

function Invoke-Gradle([string]$ownerDir, [string[]]$arguments) {
  Step "gradlew $($arguments[0])"
  Push-Location (Join-Path $ownerDir 'android')
  try {
    & .\gradlew.bat @arguments --console=plain
    if ($LASTEXITCODE -ne 0) { Fail "gradlew $($arguments[0]) failed." }
  } finally { Pop-Location }
}

# Copies the APK (or AAB, with -Label 'AAB') to $outDir as $name and prints its path and size;
# returns the new path.
function Copy-Apk([string]$apk, [string]$outDir, [string]$name, [string]$Label = 'APK') {
  if (-not (Test-Path $apk)) { Fail "No $Label at $apk." }
  New-Item -ItemType Directory -Force $outDir | Out-Null
  $target = Join-Path $outDir $name
  Copy-Item $apk $target -Force
  $sizeMb = [math]::Round((Get-Item $target).Length / 1MB, 1)
  Step 'Done'
  Write-Host "$($Label):  $target"
  Write-Host "Size: $sizeMb MB"
  $target
}

# Stops when a Google web client ID was passed in but isn't in the APK's JS bundle. For an AAB,
# pass -EntryPath 'base/assets/index.android.bundle'.
function Assert-GoogleClientIdInBundle([string]$apk, [string]$GoogleWebClientId, [string]$EntryPath = 'assets/index.android.bundle') {
  # The client ID is public, but only its start is printed: enough to tell which one is inside.
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [IO.Compression.ZipFile]::OpenRead($apk)
  try {
    $entry = $zip.GetEntry($EntryPath)
    if (-not $entry) { Fail "No embedded JS bundle ($EntryPath)." }
    $reader = New-Object IO.StreamReader($entry.Open(), [Text.Encoding]::GetEncoding('ISO-8859-1'))
    try { $bundle = $reader.ReadToEnd() } finally { $reader.Dispose() }
  } finally { $zip.Dispose() }
  $found = [regex]::Match($bundle, '\d{6,}-[a-z0-9]+\.apps\.googleusercontent\.com')
  if ($found.Success) {
    Write-Host "Google web client ID in the bundle: $($found.Value.Substring(0, 17))..."
  } elseif ($GoogleWebClientId) {
    Fail 'The Google web client ID was passed in but is not in the bundle (stale Metro cache?).'
  } else {
    Write-Host 'Google web client ID in the bundle: none (Google sign-in will say it is not set up).' -ForegroundColor Yellow
  }
}

Export-ModuleMember -Function Fail, Step, Get-AndroidSdk, Get-BuildTools, Test-ApkPrerequisites, Show-MissingAndExit,
  Resolve-GoogleWebClientId, Get-BuildSha, Set-BuildEnv, Restore-BuildEnv, Invoke-Prebuild, Clear-MetroCache,
  Invoke-Gradle, Copy-Apk, Assert-GoogleClientIdInBundle
