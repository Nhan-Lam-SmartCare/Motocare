Add-Type -AssemblyName System.Drawing

$assets = "g:\Motocare\MotocareMobile\assets"
$logoPath = Join-Path $assets 'logo-smartcare.png'

function New-RoundedRectPath {
  param([float]$x, [float]$y, [float]$w, [float]$h, [float]$r)

  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x, $y, $r, $r, 180, 90)
  $p.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $p.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $p.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $p.CloseFigure()
  return $p
}

function Get-VisibleBounds {
  param([System.Drawing.Image]$Image)

  $bmp = New-Object System.Drawing.Bitmap($Image)
  try {
    $minX = $bmp.Width
    $minY = $bmp.Height
    $maxX = -1
    $maxY = -1

    for ($y = 0; $y -lt $bmp.Height; $y++) {
      for ($x = 0; $x -lt $bmp.Width; $x++) {
        $px = $bmp.GetPixel($x, $y)
        if ($px.A -gt 10) {
          if ($x -lt $minX) { $minX = $x }
          if ($y -lt $minY) { $minY = $y }
          if ($x -gt $maxX) { $maxX = $x }
          if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }

    if ($maxX -lt 0 -or $maxY -lt 0) {
      return New-Object System.Drawing.RectangleF(0, 0, $bmp.Width, $bmp.Height)
    }

    return New-Object System.Drawing.RectangleF(
      [float]$minX,
      [float]$minY,
      [float]($maxX - $minX + 1),
      [float]($maxY - $minY + 1)
    )
  }
  finally {
    $bmp.Dispose()
  }
}

function Draw-LogoCentered {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Logo,
    [float]$targetSize,
    [float]$canvasSize,
    [bool]$withShadow
  )

  $visible = Get-VisibleBounds -Image $Logo
  $sourceRatio = $visible.Width / [Math]::Max(1.0, $visible.Height)

  $drawW = [float]$targetSize
  $drawH = [float]$targetSize

  if ($sourceRatio -gt 1) {
    $drawH = [float]($targetSize / $sourceRatio)
  }
  elseif ($sourceRatio -lt 1) {
    $drawW = [float]($targetSize * $sourceRatio)
  }

  $x = [float](($canvasSize - $drawW) / 2)
  $y = [float](($canvasSize - $drawH) / 2)

  if ($withShadow) {
    # Shadow removed as requested
  }

  $dest = New-Object System.Drawing.RectangleF([float]$x, [float]$y, [float]$drawW, [float]$drawH)
  $src = New-Object System.Drawing.RectangleF([float]$visible.X, [float]$visible.Y, [float]$visible.Width, [float]$visible.Height)
  $Graphics.DrawImage(
    $Logo,
    $dest,
    $src,
    [System.Drawing.GraphicsUnit]::Pixel
  )
}

function New-AppIcon {
  param(
    [string]$outPath,
    [bool]$transparentBg,
    [System.Drawing.Image]$logo
  )

  $size = 1024
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  if ($transparentBg) {
    $g.Clear([System.Drawing.Color]::Transparent)
    Draw-LogoCentered -Graphics $g -Logo $logo -targetSize 760 -canvasSize $size -withShadow:$false
  } else {
    $basePath = New-RoundedRectPath -x 48 -y 48 -w 928 -h 928 -r 230
    $baseBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      (New-Object System.Drawing.PointF(60, 60)),
      (New-Object System.Drawing.PointF(960, 960)),
      [System.Drawing.Color]::FromArgb(255, 244, 249, 255),
      [System.Drawing.Color]::FromArgb(255, 220, 235, 255)
    )
    $g.FillPath($baseBrush, $basePath)

    # subtle bottom-right mint tint to harmonize with logo green
    $tintPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $tintPath.AddEllipse(430, 520, 520, 430)
    $tintBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($tintPath)
    $tintBrush.CenterColor = [System.Drawing.Color]::FromArgb(65, 170, 231, 196)
    $tintBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 170, 231, 196))
    $g.FillPath($tintBrush, $tintPath)

    $hlPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $hlPath.AddEllipse(120, 80, 760, 410)
    $hlBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($hlPath)
    $hlBrush.CenterColor = [System.Drawing.Color]::FromArgb(110, 255, 255, 255)
    $hlBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    $g.FillPath($hlBrush, $hlPath)

    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 124, 165, 220), 3)
    $g.DrawPath($borderPen, $basePath)

    # Inner soft plate for logo readability on launcher backgrounds
    $platePath = New-RoundedRectPath -x 142 -y 142 -w 740 -h 740 -r 180
    $plateBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(58, 255, 255, 255))
    $g.FillPath($plateBrush, $platePath)

    Draw-LogoCentered -Graphics $g -Logo $logo -targetSize 694 -canvasSize $size -withShadow:$true
  }

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

if (-not (Test-Path $logoPath)) {
  throw "Cannot find source logo at $logoPath"
}

$logoImg = [System.Drawing.Image]::FromFile($logoPath)

New-AppIcon -outPath (Join-Path $assets 'icon.png') -transparentBg:$false -logo $logoImg
New-AppIcon -outPath (Join-Path $assets 'splash-icon.png') -transparentBg:$false -logo $logoImg
New-AppIcon -outPath (Join-Path $assets 'android-icon-foreground.png') -transparentBg:$true -logo $logoImg

# Keep favicon from icon for visual consistency
Copy-Item (Join-Path $assets 'icon.png') (Join-Path $assets 'favicon.png') -Force

$logoImg.Dispose()

Add-Type -AssemblyName System.Drawing
Get-ChildItem $assets -Filter '*.png' | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  Write-Host ($_.Name + ' => ' + $img.Width + 'x' + $img.Height)
  $img.Dispose()
}
