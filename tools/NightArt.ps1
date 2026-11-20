# Exporta los Pyces de tools\NightArt.html a Enemigos\Pyces\*.png (1080x1080, fondo transparente) con Edge headless.
# Uso: powershell -ExecutionPolicy Bypass -File tools\NightArt.ps1 [mushroom|piranha|vampire|bat ...]
param([string[]]$Only)
$root = Split-Path $PSScriptRoot -Parent
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$items = [ordered]@{ mushroom = 'Mushroom Pyce'; piranha = 'Pyceranha'; vampire = 'Vampire Pyce'; bat = 'Bat Pyce' }
foreach ($k in $items.Keys) {
  if ($Only -and $Only.Count -and ($Only -notcontains $k)) { continue }
  $png = Join-Path $root ('Enemigos\Pyces\' + $items[$k] + '.png')
  $url = 'file:///' + (($root -replace '\\', '/') -replace ' ', '%20') + '/tools/NightArt.html?p=' + $k
  $a = @('--headless', '--disable-gpu', '--hide-scrollbars', '--window-size=1080,1080', '--default-background-color=00000000', ('--screenshot="' + $png + '"'), ('"' + $url + '"'))
  $p = Start-Process -FilePath $edge -ArgumentList $a -PassThru -NoNewWindow
  if (-not $p.WaitForExit(45000)) { try { $p.Kill() } catch {}; "TIMEOUT $k" } else { "ok $k -> $png" }
}
