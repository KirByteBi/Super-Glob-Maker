# Calcula la zona visible (sin transparencia) de cada imagen de Pyce y genera js/view/PyceArt.js
# Uso: powershell -ExecutionPolicy Bypass -File tools\PyceBounds.ps1
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -Language CSharp -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class Bounds {
  public static int[] Get(string path) {
    using (var b = new Bitmap(path)) {
      var d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var px = new int[b.Width * b.Height]; Marshal.Copy(d.Scan0, px, 0, px.Length); b.UnlockBits(d);
      int x0 = b.Width, y0 = b.Height, x1 = -1, y1 = -1;
      for (int y = 0; y < b.Height; y++) for (int x = 0; x < b.Width; x++)
        if (((px[y * b.Width + x] >> 24) & 255) > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return new int[] { b.Width, b.Height, x0, y0, x1 - x0 + 1, y1 - y0 + 1 };
    }
  }
}
'@
$root = Split-Path $PSScriptRoot -Parent
$map = [ordered]@{
  stupid='Enemigos/Stupid_Pyce.png'; so='Enemigos/SO_Pyce.png'; symbol='Enemigos/Symbol_Pyce.png'; pyceglob='Enemigos/Pyce_Glob.png'
  pyce2='Enemigos/Pyce2.png'; guest='Enemigos/Guest_Pyce.png'; noob='Enemigos/Noob_Pyce.png'; crystal='Enemigos/Crystal Pyce.png'
  hacker='Enemigos/1x1x1x1_Pyce.png'; motions='Enemigos/4motions_Pyce.png'; flower='Enemigos/Flower_Pyce.png'
  moonstar='Enemigos/MoonStar_Pyce.png'; noeye='Enemigos/NOeye_Pyce.png'; noir='Enemigos/NOIRrupt Pyce.png'; nosense='Enemigos/NOsense Pyce.png'
  axolotl='Enemigos/Pyces/Axolotl Pyce.png'; bomb='Enemigos/Pyces/Bomb Pyce.png'; cannon='Enemigos/Pyces/Cannon Pycer.png'
  clownpysh='Enemigos/Pyces/Clown Pysh.png'; elf='Enemigos/Pyces/Elf Pyce.png'; festive='Enemigos/Pyces/Festive Pyce.png'
  ghost='Enemigos/Pyces/Ghost Pyce.png'; holo='Enemigos/Pyces/HoloPyce.png'; knight='Enemigos/Pyces/Knight Pyce.png'
  pysh='Enemigos/Pyces/Pysh.png'; rebel='Enemigos/Pyces/Rebel Pyce.png'; shark='Enemigos/Pyces/Shark Pyce.png'
  skelebone='Enemigos/Pyces/SkeleBone Pyce (RW).png'; snowcap='Enemigos/Pyces/SnowCapaule Pyce.png'; strechy='Enemigos/Pyces/Strechy Pyce.png'
  toybomb='Enemigos/Pyces/ToyBomb Pyce.png'; umbrella='Enemigos/Pyces/Umbrella Pyce.png'; wingel='Enemigos/Pyces/Wingel Pyce.png'
  zom='Enemigos/Pyces/ZomPyce.png'
  mimic='Enemigos/Mimic Pyce (ENEMY-SKIN)/Mimic Pyce.png'; dirty='Enemigos/Mimic Pyce (ENEMY-SKIN)/Dirty Pyce (SK-EVO2).png'
  nomic='Enemigos/Mimic Pyce (ENEMY-SKIN)/NOmic Pyce (SK-EVO3).png'; goldmimic='Enemigos/Mimic Pyce (ENEMY-SKIN)/Golden MimicPyce (SK-EVO4).png'
}
$lines = @()
foreach ($id in $map.Keys) {
  $p = Join-Path $root $map[$id]
  if (-not (Test-Path -LiteralPath $p)) { Write-Warning "No existe: $($map[$id])"; continue }
  $b = [Bounds]::Get($p)
  $lines += "    $id`: { src: '$($map[$id])', w: $($b[0]), h: $($b[1]), box: [$($b[2]), $($b[3]), $($b[4]), $($b[5])] }"
}
$js = @"
/* Vista: imagenes de los Pyces. GENERADO por tools/PyceBounds.ps1 (no editar a mano).
   box = zona visible [x, y, ancho, alto] dentro de la imagen original.
   Los dibujos originales miran a la derecha: el juego los voltea al ir a la izquierda. */
(function (S) {
  'use strict';
  S.View.PyceArt = {
$($lines -join ",`r`n")
  };
})(window.SGM);
"@
Set-Content -Path (Join-Path $root 'js/view/PyceArt.js') -Value $js -Encoding UTF8
"ok: $($lines.Count) Pyces"
