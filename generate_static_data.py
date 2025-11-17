import sqlite3
import json
import os
from pathlib import Path

# Configuración de carpetas
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / 'database' / 'formulario.db'
DATA_DIR = BASE_DIR / 'data'

def get_db():
    """Obtener conexión a la base de datos"""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def generate_static_data():
    """Genera archivos JSON estáticos a partir de la base de datos."""
    if not DATABASE_PATH.exists():
        print(f"Error: La base de datos no existe en {DATABASE_PATH}")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / 'respuestas').mkdir(parents=True, exist_ok=True)

    conn = get_db()
    cursor = conn.cursor()

    # 1. Generar dashboard.json
    stats = {}
    cursor.execute('SELECT COUNT(*) as total FROM respuestas')
    stats['total_respuestas'] = cursor.fetchone()['total']
    cursor.execute("SELECT COUNT(*) as total FROM respuestas WHERE DATE(created_at) = DATE('now')")
    stats['respuestas_hoy'] = cursor.fetchone()['total']
    cursor.execute('SELECT programa, COUNT(*) as count FROM respuestas GROUP BY programa ORDER BY count DESC')
    stats['por_programa'] = [dict(row) for row in cursor.fetchall()]
    cursor.execute("SELECT tipo_evento, COUNT(*) as count FROM respuestas GROUP BY tipo_evento ORDER BY count DESC LIMIT 1")
    result = cursor.fetchone()
    stats['evento_popular'] = dict(result) if result else {}
    cursor.execute('SELECT horario, COUNT(*) as count FROM respuestas GROUP BY horario ORDER BY count DESC')
    stats['horarios'] = [dict(row) for row in cursor.fetchall()]
    cursor.execute('SELECT actividad, COUNT(*) as count FROM actividades_seleccionadas GROUP BY actividad ORDER BY count DESC LIMIT 5')
    stats['actividades_top'] = [dict(row) for row in cursor.fetchall()]
    cursor.execute('SELECT AVG(duracion_total_segundos) as promedio FROM respuestas')
    avg_result = cursor.fetchone()
    stats['tiempo_promedio'] = avg_result['promedio'] if avg_result and avg_result['promedio'] else 0
    cursor.execute('SELECT id, nombre, programa, created_at FROM respuestas ORDER BY created_at DESC LIMIT 5')
    stats['ultimas_respuestas'] = [dict(row) for row in cursor.fetchall()]

    with open(DATA_DIR / 'dashboard.json', 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=4)
    print("dashboard.json generado.")

    # 2. Generar statistics.json
    stats_detailed = {}
    cursor.execute('SELECT programa, COUNT(*) as count FROM respuestas GROUP BY programa ORDER BY count DESC')
    stats_detailed['por_programa'] = [dict(row) for row in cursor.fetchall()]
    cursor.execute('SELECT tipo_evento, COUNT(*) as count FROM respuestas GROUP BY tipo_evento ORDER BY count DESC')
    stats_detailed['por_tipo_evento'] = [dict(row) for row in cursor.fetchall()]
    cursor.execute('SELECT horario, COUNT(*) as count FROM respuestas GROUP BY horario ORDER BY count DESC')
    stats_detailed['por_horario'] = [dict(row) for row in cursor.fetchall()]
    cursor.execute('SELECT lugar, COUNT(*) as count FROM respuestas GROUP BY lugar ORDER BY count DESC')
    stats_detailed['por_lugar'] = [dict(row) for row in cursor.fetchall()]
    cursor.execute('SELECT acompanante, COUNT(*) as count FROM respuestas GROUP BY acompanante ORDER BY count DESC')
    stats_detailed['por_acompanante'] = [dict(row) for row in cursor.fetchall()]
    cursor.execute('SELECT actividad, COUNT(*) as count FROM actividades_seleccionadas GROUP BY actividad ORDER BY count DESC')
    stats_detailed['por_actividad'] = [dict(row) for row in cursor.fetchall()]

    with open(DATA_DIR / 'statistics.json', 'w', encoding='utf-8') as f:
        json.dump(stats_detailed, f, ensure_ascii=False, indent=4)
    print("statistics.json generado.")

    # 3. Generar respuestas.json (paginado) y detalles individuales
    cursor.execute('SELECT COUNT(*) as total FROM respuestas')
    total = cursor.fetchone()['total']
    per_page = 10
    total_pages = (total + per_page - 1) // per_page

    for page in range(1, total_pages + 1):
        offset = (page - 1) * per_page
        cursor.execute('SELECT r.id, r.session_id, r.nombre, r.email, r.telefono, r.programa, r.tipo_evento, r.horario, r.lugar, r.acompanante, r.sugerencias, r.created_at, r.duracion_total_segundos, u.latitude, u.longitude, u.accuracy FROM respuestas r LEFT JOIN ubicaciones u ON r.id = u.respuesta_id ORDER BY r.created_at DESC LIMIT ? OFFSET ?', (per_page, offset))
        respuestas = [dict(row) for row in cursor.fetchall()]
        
        page_data = {
            'respuestas': respuestas,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages
        }
        with open(DATA_DIR / f'respuestas_page_{page}.json', 'w', encoding='utf-8') as f:
            json.dump(page_data, f, ensure_ascii=False, indent=4)
    print(f"{total_pages} páginas de respuestas generadas.")

    # 4. Generar detalles de cada respuesta
    cursor.execute('SELECT id FROM respuestas')
    all_ids = [row['id'] for row in cursor.fetchall()]

    for respuesta_id in all_ids:
        cursor.execute('SELECT * FROM respuestas WHERE id = ?', (respuesta_id,))
        respuesta = dict(cursor.fetchone() or {})
        cursor.execute('SELECT * FROM videos WHERE respuesta_id = ?', (respuesta_id,))
        video = dict(cursor.fetchone() or {})
        cursor.execute('SELECT * FROM ubicaciones WHERE respuesta_id = ?', (respuesta_id,))
        ubicacion = dict(cursor.fetchone() or {})
        cursor.execute('SELECT actividad FROM actividades_seleccionadas WHERE respuesta_id = ?', (respuesta_id,))
        actividades = [row['actividad'] for row in cursor.fetchall()]
        cursor.execute('SELECT * FROM dispositivos WHERE respuesta_id = ?', (respuesta_id,))
        dispositivo = dict(cursor.fetchone() or {})
        cursor.execute('SELECT * FROM step_times WHERE respuesta_id = ? ORDER BY step_number', (respuesta_id,))
        step_times = [dict(row) for row in cursor.fetchall()]
        cursor.execute('SELECT * FROM validation_attempts WHERE respuesta_id = ?', (respuesta_id,))
        validation_attempts = [dict(row) for row in cursor.fetchall()]

        detail_data = {
            'respuesta': respuesta,
            'video': video,
            'ubicacion': ubicacion,
            'actividades': actividades,
            'dispositivo': dispositivo,
            'step_times': step_times,
            'validation_attempts': validation_attempts
        }
        with open(DATA_DIR / 'respuestas' / f'{respuesta_id}.json', 'w', encoding='utf-8') as f:
            json.dump(detail_data, f, ensure_ascii=False, indent=4)
    print(f"{len(all_ids)} archivos de detalle de respuesta generados.")

    conn.close()
    print("\nGeneración de datos estáticos completada.")

if __name__ == '__main__':
    generate_static_data()
