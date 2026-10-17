# Genera los iconos de PERIODactyl: una "p" minúscula en Archivo 800.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/iconos.ps1
# Solo hace falta volver a ejecutarlo si cambia el diseño del icono.

Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$fuente = Join-Path $raiz 'node_modules/@expo-google-fonts/archivo/800ExtraBold/Archivo_800ExtraBold.ttf'
$coleccion = New-Object System.Drawing.Text.PrivateFontCollection
$coleccion.AddFontFile($fuente)
$familia = $coleccion.Families[0]

$acento = [System.Drawing.ColorTranslator]::FromHtml('#A3245A')
$acentoOscuro = [System.Drawing.ColorTranslator]::FromHtml('#F08BB4')
$blanco = [System.Drawing.Color]::White

function Dibujar($archivo, $fondo, $tinta, $escala) {
  $lado = 1024
  $bmp = New-Object System.Drawing.Bitmap $lado, $lado
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear($fondo)
  # La "p" centrada por su caja real (GraphicsPath), no por la métrica de la fuente.
  $ruta = New-Object System.Drawing.Drawing2D.GraphicsPath
  $ruta.AddString('p', $familia, 0, [single]($lado * $escala), (New-Object System.Drawing.PointF 0, 0), [System.Drawing.StringFormat]::GenericTypographic)
  $caja = $ruta.GetBounds()
  $m = New-Object System.Drawing.Drawing2D.Matrix
  $m.Translate(($lado - $caja.Width) / 2 - $caja.X, ($lado - $caja.Height) / 2 - $caja.Y)
  $ruta.Transform($m)
  $g.FillPath((New-Object System.Drawing.SolidBrush $tinta), $ruta)
  $bmp.Save((Join-Path $raiz "assets/$archivo"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$transparente = [System.Drawing.Color]::Transparent
Dibujar 'icon.png' $acento $blanco 0.78
# Adaptativo de Android: el sistema recorta un círculo del 66 % central, la "p" va más pequeña.
Dibujar 'android-icon-foreground.png' $transparente $blanco 0.5
Dibujar 'android-icon-monochrome.png' $transparente $blanco 0.5
Dibujar 'splash-icon.png' $transparente $acento 0.78
Dibujar 'splash-icon-dark.png' $transparente $acentoOscuro 0.78
