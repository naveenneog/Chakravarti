param(
  [string]$AndroidRoot = (Join-Path (Split-Path $PSScriptRoot -Parent) "android")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$resRoot = Join-Path $AndroidRoot "app\src\main\res"
if (!(Test-Path $resRoot)) {
  throw "Android resources not found: $resRoot"
}

$background = [System.Drawing.ColorTranslator]::FromHtml("#F7F4EF")
$crimson = [System.Drawing.ColorTranslator]::FromHtml("#B11F4B")
$charcoal = [System.Drawing.ColorTranslator]::FromHtml("#242424")

function New-Canvas([int]$Width, [int]$Height, [System.Drawing.Color]$Color) {
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear($Color)
  return @($bitmap, $graphics)
}

function Draw-Wheel(
  [System.Drawing.Graphics]$Graphics,
  [float]$CenterX,
  [float]$CenterY,
  [float]$Radius,
  [System.Drawing.Color]$Color
) {
  $stroke = [Math]::Max(3, $Radius * 0.095)
  $pen = New-Object System.Drawing.Pen($Color, $stroke)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $Graphics.DrawEllipse(
    $pen,
    $CenterX - $Radius,
    $CenterY - $Radius,
    $Radius * 2,
    $Radius * 2
  )

  for ($index = 0; $index -lt 12; $index++) {
    $angle = ($index * 30) * [Math]::PI / 180
    $inner = $Radius * 0.22
    $outer = $Radius * 0.82
    $Graphics.DrawLine(
      $pen,
      $CenterX + [Math]::Cos($angle) * $inner,
      $CenterY + [Math]::Sin($angle) * $inner,
      $CenterX + [Math]::Cos($angle) * $outer,
      $CenterY + [Math]::Sin($angle) * $outer
    )
  }

  $brush = New-Object System.Drawing.SolidBrush($Color)
  $hub = $Radius * 0.2
  $Graphics.FillEllipse(
    $brush,
    $CenterX - $hub,
    $CenterY - $hub,
    $hub * 2,
    $hub * 2
  )
  $pen.Dispose()
  $brush.Dispose()
}

function Save-Launcher([string]$Path, [bool]$Transparent) {
  $existing = [System.Drawing.Image]::FromFile($Path)
  $width = $existing.Width
  $height = $existing.Height
  $existing.Dispose()

  $baseColor = if ($Transparent) {
    [System.Drawing.Color]::Transparent
  } else {
    $background
  }
  $canvas = New-Canvas $width $height $baseColor
  $bitmap = $canvas[0]
  $graphics = $canvas[1]
  $radiusScale = if ($Transparent) { 0.30 } else { 0.34 }
  $radius = [Math]::Min($width, $height) * $radiusScale
  Draw-Wheel $graphics ($width / 2) ($height / 2) $radius $crimson
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

function Save-Splash([string]$Path) {
  $existing = [System.Drawing.Image]::FromFile($Path)
  $width = $existing.Width
  $height = $existing.Height
  $existing.Dispose()

  $isDark = $Path -match "night"
  $baseColor = if ($isDark) {
    [System.Drawing.ColorTranslator]::FromHtml("#3D3B3A")
  } else {
    $background
  }
  $accentColor = if ($isDark) {
    [System.Drawing.ColorTranslator]::FromHtml("#FD8EA1")
  } else {
    $crimson
  }
  $textColor = if ($isDark) {
    [System.Drawing.ColorTranslator]::FromHtml("#DEDEDE")
  } else {
    $charcoal
  }

  $canvas = New-Canvas $width $height $baseColor
  $bitmap = $canvas[0]
  $graphics = $canvas[1]
  $radius = [Math]::Min($width, $height) * 0.15
  $centerY = ($height / 2) - ($radius * 0.35)
  Draw-Wheel $graphics ($width / 2) $centerY $radius $accentColor

  if ($width -ge 600 -and $height -ge 600) {
    $fontSize = [Math]::Max(26, [Math]::Min($width, $height) * 0.045)
    $font = New-Object System.Drawing.Font(
      "Segoe UI",
      $fontSize,
      [System.Drawing.FontStyle]::Bold,
      [System.Drawing.GraphicsUnit]::Pixel
    )
    $brush = New-Object System.Drawing.SolidBrush($textColor)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = [System.Drawing.RectangleF]::new(
      0,
      $centerY + $radius + ($fontSize * 0.6),
      $width,
      $fontSize * 1.5
    )
    $graphics.DrawString("CHAKRAVARTI", $font, $brush, $rect, $format)
    $font.Dispose()
    $brush.Dispose()
    $format.Dispose()
  }

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

Get-ChildItem $resRoot -Recurse -Filter "ic_launcher*.png" | ForEach-Object {
  Save-Launcher $_.FullName ($_.Name -match "foreground")
}

Get-ChildItem $resRoot -Recurse -Filter "splash.png" | ForEach-Object {
  Save-Splash $_.FullName
}

$backgroundXml = Join-Path $resRoot "values\ic_launcher_background.xml"
if (Test-Path $backgroundXml) {
  [System.IO.File]::WriteAllText(
    $backgroundXml,
    "<?xml version=`"1.0`" encoding=`"utf-8`"?>`r`n<resources>`r`n    <color name=`"ic_launcher_background`">#F7F4EF</color>`r`n</resources>`r`n",
    (New-Object System.Text.UTF8Encoding($false))
  )
}

Write-Host "Applied Chakravarti launcher and splash branding."
