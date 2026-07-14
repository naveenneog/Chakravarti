param(
  [ValidateSet("Windows", "Android")]
  [string]$Target = "Windows"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$project = Join-Path $root "unity\ChakravartiAction"
$version = "6000.5.3f1"
$fallback = Join-Path $env:USERPROFILE "Unity\Hub\Editor\6000.3.19f1\Editor\Unity.exe"
$current = Join-Path $env:USERPROFILE "Unity\Hub\Editor\$version\Editor\Unity.exe"
$hubCurrent = "C:\Program Files\Unity\Hub\Editor\$version\Editor\Unity.exe"
$candidates = if ($Target -eq "Windows") {
  @($fallback, $current, $hubCurrent)
}
else {
  @($current, $hubCurrent, $fallback)
}
$unity = $candidates |
  Where-Object { (Test-Path $_ -PathType Leaf) -and ([System.IO.Path]::GetFileName($_) -ieq "Unity.exe") } |
  Select-Object -First 1
if (!$unity) {
  throw "A usable Unity $version editor executable was not found. Install it through Unity Hub first."
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
  $manifestJson = $manifest | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText(
    $manifestPath,
    $manifestJson,
    (New-Object System.Text.UTF8Encoding($false))
  )
  Remove-Item `
    (Join-Path $compatibilityProject "Packages\packages-lock.json") `
    -Force `
    -ErrorAction SilentlyContinue
  $projectVersion = @"
m_EditorVersion: 6000.3.19f1
m_EditorVersionWithRevision: 6000.3.19f1 (7689f4515d75)
"@
  [System.IO.File]::WriteAllText(
    (Join-Path $compatibilityProject "ProjectSettings\ProjectVersion.txt"),
    $projectVersion,
    (New-Object System.Text.UTF8Encoding($false))
  )
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

$arguments = @(
  "-batchmode",
  "-nographics",
  "-quit",
  "-projectPath", $buildProject,
  "-executeMethod", $method,
  "-logFile", $log
)
$process = Start-Process `
  -FilePath $unity `
  -WorkingDirectory (Split-Path $unity) `
  -ArgumentList $arguments `
  -Wait `
  -PassThru

if ($process.ExitCode -ne 0) {
  if (Test-Path $log) {
    Get-Content $log -Tail 160
  }
  throw "Unity $Target build failed with exit code $($process.ExitCode)."
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
