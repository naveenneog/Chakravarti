param([string]$Version)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
if (!$Version) {
  $Version = (Get-Content "$root\package.json" -Raw | ConvertFrom-Json).version
}

$jdk21 = Get-ChildItem "C:\Program Files\Eclipse Adoptium\jdk-21*\bin\java.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($jdk21) {
  $env:JAVA_HOME = Split-Path (Split-Path $jdk21.FullName)
}
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

if (!(Test-Path "$root\android")) {
  Write-Host "Creating Capacitor Android project..."
  npx cap add android
  if ($LASTEXITCODE -ne 0) {
    throw "cap add android failed"
  }
}

npm run build
if ($LASTEXITCODE -ne 0) {
  throw "web build failed"
}

npx cap sync android
if ($LASTEXITCODE -ne 0) {
  throw "cap sync android failed"
}

& "$PSScriptRoot\apply_android_branding.ps1" -AndroidRoot "$root\android"

$manifest = "$root\android\app\src\main\AndroidManifest.xml"
$manifestText = Get-Content $manifest -Raw
if ($manifestText -notmatch 'android:screenOrientation=') {
  $manifestText = $manifestText -replace(
    'android:exported="true"',
    "android:exported=`"true`"`r`n            android:screenOrientation=`"portrait`""
  )
  [System.IO.File]::WriteAllText(
    $manifest,
    $manifestText,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

$gradle = "$root\android\app\build.gradle"
function Write-NoBom([string]$Path, [string]$Text) {
  [System.IO.File]::WriteAllText(
    $Path,
    $Text,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

$gradleText = (Get-Content $gradle -Raw).TrimStart([char]0xFEFF)
$gradleText = [regex]::Replace(
  $gradleText,
  'versionName "[^"]*"',
  ('versionName "{0}"' -f $Version)
)
$versionParts = $Version.Split(".")
$versionCode = (
  [int]$versionParts[0] * 10000 +
  [int]$versionParts[1] * 100 +
  [int]$versionParts[2]
)
$gradleText = [regex]::Replace(
  $gradleText,
  'versionCode \d+',
  ('versionCode {0}' -f $versionCode)
)
if ($gradleText -notmatch "signingConfig signingConfigs.getByName\('debug'\)") {
  $gradleText = $gradleText -replace(
    "(release\s*\{)",
    "`$1`r`n            signingConfig signingConfigs.getByName('debug')"
  )
}
Write-NoBom $gradle $gradleText

$localProperties = "$root\android\local.properties"
"sdk.dir=$($env:ANDROID_HOME -replace '\\','\\')" |
  Out-File -FilePath $localProperties -Encoding ascii

Push-Location "$root\android"
try {
  & .\gradlew.bat --no-daemon assembleRelease
  $buildExitCode = $LASTEXITCODE
}
finally {
  Pop-Location
}
if ($buildExitCode -ne 0) {
  throw "Gradle assembleRelease failed with exit code $buildExitCode"
}

$apk = Get-ChildItem "$root\android\app\build\outputs\apk\release\*.apk" |
  Select-Object -First 1
if (!$apk) {
  throw "Release APK not found."
}

$destination = "$root\Chakravarti-v$Version.apk"
Copy-Item $apk.FullName $destination -Force
$sizeMb = [Math]::Round((Get-Item $destination).Length / 1MB, 1)
Write-Host "Built $destination ($sizeMb MB), signed with the debug key."
