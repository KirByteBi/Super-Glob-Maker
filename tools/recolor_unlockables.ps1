# Genera el arte de los Pyces desbloqueables recoloreando los originales.
# Uso:  powershell -ExecutionPolicy Bypass -File tools\recolor_unlockables.ps1
# Las líneas negras (contorno) no se tocan. Reglas por rango de tono (HSV); la primera que encaja gana.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$src = @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public class Rule { public double hMin=0,hMax=360,sMin=0,sMax=1,vMin=0,vMax=1; public double newH=-1,sMul=1,vMul=1,sSet=-1,vSet=-1; public int x0=0,y0=0,x1=99999,y1=99999; public int dark=0; }
public static class Recolor {
  static void ToHsv(int r,int g,int b,out double h,out double s,out double v){ double R=r/255.0,G=g/255.0,B=b/255.0; double mx=Math.Max(R,Math.Max(G,B)), mn=Math.Min(R,Math.Min(G,B)), d=mx-mn; v=mx; s=mx==0?0:d/mx; h=0; if(d>0){ if(mx==R) h=60*(((G-B)/d)%6); else if(mx==G) h=60*((B-R)/d+2); else h=60*((R-G)/d+4); } if(h<0) h+=360; }
  static void ToRgb(double h,double s,double v,out int r,out int g,out int b){ double c=v*s, x=c*(1-Math.Abs((h/60)%2-1)), m=v-c, R=0,G=0,B=0; if(h<60){R=c;G=x;} else if(h<120){R=x;G=c;} else if(h<180){G=c;B=x;} else if(h<240){G=x;B=c;} else if(h<300){R=x;B=c;} else {R=c;B=x;} r=(int)Math.Round((R+m)*255); g=(int)Math.Round((G+m)*255); b=(int)Math.Round((B+m)*255); }
  static bool InHue(double h, Rule q){ return q.hMin<=q.hMax ? (h>=q.hMin && h<=q.hMax) : (h>=q.hMin || h<=q.hMax); }
  public static void Run(string inPath, string outPath, Rule[] rules){
    using(var src=new Bitmap(inPath)) using(var bmp=new Bitmap(src.Width,src.Height,PixelFormat.Format32bppArgb)){
      using(var gr=Graphics.FromImage(bmp)) gr.DrawImage(src,0,0,src.Width,src.Height);
      var rect=new Rectangle(0,0,bmp.Width,bmp.Height); var data=bmp.LockBits(rect,ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
      int n=data.Stride*bmp.Height; byte[] px=new byte[n]; Marshal.Copy(data.Scan0,px,0,n);
      for(int y=0;y<bmp.Height;y++) for(int x=0;x<bmp.Width;x++){
        int i=y*data.Stride+x*4; if(px[i+3]==0) continue;
        int b=px[i],g=px[i+1],r=px[i+2]; double h,s,v; ToHsv(r,g,b,out h,out s,out v);
        bool isDark=v<0.2; // contorno negro intacto (salvo reglas 'dark' para zonas oscuras con color, p. ej. el pelo)
        foreach(var q in rules){
          if(isDark && q.dark==0) continue;
          if(x<q.x0||x>q.x1||y<q.y0||y>q.y1) continue;
          if(!InHue(h,q)||s<q.sMin||s>q.sMax||v<q.vMin||v>q.vMax) continue;
          double nh=q.newH>=0?q.newH:h, ns=q.sSet>=0?q.sSet:Math.Min(1,s*q.sMul), nv=q.vSet>=0?q.vSet:Math.Min(1,v*q.vMul);
          int R,G,B; ToRgb(nh,ns,nv,out R,out G,out B); px[i]=(byte)B; px[i+1]=(byte)G; px[i+2]=(byte)R; break;
        }
      }
      Marshal.Copy(px,0,data.Scan0,n); bmp.UnlockBits(data); bmp.Save(outPath,ImageFormat.Png);
    }
  }
  // Bigote (Fungus): dos lóbulos curvos con contorno negro
  public static void Mustache(string path, int cx, int cy, string hex){
    Bitmap bmp; using(var tmp=new Bitmap(path)) bmp=new Bitmap(tmp);
    using(var gr=Graphics.FromImage(bmp)){
      gr.SmoothingMode=System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
      var fill=new SolidBrush(ColorTranslator.FromHtml(hex)); var pen=new Pen(Color.FromArgb(255,13,13,13),9);
      foreach(int s in new[]{-1,1}){
        var p=new System.Drawing.Drawing2D.GraphicsPath();
        p.AddBezier(cx, cy, cx+s*40, cy-30, cx+s*95, cy-18, cx+s*112, cy+18);
        p.AddBezier(cx+s*112, cy+18, cx+s*80, cy+4, cx+s*45, cy+26, cx, cy+14);
        p.CloseFigure(); gr.FillPath(fill,p); gr.DrawPath(pen,p);
      }
    }
    bmp.Save(path,ImageFormat.Png); bmp.Dispose();
  }
}
"@
Add-Type -TypeDefinition $src -ReferencedAssemblies System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$P = Join-Path $root 'Enemigos\Pyces'
$W1 = Join-Path $root 'Enemigos\Desbloqueables\W1'; $W2 = Join-Path $root 'Enemigos\Desbloqueables\W2'
New-Item -ItemType Directory -Force -Path $W1, $W2 | Out-Null
function NewRule($h) { $r = New-Object Rule; foreach ($k in $h.Keys) { $r.$k = $h[$k] }; $r }

# Minery Eterniumed: naranja -> lila; cristales rosas -> lila intenso; teclado marrón -> morado oscuro
[Recolor]::Run("$P\Miner Pyce.png", "$W1\Minery Eterniumed Pyce.png", @(
  (NewRule @{ hMin=300; hMax=350; sMin=0.25; newH=282; sMul=1.1 }),
  (NewRule @{ hMin=0; hMax=55; sMin=0.35; vMax=0.55; newH=272; sMul=0.9; vMul=1.0 }),
  (NewRule @{ hMin=0; hMax=55; sMin=0.35; newH=272; sMul=0.75; vMul=1.0 })
))
# Banned Builder: pantalla blanca, casco naranja, franja rosa, martillo negro, cuerpo claro
[Recolor]::Run("$P\Builder Pyce.png", "$W1\Banned Builder Pyce.png", @(
  (NewRule @{ x0=760; x1=990; y0=170; y1=345; sMax=0.3; vMin=0.45; sSet=0.05; vSet=0.2 }),
  (NewRule @{ x0=330; x1=670; y0=395; y1=640; hMin=35; hMax=65; sSet=0.04; vSet=0.98 }),
  (NewRule @{ hMin=170; hMax=200; sMin=0.4; newH=330; sSet=0.72; vSet=1.0 }),
  (NewRule @{ hMin=40; hMax=62; sMin=0.4; newH=26; sSet=0.88 }),
  # traje: cuerpo naranja -> lila oscuro; grises oscuros (cable, teclas) -> lila oscuro; el negro se queda negro
  (NewRule @{ hMin=15; hMax=39; sMin=0.5; newH=275; sSet=0.5; vSet=0.33 }),
  (NewRule @{ x1=880; y0=440; sMax=0.25; vMax=0.55; newH=275; sSet=0.4; vMul=1.1 })
))
# Inked Squid: todo hacia índigo oscuro (los ojos negros no se tocan)
[Recolor]::Run("$P\Squid Pyce.png", "$W1\Inked Squid Pyce.png", @(
  # pantalla (azul claro) algo más clara que el cuerpo, para que se lea la cara
  (NewRule @{ x0=350; x1=730; y0=355; y1=680; hMin=190; hMax=235; sMin=0.08; newH=232; sSet=0.55; vSet=0.62 }),
  # brillos de los ojos: se quedan claros
  (NewRule @{ x0=440; x1=620; y0=455; y1=590; sMax=0.08; vMin=0.93; sSet=0.1; vSet=0.9 }),
  (NewRule @{ hMin=300; hMax=360; newH=245; sSet=0.45; vMul=0.42 }),
  (NewRule @{ newH=250; sSet=0.5; vMul=0.38 })
))
# Veneraña: cabeza azul -> amarilla; verdes oscuros (cuerpo/teclado) -> lila; las lianas verdes claras se quedan
[Recolor]::Run("$P\Pyceranha.png", "$W2\Venerana Pyce.png", @(
  (NewRule @{ hMin=200; hMax=235; sMin=0.45; newH=48; sSet=0.85; vSet=1.0 }),
  (NewRule @{ hMin=85; hMax=175; vMax=0.62; newH=275; sMul=0.9 }),
  (NewRule @{ hMin=85; hMax=175; sMax=0.35; newH=275 })
))
# Bloodpire / Bloat: alas rojas más vivas, cuerpo azul intenso
$blood = @(
  (NewRule @{ hMin=330; hMax=20; sMin=0.4; newH=352; sSet=0.95; vMul=1.35 }),
  (NewRule @{ hMin=195; hMax=245; sMax=0.55; vMin=0.55; newH=228; sSet=0.62; vMul=0.92 })
)
[Recolor]::Run("$P\Vampire Pyce.png", "$W2\Bloodpire Pyce.png", @(
  # pelo (franja oscura de arriba de la pantalla) -> granate/escarlata. El contorno es gris puro (S~0) y no entra.
  (NewRule @{ dark=1; x0=370; x1=700; y0=410; y1=505; sMin=0.12; newH=350; sSet=0.85; vSet=0.48 }),
  (NewRule @{ x0=370; x1=700; y0=410; y1=505; hMin=200; hMax=320; sMin=0.12; vMax=0.35; newH=350; sSet=0.85; vSet=0.48 }),
  # pantalla: el blanco y el brillo rosado de los ojos -> azul (los ojos rojos intensos se quedan)
  (NewRule @{ x0=370; x1=705; y0=485; y1=668; sMax=0.5; vMin=0.6; newH=228; sSet=0.62; vSet=0.9 })
) + $blood)
[Recolor]::Run("$P\Bat Pyce.png", "$W2\Bloat Pyce.png", $blood)
# Fungus: sombrero lila -> azul, motas -> celeste; bigote celeste
[Recolor]::Run("$P\Mushroom Pyce.png", "$W2\Fungus Pyce.png", @(
  # sombrero lila -> azul, motas -> celeste
  (NewRule @{ hMin=245; hMax=300; sMin=0.25; newH=214; sSet=0.78; vMul=0.95 }),
  (NewRule @{ hMin=245; hMax=300; sMax=0.25; vMin=0.8; newH=190; sSet=0.25; vSet=1.0 }),
  # "tronco" (cuerpo, ratón y teclado azules) -> color arena; la pantalla oscura no se toca
  (NewRule @{ y0=430; hMin=190; hMax=240; sMax=0.2; vMin=0.85; newH=40; sSet=0.18; vSet=0.97 }),
  (NewRule @{ y0=430; hMin=190; hMax=240; sMin=0.2; vMin=0.82; newH=38; sSet=0.36; vSet=0.9 }),
  (NewRule @{ y0=430; hMin=190; hMax=240; sMin=0.2; vMin=0.5; vMax=0.82; newH=34; sSet=0.45; vMul=0.95 })
))
[Recolor]::Mustache("$W2\Fungus Pyce.png", 540, 592, '#ffc83a')
"OK"
Get-ChildItem $W1, $W2 -Filter *.png | ForEach-Object { $_.Name + '  ' + $_.Length }

