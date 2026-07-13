param(
  [ValidateSet("Windows", "Android")]
  [string]$Target = "Windows"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$project = Join-Path $root "unity\ChakravartiAction"
$version = "6000.5.3f1"
$candidates = @(
  (Join-Path $env:USERPROFILE "Unity\Hub\Editor\$version\Editor\Unity.exe"),
  "C:\Program Files\Unity\Hub\Editor\$version\Editor\Unity.exe"
)
$candidates += (
  Join-Path $env:USERPROFILE "Unity\Hub\Editor\6000.3.19f1\Editor\Unity.exe"
)
$unity = $null
foreach ($candidate in $candidates) {
  if (!(Test-Path $candidate)) {
    continue
  }
  & $candidate -version *> $null
  if ($LASTEXITCODE -eq 0) {
    $unity = $candidate
    break
  }
}
if (!$unity) {
  throw "Unity $version was not found. Install it through Unity Hub first."
}

$buildProject = $project
$compatibilityProject = $null
if ($unity -like "*6000.3.19f1*") {
  $compatibilityProject = Join-Path $env:TEMP "ChakravartiAction-6000.3-$($Target.ToLowerInvariant())"
  if (Test-Path $compatibilityProject) {
    Remove-Item $compatibilityProject -Recurse -Force
  }
  New-Item -ItemType Directory -Path $compatibilityProject | Out-Null
  Copy-Item `
    (Join-Path $project "Assets"), `
    (Join-Path $project "Packages"), `
    (Join-Path $project "ProjectSettings") `
    -Destination $compatibilityProject `
    -Recurse `
    -Force
  Remove-Item `
    (Join-Path $compatibilityProject "Assets\Editor\UnityMcpAutoConnect.cs"), `
    (Join-Path $compatibilityProject "Assets\Editor\UnityMcpAutoConnect.cs.meta") `
    -Force `
    -ErrorAction SilentlyContinue

  $manifestPath = Join-Path $compatibilityProject "Packages\manifest.json"
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
  $manifest.dependencies.PSObject.Properties.Remove("com.coplaydev.unity-mcp")
  $manifest.dependencies."com.unity.ugui" = "2.0.0"
  $manifest |
    ConvertTo-Json -Depth 20 |
    Set-Content $manifestPath -Encoding utf8NoBOM
  Remove-Item `
    (Join-Path $compatibilityProject "Packages\packages-lock.json") `
    -Force `
    -ErrorAction SilentlyContinue
  @"
m_EditorVersion: 6000.3.19f1
m_EditorVersionWithRevision: 6000.3.19f1 (7689f4515d75)
"@ | Set-Content `
    (Join-Path $compatibilityProject "ProjectSettings\ProjectVersion.txt") `
    -Encoding utf8NoBOM
  $buildProject = $compatibilityProject
}

$method = if ($Target -eq "Android") {
  "Chakravarti.Action.Editor.BuildAutomation.BuildAndroid"
}
else {
  "Chakravarti.Action.Editor.BuildAutomation.BuildWindows"
}
$log = Join-Path $buildProject "Logs\build-$($Target.ToLowerInvariant()).log"
New-Item -ItemType Directory -Path (Split-Path $log) -Force | Out-Null

& $unity `
  -batchmode `
  -nographics `
  -quit `
  -projectPath $buildProject `
  -executeMethod $method `
  -logFile $log

if ($LASTEXITCODE -ne 0) {
  Get-Content $log -Tail 160
  throw "Unity $Target build failed with exit code $LASTEXITCODE."
}

Get-Content $log -Tail 40

if ($compatibilityProject) {
  $sourceOutput = Join-Path $compatibilityProject "Builds\$Target"
  $targetOutput = Join-Path $project "Builds\$Target"
  if (Test-Path $targetOutput) {
    Remove-Item $targetOutput -Recurse -Force
  }
  Copy-Item $sourceOutput $targetOutput -Recurse -Force
}
