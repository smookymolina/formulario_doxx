# Script para corregir la codificacion UTF-8 de archivos HTML

$archivos = @(
    "index.html",
    "formulario_egresados.html",
    "admin.html",
    "demo_notificaciones.html",
    "index_modular.html"
)

foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        Write-Host "Procesando $archivo..."

        # Leer el contenido con codificacion UTF-8
        $contenido = Get-Content -Path $archivo -Raw -Encoding UTF8

        # Remover BOM si existe
        $contenido = $contenido.TrimStart([char]0xFEFF)

        # Corregir caracteres mal codificados - vocales con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0xA1, [char]0xE1  # a con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0xA9, [char]0xE9  # e con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0xAD, [char]0xED  # i con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0xB3, [char]0xF3  # o con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0xBA, [char]0xFA  # u con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0xB1, [char]0xF1  # ñ

        # Vocales mayúsculas con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0x81, [char]0xC1  # A con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0x89, [char]0xC9  # E con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0x8D, [char]0xCD  # I con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0x93, [char]0xD3  # O con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0x9A, [char]0xDA  # U con tilde
        $contenido = $contenido -replace [char]0xC3+[char]0x91, [char]0xD1  # Ñ

        # Signos de puntuacion
        $contenido = $contenido -replace [char]0xC2+[char]0xBF, [char]0xBF  # ¿
        $contenido = $contenido -replace [char]0xC2+[char]0xA1, [char]0xA1  # ¡

        # Guardar el archivo corregido sin BOM
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($archivo, $contenido, $utf8NoBom)

        Write-Host "Corregido: $archivo"
    } else {
        Write-Host "No encontrado: $archivo"
    }
}

Write-Host "Correccion completada!"
