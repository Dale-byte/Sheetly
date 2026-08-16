# Generates the Sheetly PWA icons from a square source image into public/icons.
# Windows-only (uses System.Drawing). Re-run to regenerate at other sizes.
#
# Usage:
#   powershell -File scripts/generate-icons.ps1                          # uses the default source below
#   powershell -File scripts/generate-icons.ps1 -Source "path\to\icon.png"
param(
  [string]$Source = "C:\Users\daelf\Documents\vibecode_projects\Sheetly\Sheetly icon.png"
)

Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\public\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Source image not found: $Source"
}
$src = [System.Drawing.Image]::FromFile($Source)

function Resize-Icon {
  param([System.Drawing.Image]$Image, [int]$Size, [string]$Path)
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($Image, 0, 0, $Size, $Size)
  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Resize-Icon -Image $src -Size 512 -Path (Join-Path $outDir "icon-512.png")
Resize-Icon -Image $src -Size 512 -Path (Join-Path $outDir "icon-maskable-512.png")
Resize-Icon -Image $src -Size 192 -Path (Join-Path $outDir "icon-192.png")
Resize-Icon -Image $src -Size 180 -Path (Join-Path $outDir "apple-touch-icon.png")
Resize-Icon -Image $src -Size 32 -Path (Join-Path $outDir "favicon-32x32.png")
Resize-Icon -Image $src -Size 16 -Path (Join-Path $outDir "favicon-16x16.png")
$src.Dispose()

# SVG wrapper that embeds the 512 raster (browser-tab favicon + manifest "any" icon).
$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="icon-512.png"/></svg>'
[System.IO.File]::WriteAllText((Join-Path $outDir "icon.svg"), $svg)

Write-Output "Generated icons in $outDir"
Get-ChildItem -Path $outDir | ForEach-Object { "  $($_.Name) ($($_.Length) bytes)" }
