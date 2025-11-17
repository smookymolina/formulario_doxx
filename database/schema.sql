-- ===================================
-- BASE DE DATOS SQLITE
-- Formulario Egresados de Posgrado
-- ===================================

-- Tabla principal: Respuestas del formulario
CREATE TABLE IF NOT EXISTS respuestas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,

    -- Timestamps
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Datos personales
    nombre TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    programa TEXT NOT NULL,

    -- Preferencias del evento
    tipo_evento TEXT NOT NULL,
    horario TEXT NOT NULL,
    lugar TEXT NOT NULL,
    acompanante TEXT NOT NULL,
    sugerencias TEXT,

    -- Metadata
    duracion_total_segundos INTEGER,
    intentos_validacion_total INTEGER
);

-- Tabla: Videos de verificación
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    respuesta_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,

    -- Archivo
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,

    -- Metadata
    duracion_segundos REAL,
    recorded_at DATETIME,

    -- Hash para integridad
    md5_hash TEXT,
    sha256_hash TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (respuesta_id) REFERENCES respuestas(id) ON DELETE CASCADE
);

-- Tabla: Ubicaciones GPS
CREATE TABLE IF NOT EXISTS ubicaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    respuesta_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,

    -- Coordenadas
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    altitude REAL,
    altitude_accuracy REAL,
    heading REAL,
    speed REAL,

    -- Timestamp
    timestamp DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (respuesta_id) REFERENCES respuestas(id) ON DELETE CASCADE
);

-- Tabla: Actividades seleccionadas (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS actividades_seleccionadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    respuesta_id INTEGER NOT NULL,
    actividad TEXT NOT NULL,

    FOREIGN KEY (respuesta_id) REFERENCES respuestas(id) ON DELETE CASCADE
);

-- Tabla: Información del dispositivo
CREATE TABLE IF NOT EXISTS dispositivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    respuesta_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,

    -- User Agent
    user_agent TEXT,
    platform TEXT,
    language TEXT,

    -- Pantalla
    screen_width INTEGER,
    screen_height INTEGER,
    viewport_width INTEGER,
    viewport_height INTEGER,

    -- Capacidades
    touch_support BOOLEAN,
    device_memory TEXT,
    hardware_concurrency TEXT,
    timezone TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (respuesta_id) REFERENCES respuestas(id) ON DELETE CASCADE
);

-- Tabla: Tiempos por paso
CREATE TABLE IF NOT EXISTS step_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    respuesta_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,

    step_number INTEGER NOT NULL,
    entered_at DATETIME NOT NULL,
    completed_at DATETIME,
    duration_seconds REAL,

    FOREIGN KEY (respuesta_id) REFERENCES respuestas(id) ON DELETE CASCADE
);

-- Tabla: Intentos de validación
CREATE TABLE IF NOT EXISTS validation_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    respuesta_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,

    step_number INTEGER NOT NULL,
    attempts_count INTEGER NOT NULL,

    FOREIGN KEY (respuesta_id) REFERENCES respuestas(id) ON DELETE CASCADE
);

-- Tabla: Logs de eventos (para debugging y análisis)
CREATE TABLE IF NOT EXISTS event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT, -- JSON
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- ÍNDICES para optimizar búsquedas
-- ===================================

CREATE INDEX IF NOT EXISTS idx_respuestas_session_id ON respuestas(session_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_email ON respuestas(email);
CREATE INDEX IF NOT EXISTS idx_respuestas_created_at ON respuestas(created_at);

CREATE INDEX IF NOT EXISTS idx_videos_session_id ON videos(session_id);
CREATE INDEX IF NOT EXISTS idx_videos_respuesta_id ON videos(respuesta_id);

CREATE INDEX IF NOT EXISTS idx_ubicaciones_session_id ON ubicaciones(session_id);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_respuesta_id ON ubicaciones(respuesta_id);

CREATE INDEX IF NOT EXISTS idx_event_logs_session_id ON event_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);

-- ===================================
-- VISTAS para análisis de datos
-- ===================================

-- Vista completa de respuestas con ubicación
CREATE VIEW IF NOT EXISTS v_respuestas_completas AS
SELECT
    r.*,
    u.latitude,
    u.longitude,
    u.accuracy AS gps_accuracy,
    v.filename AS video_filename,
    v.file_size AS video_size,
    d.user_agent,
    d.platform,
    d.screen_width,
    d.screen_height
FROM respuestas r
LEFT JOIN ubicaciones u ON r.id = u.respuesta_id
LEFT JOIN videos v ON r.id = v.respuesta_id
LEFT JOIN dispositivos d ON r.id = d.respuesta_id;

-- Vista de actividades por respuesta
CREATE VIEW IF NOT EXISTS v_actividades_por_respuesta AS
SELECT
    r.id AS respuesta_id,
    r.nombre,
    r.email,
    GROUP_CONCAT(a.actividad, ', ') AS actividades
FROM respuestas r
LEFT JOIN actividades_seleccionadas a ON r.id = a.respuesta_id
GROUP BY r.id, r.nombre, r.email;

-- Vista de estadísticas por programa
CREATE VIEW IF NOT EXISTS v_stats_por_programa AS
SELECT
    programa,
    COUNT(*) AS total_respuestas,
    AVG(duracion_total_segundos) AS tiempo_promedio,
    COUNT(CASE WHEN tipo_evento = 'formal' THEN 1 END) AS prefieren_formal,
    COUNT(CASE WHEN tipo_evento = 'semiformal' THEN 1 END) AS prefieren_semiformal,
    COUNT(CASE WHEN tipo_evento = 'casual' THEN 1 END) AS prefieren_casual,
    COUNT(CASE WHEN acompanante = 'si' THEN 1 END) AS con_acompanante
FROM respuestas
GROUP BY programa;

-- ===================================
-- TRIGGERS para mantener integridad
-- ===================================

-- Calcular duración total al insertar
CREATE TRIGGER IF NOT EXISTS calculate_duration
AFTER INSERT ON respuestas
BEGIN
    UPDATE respuestas
    SET duracion_total_segundos =
        (julianday(end_time) - julianday(start_time)) * 86400
    WHERE id = NEW.id;
END;
