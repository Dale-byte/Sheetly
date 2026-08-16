# Generates the Sheetly PWA icons into public/icons.
# Windows-only (uses System.Drawing). Re-run to regenerate at other sizes.
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\public\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bg = [System.Drawing.Color]::FromArgb(255, 59, 130, 246) # --color-primary #3b82f6

function New-SheetlyIcon {
  param([int]$Size, [string]$Path)
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $g.Clear($bg)
  $fontSize = [float]($Size * 0.62)
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF(0.0, [float]($Size * 0.03), [float]$Size, [float]$Size)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.DrawString("S", $font, $brush, $rect, $sf)
  $brush.Dispose()
  $font.Dispose()
  $sf.Dispose()
  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

New-SheetlyIcon -Size 192 -Path (Join-Path $outDir "icon-192.png")
New-SheetlyIcon -Size 512 -Path (Join-Path $outDir "icon-512.png")
New-SheetlyIcon -Size 512 -Path (Join-Path $outDir "icon-maskable-512.png")
New-SheetlyIcon -Size 180 -Path (Join-Path $outDir "apple-touch-icon.png")

$svg = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#3b82f6"/>
  <text x="256" y="256" fill="#ffffff" font-family="Segoe UI, -apple-system, Roboto, Arial, sans-serif" font-size="318" font-weight="700" text-anchor="middle" dominant-baseline="central">S</text>
</svg>
'@
[System.IO.File]::WriteAllText((Join-Path $outDir "icon.svg"), $svg)

Write-Output "Generated icons in $outDir"
Get-ChildItem -Path $outDir | ForEach-Object { "  $($_.Name) ($($_.Length) bytes)" }
