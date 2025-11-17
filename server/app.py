#!/usr/bin/env python3
"""
Servidor Backend para Formulario de Egresados
Gestiona la recepción de datos y almacenamiento en SQLite
"""

import os
import json
import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# ===================================
# CONFIGURACIÓN
# ===================================

app = Flask(__name__)
CORS(app)  # Permitir CORS para desarrollo

# Configuración de carpetas
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / 'database' / 'formulario.db'
VIDEOS_DIR = BASE_DIR / 'uploads' / 'videos'
SCHEMA_PATH = BASE_DIR / 'database' / 'schema.sql'

# Crear carpetas si no existen
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

# Configuración
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max
ALLOWED_VIDEO_EXTENSIONS = {'webm', 'mp4', 'mov'}

# ===================================
# FUNCIONES DE BASE DE DATOS
# ===================================

def get_db():
    """Obtener conexión a la base de datos"""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializar base de datos con el schema"""
    if not DATABASE_PATH.exists():
        print(f"Creando base de datos en: {DATABASE_PATH}")
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            schema = f.read()

        conn = get_db()
        conn.executescript(schema)
        conn.commit()
        conn.close()
        print("Base de datos creada exitosamente")
    else:
        print(f"Base de datos ya existe en: {DATABASE_PATH}")

def calculate_file_hash(file_data, algorithm='md5'):
    """Calcular hash de un archivo"""
    hash_obj = hashlib.new(algorithm)
    hash_obj.update(file_data)
    return hash_obj.hexdigest()

# ===================================
# FUNCIONES DE UTILIDAD
# ===================================

def allowed_file(filename):
    """Verificar si el archivo es permitido"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

def get_client_ip():
    """Obtener IP del cliente"""
    if request.environ.get('HTTP_X_FORWARDED_FOR'):
        return request.environ['HTTP_X_FORWARDED_FOR'].split(',')[0]
    return request.environ.get('REMOTE_ADDR', 'unknown')

