# Genera una hoja de contacto (cuadrícula con nombres) de una carpeta de PNG
param([string]$Dir, [string]$Out, [int]$Cols = 8, [int]$Cell = 165)
Add-Type -AssemblyName System.Drawing
$files = Get-ChildItem (Join-Path $Dir '*.png')
$rows = [math]::Ceiling($files.Count / $Cols)
$bmp = New-Object System.Drawing.Bitmap ($Cols * $Cell), ($rows * ($Cell + 18))
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 200, 230, 255))
$font = New-Object System.Drawing.Font 'Arial', 9, ([System.Drawing.FontStyle]::Bold)
$k = 0
foreach ($f in $files) {
  $im = [System.Drawing.Image]::FromFile($f.FullName)
  $x = ($k % $Cols) * $Cell; $y = [math]::Floor($k / $Cols) * ($Cell + 18)
  $s = [math]::Min(($Cell - 10) / $im.Width, ($Cell - 10) / $im.Height)
  $g.DrawImage($im, $x + 5, $y + 2, [int]($im.Width * $s), [int]($im.Height * $s))
  $g.DrawString($f.BaseName, $font, [System.Drawing.Brushes]::Black, $x + 2, $y + $Cell)
  $im.Dispose(); $k++
}
$bmp.Save($Out)
$g.Dispose(); $bmp.Dispose()
"ok $Out"
