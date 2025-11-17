#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import codecs

# Lista de archivos a corregir
archivos = [
    "index.html",
    "formulario_egresados.html",
    "admin.html",
    "demo_notificaciones.html",
    "index_modular.html"
]

# Mapeo de caracteres mal codificados a correctos
reemplazos = {
    # Vocales con tilde
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã"': 'Ó', 'Ãš': 'Ú',
    # Ñ
    'Ã±': 'ñ', 'Ã'': 'Ñ',
    # Signos
    'Â¿': '¿', 'Â¡': '¡',
    # Emojis mal codificados
    'ðŸŽ"': '🎓',
    'ðŸ"¹': '📹',
    'ðŸ"': '📍',
    'ðŸ"´': '🔴',
    'âœ…': '✅',
    'ðŸ"Š': '📊',
    'ðŸ"‹': '📋',
    'ðŸ—ºï¸': '🗺️',
    'ðŸ"ˆ': '📈',
    'ðŸ"': '🎯',
    'ðŸ"": '🔔',
    # Otros caracteres comunes
    'Ã': 'í',
    'Ã¿': 'ÿ',
}

for archivo in archivos:
    if os.path.exists(archivo):
        print(f"Procesando {archivo}...")

        try:
            # Leer el archivo
            with open(archivo, 'r', encoding='utf-8-sig') as f:
                contenido = f.read()

            # Aplicar todos los reemplazos
            for malo, bueno in reemplazos.items():
                contenido = contenido.replace(malo, bueno)

            # Guardar el archivo sin BOM
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(contenido)

            print(f"✓ {archivo} corregido")

        except Exception as e:
            print(f"✗ Error en {archivo}: {e}")
    else:
        print(f"✗ {archivo} no encontrado")

print("\n¡Corrección completada!")