def log_event(session_id, event_type, event_data=None):
    """Registrar evento en la base de datos"""
    conn = get_db()
    conn.execute('''
        INSERT INTO event_logs (session_id, event_type, event_data, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        session_id,
        event_type,
        json.dumps(event_data) if event_data else None,
        get_client_ip(),
        request.headers.get('User-Agent', 'unknown')
    ))
    conn.commit()
    conn.close()

# ===================================
# ENDPOINTS DE LA API
# ===================================

@app.route('/api/submit-form', methods=['POST'])
def submit_form():
    """Endpoint principal para recibir el formulario"""
    try:
        # Obtener datos JSON
        datos_json = request.form.get('datos')
        if not datos_json:
            return jsonify({'error': 'No se recibieron datos'}), 400

        datos = json.loads(datos_json)
        session_id = datos.get('sessionId')

        # Log del evento
        log_event(session_id, 'form_submission_started', {'email': datos.get('email')})

        # Obtener archivo de video
        if 'video' not in request.files:
            return jsonify({'error': 'No se recibió el video'}), 400

        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({'error': 'Nombre de archivo vacío'}), 400

        if not allowed_file(video_file.filename):
            return jsonify({'error': 'Tipo de archivo no permitido'}), 400

        # Leer datos del video
        video_data = video_file.read()
        video_size = len(video_data)

        # Calcular hashes
        md5_hash = calculate_file_hash(video_data, 'md5')
        sha256_hash = calculate_file_hash(video_data, 'sha256')

        # Guardar video con nombre único
        filename = secure_filename(f"{session_id}_{md5_hash[:8]}.webm")
        filepath = VIDEOS_DIR / filename

        with open(filepath, 'wb') as f:
            f.write(video_data)

        # ===================================
        # INSERTAR EN BASE DE DATOS
        # ===================================

        conn = get_db()
        cursor = conn.cursor()

        try:
            # 1. Insertar respuesta principal
            cursor.execute('''
                INSERT INTO respuestas (
                    session_id, start_time, end_time,
                    nombre, email, telefono, programa,
                    tipo_evento, horario, lugar, acompanante, sugerencias,
                    intentos_validacion_total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session_id,
                datos['startTime'],
                datos['endTime'],
                datos['nombre'],
                datos['email'],
                datos['telefono'],
                datos['programa'],
                datos['tipoEvento'],
                datos['horario'],
                datos['lugar'],
                datos['acompanante'],
                datos.get('sugerencias', ''),
                sum(datos.get('validationAttempts', {}).values())
            ))

            respuesta_id = cursor.lastrowid

            # 2. Insertar video
            video_metadata = datos.get('videoMetadata', {})
            cursor.execute('''
                INSERT INTO videos (
                    respuesta_id, session_id, filename, filepath,
                    file_size, mime_type, duracion_segundos,
                    recorded_at, md5_hash, sha256_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                respuesta_id,
                session_id,
                filename,
                str(filepath),
                video_size,
                video_metadata.get('type', 'video/webm'),
                video_metadata.get('duration', 0),
                video_metadata.get('recordedAt'),
                md5_hash,
                sha256_hash
            ))

            # 3. Insertar ubicación
            ubicacion = datos.get('ubicacion', {})
            if ubicacion:
                cursor.execute('''
                    INSERT INTO ubicaciones (
                        respuesta_id, session_id,
                        latitude, longitude, accuracy,
                        altitude, altitude_accuracy, heading, speed,
                        timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    respuesta_id,
                    session_id,
                    ubicacion['latitude'],
                    ubicacion['longitude'],
                    ubicacion.get('accuracy'),
                    ubicacion.get('altitude'),
                    ubicacion.get('altitudeAccuracy'),
                    ubicacion.get('heading'),
                    ubicacion.get('speed'),
                    ubicacion['timestamp']
                ))

            # 4. Insertar actividades seleccionadas
            actividades = datos.get('actividades', [])
            for actividad in actividades:
                cursor.execute('''
                    INSERT INTO actividades_seleccionadas (respuesta_id, actividad)
                    VALUES (?, ?)
                ''', (respuesta_id, actividad))

            # 5. Insertar información del dispositivo
            device_info = datos.get('deviceInfo', {})
            if device_info:
                screen = device_info.get('screenResolution', {})
                viewport = device_info.get('viewport', {})

                cursor.execute('''
                    INSERT INTO dispositivos (
                        respuesta_id, session_id,
                        user_agent, platform, language,
                        screen_width, screen_height,
                        viewport_width, viewport_height,
                        touch_support, device_memory,
                        hardware_concurrency, timezone
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    respuesta_id,
                    session_id,
                    device_info.get('userAgent'),
                    device_info.get('platform'),
                    device_info.get('language'),
                    screen.get('width'),
                    screen.get('height'),
                    viewport.get('width'),
                    viewport.get('height'),
                    device_info.get('touchSupport', False),
                    str(device_info.get('deviceMemory', 'unknown')),
                    str(device_info.get('hardwareConcurrency', 'unknown')),
                    device_info.get('timezone')
                ))

            # 6. Insertar tiempos por paso
            step_times = datos.get('stepTimes', {})
            for step_key, times in step_times.items():
                step_number = int(step_key.replace('step', ''))
                cursor.execute('''
                    INSERT INTO step_times (
                        respuesta_id, session_id, step_number,
                        entered_at, completed_at, duration_seconds
                    ) VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    respuesta_id,
                    session_id,
                    step_number,
                    times.get('entered'),
                    times.get('completed'),
                    times.get('duration')
                ))

            # 7. Insertar intentos de validación
            validation_attempts = datos.get('validationAttempts', {})
            for step_key, attempts in validation_attempts.items():
                step_number = int(step_key.replace('step', ''))
                cursor.execute('''
                    INSERT INTO validation_attempts (
                        respuesta_id, session_id, step_number, attempts_count
                    ) VALUES (?, ?, ?, ?)
                ''', (respuesta_id, session_id, step_number, attempts))

            # Commit de todas las transacciones
            conn.commit()

            # Log de éxito
            log_event(session_id, 'form_submission_success', {
                'respuesta_id': respuesta_id,
                'email': datos['email']
            })

            return jsonify({
                'success': True,
                'message': 'Formulario guardado exitosamente',
                'respuestaId': respuesta_id,
                'sessionId': session_id
            }), 200

        except Exception as e:
            conn.rollback()
            log_event(session_id, 'form_submission_error', {'error': str(e)})
            raise e

        finally:
            conn.close()

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'error': 'Error al procesar el formulario',
            'details': str(e)
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Obtener estadísticas del formulario"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        stats = {}

        # Total de respuestas
        cursor.execute('SELECT COUNT(*) as total FROM respuestas')
        stats['total_respuestas'] = cursor.fetchone()['total']

        # Respuestas por programa
        cursor.execute('''
            SELECT programa, COUNT(*) as count
            FROM respuestas
            GROUP BY programa
            ORDER BY count DESC
        ''')
        stats['por_programa'] = [dict(row) for row in cursor.fetchall()]

        # Tipo de evento preferido
        cursor.execute('''
            SELECT tipo_evento, COUNT(*) as count
            FROM respuestas
            GROUP BY tipo_evento
            ORDER BY count DESC
        ''')
        stats['tipo_evento'] = [dict(row) for row in cursor.fetchall()]

        # Tiempo promedio de completado
        cursor.execute('SELECT AVG(duracion_total_segundos) as promedio FROM respuestas')
        stats['tiempo_promedio_segundos'] = cursor.fetchone()['promedio']

        conn.close()

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Verificar que el servidor esté funcionando"""
    return jsonify({
        'status': 'ok',
        'database': str(DATABASE_PATH),
        'videos_dir': str(VIDEOS_DIR)
    }), 200

# ===================================
# PANEL DE ADMINISTRACIÓN - ENDPOINTS
# ===================================

@app.route('/api/admin/respuestas', methods=['GET'])
def get_all_respuestas():
    """Obtener todas las respuestas con paginación"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        offset = (page - 1) * per_page

        conn = get_db()
        cursor = conn.cursor()

        # Contar total
        cursor.execute('SELECT COUNT(*) as total FROM respuestas')
        total = cursor.fetchone()['total']

        # Obtener respuestas con ubicación (JOIN)
        cursor.execute('''
            SELECT
                r.id, r.session_id, r.nombre, r.email, r.telefono,
                r.programa, r.tipo_evento, r.horario, r.lugar,
                r.acompanante, r.sugerencias, r.created_at,
                r.duracion_total_segundos,
                u.latitude, u.longitude, u.accuracy
            FROM respuestas r
            LEFT JOIN ubicaciones u ON r.id = u.respuesta_id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        ''', (per_page, offset))

        respuestas = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return jsonify({
            'respuestas': respuestas,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }), 200

    except Exception as e:
        print(f"Error en get_all_respuestas: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/respuesta/<int:respuesta_id>', methods=['GET'])
def get_respuesta_detail(respuesta_id):
    """Obtener detalles completos de una respuesta"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Respuesta principal
        cursor.execute('SELECT * FROM respuestas WHERE id = ?', (respuesta_id,))
        respuesta = dict(cursor.fetchone() or {})

        if not respuesta:
            return jsonify({'error': 'Respuesta no encontrada'}), 404

        # Video
        cursor.execute('SELECT * FROM videos WHERE respuesta_id = ?', (respuesta_id,))
        video = dict(cursor.fetchone() or {})

        # Ubicación
        cursor.execute('SELECT * FROM ubicaciones WHERE respuesta_id = ?', (respuesta_id,))
        ubicacion = dict(cursor.fetchone() or {})

        # Actividades
        cursor.execute('SELECT actividad FROM actividades_seleccionadas WHERE respuesta_id = ?', (respuesta_id,))
        actividades = [row['actividad'] for row in cursor.fetchall()]

        # Dispositivo
        cursor.execute('SELECT * FROM dispositivos WHERE respuesta_id = ?', (respuesta_id,))
        dispositivo = dict(cursor.fetchone() or {})

        # Step times
        cursor.execute('SELECT * FROM step_times WHERE respuesta_id = ? ORDER BY step_number', (respuesta_id,))
        step_times = [dict(row) for row in cursor.fetchall()]

        # Validation attempts
        cursor.execute('SELECT * FROM validation_attempts WHERE respuesta_id = ?', (respuesta_id,))
        validation_attempts = [dict(row) for row in cursor.fetchall()]

        conn.close()

        return jsonify({
            'respuesta': respuesta,
            'video': video,
            'ubicacion': ubicacion,
            'actividades': actividades,
            'dispositivo': dispositivo,
            'step_times': step_times,
            'validation_attempts': validation_attempts
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/video/<int:respuesta_id>', methods=['GET'])
def get_video(respuesta_id):
    """Servir video de una respuesta"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute('SELECT filepath FROM videos WHERE respuesta_id = ?', (respuesta_id,))
        result = cursor.fetchone()
        conn.close()

        if not result:
            return jsonify({'error': 'Video no encontrado'}), 404

        from flask import send_file
        return send_file(result['filepath'], mimetype='video/webm')

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Obtener estadísticas para el dashboard"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        stats = {}

        # Total de respuestas
        cursor.execute('SELECT COUNT(*) as total FROM respuestas')
        stats['total_respuestas'] = cursor.fetchone()['total']

        # Respuestas hoy
        cursor.execute("SELECT COUNT(*) as total FROM respuestas WHERE DATE(created_at) = DATE('now')")
        stats['respuestas_hoy'] = cursor.fetchone()['total']

        # Por programa
        cursor.execute('''
            SELECT programa, COUNT(*) as count
            FROM respuestas
            GROUP BY programa
            ORDER BY count DESC
        ''')
        stats['por_programa'] = [dict(row) for row in cursor.fetchall()]

        # Tipo de evento más popular
        cursor.execute('''
            SELECT tipo_evento, COUNT(*) as count
            FROM respuestas
            GROUP BY tipo_evento
            ORDER BY count DESC
            LIMIT 1
        ''')
        result = cursor.fetchone()
        stats['evento_popular'] = dict(result) if result else {}

        # Horario preferido
        cursor.execute('''
            SELECT horario, COUNT(*) as count
            FROM respuestas
            GROUP BY horario
            ORDER BY count DESC
        ''')
        stats['horarios'] = [dict(row) for row in cursor.fetchall()]

        # Actividades más solicitadas
        cursor.execute('''
            SELECT actividad, COUNT(*) as count
            FROM actividades_seleccionadas
            GROUP BY actividad
            ORDER BY count DESC
            LIMIT 5
        ''')
        stats['actividades_top'] = [dict(row) for row in cursor.fetchall()]

        # Tiempo promedio de llenado
        cursor.execute('SELECT AVG(duracion_total_segundos) as promedio FROM respuestas')
        avg_result = cursor.fetchone()
        stats['tiempo_promedio'] = avg_result['promedio'] if avg_result and avg_result['promedio'] else 0

        # Últimas respuestas
        cursor.execute('''
            SELECT id, nombre, programa, created_at
            FROM respuestas
            ORDER BY created_at DESC
            LIMIT 5
        ''')
        stats['ultimas_respuestas'] = [dict(row) for row in cursor.fetchall()]

        conn.close()

        return jsonify(stats), 200

    except Exception as e:
        print(f"Error en get_dashboard_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ===================================
# INICIALIZACIÓN
# ===================================

if __name__ == '__main__':
    print("=" * 50)
    print("Inicializando servidor...")
    print("=" * 50)

    # Inicializar base de datos
    init_db()

    print(f"\nBase de datos: {DATABASE_PATH}")
    print(f"Carpeta de videos: {VIDEOS_DIR}")
    print("\nIniciando servidor Flask...")
    print("=" * 50)

    # Iniciar servidor
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
