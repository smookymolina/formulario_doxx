# Formulario de Egresados de Posgrado

Sistema completo de formulario con captura de video, geolocalización y base de datos SQLite.

## 🚀 Características

### Frontend
- ✅ Diseño responsive mobile-first
- ✅ Sistema de 5 pasos con validaciones
- ✅ Captura de video de 5 segundos
- ✅ Geolocalización GPS con alta precisión
- ✅ 10 preguntas sobre preferencias del evento
- ✅ Tracking de sesión y analytics

### Backend
- ✅ API REST con Flask
- ✅ Base de datos SQLite
- ✅ Almacenamiento de videos
- ✅ Hashing de archivos (MD5/SHA256)
- ✅ Logs de eventos
- ✅ Estadísticas y reportes

### Datos Capturados

**Formulario:**
- Datos personales (nombre, email, teléfono, programa)
- Preferencias del evento (tipo, horario, actividades, lugar)
- Comentarios y sugerencias

**Metadata Automática:**
- Video de verificación (5 segundos)
- Ubicación GPS (lat, long, accuracy, altitude, etc.)
- Información del dispositivo (SO, navegador, pantalla)
- Tiempos de completado por paso
- Intentos de validación
- User Agent completo
- Timestamp de inicio/fin
- Session ID único

## 📁 Estructura del Proyecto

```
formulario_doxx/
├── css/
│   └── styles.css              # Estilos CSS mobile-first
├── js/
│   └── app.js                  # Lógica del frontend
├── server/
│   └── app.py                  # Servidor Flask + API
├── database/
│   ├── schema.sql              # Esquema de base de datos
│   └── formulario.db           # Base de datos SQLite (generada)
├── uploads/
│   └── videos/                 # Videos subidos
├── index.html                  # HTML monolítico (GitHub Pages)
├── index_modular.html          # HTML modular (desarrollo)
└── requirements.txt            # Dependencias Python
```

## 🛠️ Instalación

### Paso 1: Clonar el repositorio

```bash
git clone https://github.com/smookymolina/formulario_doxx.git
cd formulario_doxx
```

### Paso 2: Instalar dependencias de Python

```bash
pip install -r requirements.txt
```

### Paso 3: Iniciar el servidor

```bash
python server/app.py
```

El servidor se iniciará en `http://localhost:5000`

### Paso 4: Abrir el frontend

Para desarrollo local:
```bash
# Opción 1: Usar index_modular.html
open index_modular.html

# Opción 2: Servidor HTTP simple
python -m http.server 8000
# Luego abrir: http://localhost:8000/index_modular.html
```

Para GitHub Pages:
- El archivo `index.html` ya está configurado
- URL: https://smookymolina.github.io/formulario_doxx/

## 🔧 Configuración

### Conectar Frontend con Backend Local

Edita `js/app.js`:

```javascript
// Cambiar de:
const API_URL = '/api';

// A:
const API_URL = 'http://localhost:5000/api';
```

### CORS para Producción

En `server/app.py`, configurar CORS específico:

```python
CORS(app, origins=['https://smookymolina.github.io'])
```

## 📊 Base de Datos

### Esquema

La base de datos incluye 8 tablas:

1. **respuestas** - Datos principales del formulario
2. **videos** - Metadata de videos
3. **ubicaciones** - Coordenadas GPS
4. **actividades_seleccionadas** - Actividades elegidas
5. **dispositivos** - Información del dispositivo
6. **step_times** - Tiempos por paso
7. **validation_attempts** - Intentos de validación
8. **event_logs** - Logs de eventos

### Consultas Útiles

```sql
-- Ver todas las respuestas
SELECT * FROM v_respuestas_completas;

-- Estadísticas por programa
SELECT * FROM v_stats_por_programa;

-- Actividades más populares
SELECT actividad, COUNT(*) as total
FROM actividades_seleccionadas
GROUP BY actividad
ORDER BY total DESC;
```

## 🌐 API Endpoints

### POST /api/submit-form
Enviar formulario completo

**Request:**
- `FormData` con video y datos JSON

**Response:**
```json
{
  "success": true,
  "respuestaId": 1,
  "sessionId": "session_1234567890_abc123"
}
```

### GET /api/stats
Obtener estadísticas

**Response:**
```json
{
  "total_respuestas": 42,
  "por_programa": [...],
  "tipo_evento": [...],
  "tiempo_promedio_segundos": 180
}
```

### GET /api/health
Verificar estado del servidor

## 📱 Deployment

### GitHub Pages (Frontend)

Ya está desplegado en:
- https://smookymolina.github.io/formulario_doxx/

### Backend (Opciones)

**Opción 1: Heroku**
```bash
heroku create formulario-egresados
git push heroku main
```

**Opción 2: Railway**
```bash
railway init
railway up
```

**Opción 3: PythonAnywhere**
- Subir archivos
- Configurar WSGI
- Ajustar rutas

## 🔒 Seguridad

- Videos hasheados con MD5 y SHA256
- CORS configurado
- Validación de tipos de archivo
- Límite de tamaño: 50MB
- Session IDs únicos
- Logs de auditoría

## 📈 Analytics

El sistema captura automáticamente:
- Tiempo promedio por paso
- Tasa de abandono
- Dispositivos más usados
- Errores de validación
- Precisión de GPS

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es de código abierto.

## 👨‍💻 Autor

smookymolina

---

🤖 Generado con [Claude Code](https://claude.com/claude-code)
