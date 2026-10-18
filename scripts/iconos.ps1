# Genera los iconos de PERIODactyl: la "p" minúscula de Archivo 800 convertida en cabeza de
# pterodáctilo. La panza es la cabeza y su hueco el ojo, el tronco es el cuello, y lleva
# una cresta hacia atrás y un pico largo hacia delante.
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
$P = { param($x, $y) New-Object System.Drawing.PointF $x, $y }

function Poligono($puntos) {
  $r = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r.AddPolygon([System.Drawing.PointF[]]$puntos)
  $r
}

# Las piezas, en coordenadas de la "p" a 0.78 de un lienzo de 1024 y centrada por su caja:
# tronco x 300–407 con el remate en y = 232, panza x 418–724 entre y 223 y 662. Cada pieza
# va en su propio trazado (si se solapan dentro de uno, lo solapado queda hueco) y entra
# unos píxeles en la letra (dos bordes que solo se tocan dejan una costura al suavizar).
# Ojo: PowerShell no distingue mayúsculas, así que nada puede llamarse $p (pisaría $P).
function Piezas {
  $lado = 1024
  $letra = New-Object System.Drawing.Drawing2D.GraphicsPath
  $letra.AddString('p', $familia, 0, [single]($lado * 0.78), (& $P 0 0), [System.Drawing.StringFormat]::GenericTypographic)
  $caja = $letra.GetBounds()
  $m = New-Object System.Drawing.Drawing2D.Matrix
  $m.Translate(($lado - $caja.Width) / 2 - $caja.X, ($lado - $caja.Height) / 2 - $caja.Y)
  $letra.Transform($m)

  $cresta = Poligono @((& $P 300 300), (& $P 300 232), (& $P 206 110), (& $P 470 236), (& $P 430 300))
  $pico = Poligono @((& $P 690 382), (& $P 960 462), (& $P 690 540))
  , @($letra, $cresta, $pico)
}

# El pterodáctilo centrado por su caja, con su lado mayor a `escala` del lienzo.
function Dibujar($archivo, $fondo, $tinta, $escala) {
  $lado = 1024
  $bmp = New-Object System.Drawing.Bitmap $lado, $lado
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear($fondo)
  $piezas = Piezas
  $u = $piezas[0].GetBounds()
  foreach ($q in $piezas) { $u = [System.Drawing.RectangleF]::Union($u, $q.GetBounds()) }
  $k = $lado * $escala / [Math]::Max($u.Width, $u.Height)
  $m = New-Object System.Drawing.Drawing2D.Matrix
  $m.Translate($lado / 2, $lado / 2)
  $m.Scale($k, $k)
  $m.Translate(-($u.X + $u.Width / 2), -($u.Y + $u.Height / 2))
  $pincel = New-Object System.Drawing.SolidBrush $tinta
  foreach ($q in $piezas) { $q.Transform($m); $g.FillPath($pincel, $q) }
  $bmp.Save((Join-Path $raiz "assets/$archivo"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$transparente = [System.Drawing.Color]::Transparent
Dibujar 'icon.png' $acento $blanco 0.66
# Adaptativo de Android: el sistema recorta un círculo del 66 % central, el pterodáctilo va más pequeño.
Dibujar 'android-icon-foreground.png' $transparente $blanco 0.42
Dibujar 'android-icon-monochrome.png' $transparente $blanco 0.42
Dibujar 'splash-icon.png' $transparente $acento 0.66
Dibujar 'splash-icon-dark.png' $transparente $acentoOscuro 0.66
