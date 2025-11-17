#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

archivos = ['index.html', 'formulario_egresados.html', 'admin.html', 'demo_notificaciones.html', 'index_modular.html']

for archivo in archivos:
    if os.path.exists(archivo):
        print(f'Procesando {archivo}...')
        
        # Leer archivo en modo binario
        with open(archivo, 'rb') as f:
            datos = f.read()
        
        # Intentar decodificar correctamente
        try:
            # Primero intentar UTF-8 directo
            contenido = datos.decode('utf-8')
        except:
            # Si falla, podría ser Latin-1
            try:
                contenido = datos.decode('latin-1').encode('latin-1').decode('utf-8')
            except:
                print(f'  Error decodificando {archivo}, saltando...')
                continue
        
        # Eliminar BOM si existe
        if contenido and contenido[0] == '\ufeff':
            contenido = contenido[1:]
        
        # Guardar con UTF-8 sin BOM
        with open(archivo, 'w', encoding='utf-8', newline='\n') as f:
            f.write(contenido)
        
        print(f'  OK - {archivo} corregido')
    else:
        print(f'  SKIP - {archivo} no existe')

print('\nProceso completado!')
