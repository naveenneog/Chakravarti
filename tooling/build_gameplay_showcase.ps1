param(
  [Parameter(Mandatory = $true)]
  [string]$Frames
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$output = Join-Path $root "public\media\gameplay"
$work = Join-Path $env:TEMP "chakravarti-showcase"
$font = "C\:/Windows/Fonts/segoeuib.ttf"

if (!(Test-Path (Join-Path $Frames "frame_0000.jpg"))) {
  throw "Gameplay frames were not found in $Frames."
}

New-Item -ItemType Directory -Path $output -Force | Out-Null
New-Item -ItemType Directory -Path $work -Force | Out-Null

$audio = Join-Path $work "showcase.wav"
python (Join-Path $PSScriptRoot "generate_showcase_audio.py") $audio --duration 10
if ($LASTEXITCODE -ne 0) {
  throw "Showcase soundtrack generation failed."
}

$base = Join-Path $work "showcase-base.mp4"
ffmpeg -y -hide_banner -loglevel error `
  -framerate 30 `
  -i (Join-Path $Frames "frame_%04d.jpg") `
  -i $audio `
  -filter_complex (
    "[0:v]scale=1280:720:force_original_aspect_ratio=decrease," +
    "pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black[v];" +
    "[1:a]volume=0.82[a]"
  ) `
  -map "[v]" `
  -map "[a]" `
  -t 10 `
  -c:v libx264 `
  -preset slow `
  -crf 20 `
  -pix_fmt yuv420p `
  -c:a aac `
  -b:a 160k `
  -movflags +faststart `
  $base
if ($LASTEXITCODE -ne 0) {
  throw "Clean gameplay master generation failed."
}

$main = Join-Path $output "unity-action-gameplay.mp4"
$titleFilter = (
  "drawbox=x=0:y=0:w=iw:h=108:color=black@0.92:t=fill," +
  "drawtext=fontfile='$font':text='CHAKRAVARTI  |  THE TIMBER GATE':" +
  "fontcolor=white:fontsize=38:x=46:y=26," +
  "drawtext=fontfile='$font':text='UNITY 6  |  MOBILE-FIRST ACTION':" +
  "fontcolor=white:fontsize=25:x=(w-text_w)/2:y=h-58:" +
  "box=1:boxcolor=black@0.9:boxborderw=12"
)

ffmpeg -y -hide_banner -loglevel error `
  -i $base `
  -vf $titleFilter `
  -c:v libx264 `
  -preset slow `
  -crf 21 `
  -pix_fmt yuv420p `
  -c:a copy `
  -movflags +faststart `
  $main
if ($LASTEXITCODE -ne 0) {
  throw "Landscape gameplay video generation failed."
}

function Build-Short(
  [string]$Name,
  [double]$Start,
  [double]$Duration,
  [string]$Heading,
  [string]$Footer
) {
  $destination = Join-Path $output $Name
  $filter = (
    "crop=405:720:(iw-405)/2:0," +
    "scale=720:1280,setsar=1," +
    "drawbox=x=0:y=0:w=iw:h=160:color=black@0.92:t=fill," +
    "drawtext=fontfile='$font':text='$Heading':" +
    "fontcolor=white:fontsize=54:x=(w-text_w)/2:y=42," +
    "drawbox=x=0:y=ih-190:w=iw:h=190:color=black@0.94:t=fill," +
    "drawtext=fontfile='$font':text='$Footer':" +
    "fontcolor=white:fontsize=27:x=(w-text_w)/2:y=h-112"
  )
  ffmpeg -y -hide_banner -loglevel error `
    -ss $Start `
    -i $base `
    -t $Duration `
    -vf $filter `
    -c:v libx264 `
    -preset slow `
    -crf 22 `
    -pix_fmt yuv420p `
    -c:a aac `
    -b:a 128k `
    -movflags +faststart `
    $destination
  if ($LASTEXITCODE -ne 0) {
    throw "Short generation failed: $Name"
  }
}

Build-Short `
  "unity-action-short-combat.mp4" `
  0.5 `
  7 `
  "SWORD CLASH" `
  "RIGGED COMBAT | HIT REACTIONS"

Build-Short `
  "unity-action-short-traversal.mp4" `
  3.0 `
  7 `
  "ROAD TO THE GATE" `
  "MOBILE-FIRST UNITY 6"

$posters = @(
  @{ Video = $main; Time = 3.5; Name = "unity-action-gameplay-poster.jpg" },
  @{
    Video = Join-Path $output "unity-action-short-combat.mp4"
    Time = 3.2
    Name = "unity-action-short-combat-poster.jpg"
  },
  @{
    Video = Join-Path $output "unity-action-short-traversal.mp4"
    Time = 3.2
    Name = "unity-action-short-traversal-poster.jpg"
  }
)

foreach ($poster in $posters) {
  ffmpeg -y -hide_banner -loglevel error `
    -ss $poster.Time `
    -i $poster.Video `
    -frames:v 1 `
    -q:v 2 `
    (Join-Path $output $poster.Name)
  if ($LASTEXITCODE -ne 0) {
    throw "Poster generation failed: $($poster.Name)"
  }
}

Get-ChildItem $output -File |
  Select-Object Name, Length |
  Format-Table -AutoSize
