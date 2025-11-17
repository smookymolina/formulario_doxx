#!/usr/bin/env python3
"""
Script de prueba para verificar que todo esté configurado correctamente
"""

import os
import sys
from pathlib import Path

def check_files():
    """Verificar que todos los archivos necesarios existan"""
    print("=" * 60)
    print("VERIFICANDO ARCHIVOS DEL PROYECTO")
    print("=" * 60)

    required_files = [
        'css/styles.css',
        'js/app.js',
        'server/app.py',
        'database/schema.sql',
        'index_modular.html',
        'requirements.txt',
        'README.md'
    ]

    missing_files = []

    for file in required_files:
        if Path(file).exists():
            print(f"✅ {file}")
        else:
            print(f"❌ {file} - FALTA")
            missing_files.append(file)

    return len(missing_files) == 0

def check_directories():
    """Verificar que las carpetas necesarias existan"""
    print("\n" + "=" * 60)
    print("VERIFICANDO CARPETAS")
    print("=" * 60)

    required_dirs = [
        'css',
        'js',
        'server',
        'database',
        'uploads/videos'
    ]

    missing_dirs = []

    for directory in required_dirs:
        if Path(directory).exists():
            print(f"✅ {directory}/")
        else:
            print(f"❌ {directory}/ - FALTA")
            missing_dirs.append(directory)

    return len(missing_dirs) == 0

def check_python_packages():
    """Verificar que los paquetes de Python estén instalados"""
    print("\n" + "=" * 60)
    print("VERIFICANDO PAQUETES DE PYTHON")
    print("=" * 60)

    required_packages = ['flask', 'flask_cors']
    missing_packages = []

    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - NO INSTALADO")
            missing_packages.append(package)

    if missing_packages:
        print("\n⚠️  Instala los paquetes faltantes con:")
        print("   pip install -r requirements.txt")

    return len(missing_packages) == 0

def test_database_schema():
    """Probar que el schema SQL es válido"""
    print("\n" + "=" * 60)
    print("VERIFICANDO SCHEMA DE BASE DE DATOS")
    print("=" * 60)

    schema_path = Path('database/schema.sql')

    if not schema_path.exists():
        print("❌ schema.sql no encontrado")
        return False

    try:
        import sqlite3

        # Crear DB temporal en memoria
        conn = sqlite3.connect(':memory:')

        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = f.read()

        conn.executescript(schema)

        # Verificar que las tablas se crearon
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        expected_tables = [
            'respuestas',
            'videos',
            'ubicaciones',
            'actividades_seleccionadas',
            'dispositivos',
            'step_times',
            'validation_attempts',
            'event_logs'
        ]

        all_found = True
        for table in expected_tables:
            if table in tables:
                print(f"✅ Tabla: {table}")
            else:
                print(f"❌ Tabla: {table} - NO CREADA")
                all_found = False

        conn.close()
        return all_found

    except Exception as e:
        print(f"❌ Error al verificar schema: {str(e)}")
        return False

def print_summary(checks):
    """Imprimir resumen de verificaciones"""
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)

    all_passed = all(checks.values())

    for check_name, passed in checks.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {check_name}")

    print("\n" + "=" * 60)

    if all_passed:
        print("🎉 TODO ESTÁ CONFIGURADO CORRECTAMENTE")
        print("\nPróximos pasos:")
        print("1. Iniciar el servidor: python server/app.py")
        print("2. Abrir index_modular.html en el navegador")
        print("3. Probar el formulario completo")
    else:
        print("⚠️  HAY PROBLEMAS QUE RESOLVER")
        print("\nRevisa los mensajes de error arriba")

    print("=" * 60)

def main():
    """Ejecutar todas las verificaciones"""
    print("\n🔍 VERIFICACIÓN DEL SISTEMA\n")

    checks = {
        "Archivos": check_files(),
        "Carpetas": check_directories(),
        "Paquetes Python": check_python_packages(),
        "Schema de BD": test_database_schema()
    }

    print_summary(checks)

    return all(checks.values())

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
