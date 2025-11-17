// ===================================
// PANEL DE ADMINISTRACIÓN - JAVASCRIPT
// ===================================

const API_URL = 'http://localhost:5000/api';
let currentPage = 1;
let allRespuestas = [];
let generalMap = null;
let detailMap = null;

// ===================================
// INICIALIZACIÓN
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Panel de Administración iniciado');

    // Verificar autenticación usando el sistema de auth
    if (!window.authSystem.authenticate()) {
        window.location.href = 'index.html';
    }

    // Cargar datos iniciales
    loadDashboard();
    loadRespuestas();

    // Renovar sesión cada 5 minutos
    setInterval(() => {
        window.authSystem.renewSession();
    }, 300000);
});

// ===================================
// NAVEGACIÓN ENTRE PÁGINAS
// ===================================

function showPage(pageName) {
    // Verificar autenticación antes de navegar
    if (!window.authSystem.isAuthenticated()) {
        alert('⏰ Tu sesión ha expirado');
        window.location.href = 'index.html';
    }

    // Ocultar todas las páginas y botones
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // Mostrar página seleccionada
    const pageElement = document.getElementById(pageName);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Activar botón correspondiente
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(pageName)) {
            btn.classList.add('active');
        }
    });

    // Cargar datos específicos según la página
    if (pageName === 'mapa' && !generalMap) {
        loadGeneralMap();
    } else if (pageName === 'estadisticas') {
        loadDetailedStats();
    }
}

// ===================
// DASHBOARD
// ===================

async function loadDashboard() {
    try {
        console.log('Cargando dashboard...');
        const response = await fetch(`${API_URL}/admin/dashboard`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Datos del dashboard:', data);

        // Actualizar tarjetas de estadísticas
        document.getElementById('totalRespuestas').textContent = data.total_respuestas || 0;
        document.getElementById('respuestasHoy').textContent = data.respuestas_hoy || 0;

        const tiempoMin = data.tiempo_promedio ? (data.tiempo_promedio / 60).toFixed(1) : '0';
        document.getElementById('tiempoPromedio').textContent = tiempoMin;

        const programaTop = data.por_programa && data.por_programa.length > 0
            ? data.por_programa[0].programa
            : 'N/A';
        document.getElementById('programaTop').textContent = formatPrograma(programaTop);

        // Últimas respuestas
        renderUltimasRespuestas(data.ultimas_respuestas || []);

        // Top actividades
        renderTopActividades(data.actividades_top || []);

    } catch (error) {
        console.error('Error cargando dashboard:', error);
        document.getElementById('ultimasRespuestas').innerHTML =
            `<p style="text-align:center;color:#dc3545;">❌ Error al cargar datos: ${error.message}</p>`;
        document.getElementById('topActividades').innerHTML =
            `<p style="text-align:center;color:#dc3545;">❌ Error al cargar datos</p>`;
    }
}

function renderUltimasRespuestas(respuestas) {
    const container = document.getElementById('ultimasRespuestas');

    if (respuestas.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;">No hay respuestas aún</p>';
        return;
    }

    const html = `
        <table style="width: 100%;">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Programa</th>
                    <th>Fecha</th>
                </tr>
            </thead>
            <tbody>
                ${respuestas.map(r => `
                    <tr onclick="verDetalle(${r.id})" style="cursor: pointer;">
                        <td>#${r.id}</td>
                        <td>${r.nombre}</td>
                        <td><span class="badge badge-info">${formatPrograma(r.programa)}</span></td>
                        <td>${formatDate(r.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderTopActividades(actividades) {
    const container = document.getElementById('topActividades');

    if (actividades.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;">No hay datos aún</p>';
        return;
    }

    const maxVotos = Math.max(...actividades.map(a => a.count));

    const html = actividades.map(a => {
        const percentage = (a.count / maxVotos) * 100;
        return `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: 600;">${formatActividad(a.actividad)}</span>
                    <span style="color: #667eea; font-weight: 600;">${a.count} votos</span>
                </div>
                <div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100%; width: ${percentage}%; transition: width 0.5s;"></div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// ===================
// RESPUESTAS
// ===================

async function loadRespuestas(page = 1) {
    try {
        console.log(`Cargando respuestas - página ${page}...`);
        const response = await fetch(`${API_URL}/admin/respuestas?page=${page}&per_page=10`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Respuestas cargadas:', data);

        allRespuestas = data.respuestas || [];
        currentPage = page;

        renderRespuestasTable(allRespuestas);
        renderPagination(data.page, data.total_pages);

    } catch (error) {
        console.error('Error cargando respuestas:', error);
        document.getElementById('respuestasBody').innerHTML = `
            <tr><td colspan="6" style="text-align:center;color:#dc3545;">
                ❌ Error al cargar respuestas: ${error.message}<br>
                <small>Asegúrate de que el servidor esté ejecutándose en http://localhost:5000</small>
            </td></tr>
        `;
    }
}

function renderRespuestasTable(respuestas) {
    const tbody = document.getElementById('respuestasBody');

    if (respuestas.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align:center;color:#999;">No hay respuestas</td></tr>
        `;
        return;
    }

    tbody.innerHTML = respuestas.map(r => `
        <tr onclick="verDetalle(${r.id})">
            <td>#${r.id}</td>
            <td><strong>${r.nombre}</strong></td>
            <td>${r.email}</td>
            <td><span class="badge badge-info">${formatPrograma(r.programa)}</span></td>
            <td>${formatDate(r.created_at)}</td>
            <td>
                <button class="btn-view" onclick="event.stopPropagation(); verDetalle(${r.id})">
                    Ver Detalle
                </button>
            </td>
        </tr>
    `).join('');
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination');

    if (total <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="loadRespuestas(${current - 1})">
            ← Anterior
        </button>
    `;

    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
            html += `
                <button class="page-btn ${i === current ? 'active' : ''}" onclick="loadRespuestas(${i})">
                    ${i}
                </button>
            `;
        } else if (i === current - 3 || i === current + 3) {
            html += '<span style="padding: 0 5px;">...</span>';
        }
    }

    html += `
        <button class="page-btn" ${current === total ? 'disabled' : ''} onclick="loadRespuestas(${current + 1})">
            Siguiente →
        </button>
    `;

    container.innerHTML = html;
}

function filterTable() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();

    if (!searchValue) {
        renderRespuestasTable(allRespuestas);
        return;
    }

    const filtered = allRespuestas.filter(r =>
        r.nombre.toLowerCase().includes(searchValue) ||
        r.email.toLowerCase().includes(searchValue)
    );

    renderRespuestasTable(filtered);
}

// ===================
// DETALLE
// ===================

async function verDetalle(respuestaId) {
    try {
        console.log(`Cargando detalle de respuesta ${respuestaId}...`);
        const response = await fetch(`${API_URL}/admin/respuesta/${respuestaId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Detalle cargado:', data);

        renderModalDetalle(data);
        document.getElementById('modalDetalle').classList.add('active');

        // Inicializar mapa si hay ubicación
        if (data.ubicacion && data.ubicacion.latitude) {
            setTimeout(() => {
                initDetailMap(data.ubicacion);
            }, 300);
        }

    } catch (error) {
        console.error('Error cargando detalle:', error);
        alert(`Error al cargar el detalle: ${error.message}`);
    }
}

function renderModalDetalle(data) {
    const { respuesta, video, ubicacion, actividades, dispositivo, step_times } = data;

    const html = `
        <!-- Video -->
        ${video && video.filepath ? `
            <div class="detail-section">
                <h3>📹 Video de Verificación</h3>
                <video id="detailVideo" controls>
                    <source src="${API_URL}/admin/video/${respuesta.id}" type="video/webm">
                    Tu navegador no soporta video.
                </video>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <div class="detail-item" style="flex: 1;">
                        <div class="detail-label">Tamaño</div>
                        <div class="detail-value">${formatBytes(video.file_size)}</div>
                    </div>
                    <div class="detail-item" style="flex: 1;">
                        <div class="detail-label">Duración</div>
                        <div class="detail-value">${video.duracion_segundos}s</div>
                    </div>
                    <div class="detail-item" style="flex: 1;">
                        <div class="detail-label">MD5 Hash</div>
                        <div class="detail-value" style="font-size: 11px; word-break: break-all;">${video.md5_hash || 'N/A'}</div>
                    </div>
                </div>
            </div>
        ` : ''}

        <!-- Datos Personales -->
        <div class="detail-section">
            <h3>👤 Datos Personales</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Nombre</div>
                    <div class="detail-value">${respuesta.nombre}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${respuesta.email}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Teléfono</div>
                    <div class="detail-value">${respuesta.telefono}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Programa</div>
                    <div class="detail-value">${formatPrograma(respuesta.programa)}</div>
                </div>
            </div>
        </div>

        <!-- Preferencias del Evento -->
        <div class="detail-section">
            <h3>🎉 Preferencias del Evento</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Tipo de Evento</div>
                    <div class="detail-value">${formatTipoEvento(respuesta.tipo_evento)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Horario</div>
                    <div class="detail-value">${formatHorario(respuesta.horario)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Lugar</div>
                    <div class="detail-value">${formatLugar(respuesta.lugar)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Acompañante</div>
                    <div class="detail-value">${respuesta.acompanante === 'si' ? 'Sí' : 'No'}</div>
                </div>
            </div>

            ${actividades && actividades.length > 0 ? `
                <div style="margin-top: 15px;">
                    <div class="detail-label">Actividades Seleccionadas</div>
                    <div class="activities-list">
                        ${actividades.map(a => `<span class="activity-tag">${formatActividad(a)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            ${respuesta.sugerencias ? `
                <div style="margin-top: 15px;">
                    <div class="detail-label">Sugerencias</div>
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-top: 8px;">
                        ${respuesta.sugerencias}
                    </div>
                </div>
            ` : ''}
        </div>

        <!-- Ubicación -->
        ${ubicacion && ubicacion.latitude ? `
            <div class="detail-section">
                <h3>📍 Ubicación GPS</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Latitud</div>
                        <div class="detail-value">${ubicacion.latitude.toFixed(6)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Longitud</div>
                        <div class="detail-value">${ubicacion.longitude.toFixed(6)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Precisión</div>
                        <div class="detail-value">${ubicacion.accuracy ? ubicacion.accuracy.toFixed(0) + 'm' : 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Altitud</div>
                        <div class="detail-value">${ubicacion.altitude ? ubicacion.altitude.toFixed(0) + 'm' : 'N/A'}</div>
                    </div>
                </div>
                <div id="detailMap"></div>
            </div>
        ` : ''}

        <!-- Información del Dispositivo -->
        ${dispositivo && dispositivo.user_agent ? `
            <div class="detail-section">
                <h3>💻 Información del Dispositivo</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Plataforma</div>
                        <div class="detail-value">${dispositivo.platform}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Idioma</div>
                        <div class="detail-value">${dispositivo.language}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Pantalla</div>
                        <div class="detail-value">${dispositivo.screen_width} x ${dispositivo.screen_height}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Táctil</div>
                        <div class="detail-value">${dispositivo.touch_support ? 'Sí' : 'No'}</div>
                    </div>
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <div class="detail-label">User Agent</div>
                        <div class="detail-value" style="font-size: 12px; word-break: break-all;">${dispositivo.user_agent}</div>
                    </div>
                </div>
            </div>
        ` : ''}

        <!-- Tiempos por Paso -->
        ${step_times && step_times.length > 0 ? `
            <div class="detail-section">
                <h3>⏱️ Tiempos por Paso</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    ${step_times.map(st => `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                            <span><strong>Paso ${st.step_number}</strong></span>
                            <span style="color: #667eea; font-weight: 600;">${st.duration_seconds ? st.duration_seconds.toFixed(1) + 's' : 'N/A'}</span>
                        </div>
                    `).join('')}
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: 600; color: #667eea;">
                        <span>TOTAL</span>
                        <span>${respuesta.duracion_total_segundos ? (respuesta.duracion_total_segundos / 60).toFixed(1) + ' min' : 'N/A'}</span>
                    </div>
                </div>
            </div>
        ` : ''}
    `;

    document.getElementById('modalBody').innerHTML = html;
}

function initDetailMap(ubicacion) {
    // Destruir mapa anterior si existe
    if (detailMap) {
        detailMap.remove();
    }

    const mapElement = document.getElementById('detailMap');
    if (!mapElement) return;

    detailMap = L.map('detailMap').setView([ubicacion.latitude, ubicacion.longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(detailMap);

    const marker = L.marker([ubicacion.latitude, ubicacion.longitude]).addTo(detailMap);
    marker.bindPopup(`
        <strong>Ubicación del Participante</strong><br>
        Lat: ${ubicacion.latitude.toFixed(6)}<br>
        Long: ${ubicacion.longitude.toFixed(6)}<br>
        Precisión: ±${ubicacion.accuracy ? ubicacion.accuracy.toFixed(0) : 'N/A'}m
    `).openPopup();

    // Círculo de precisión
    if (ubicacion.accuracy) {
        L.circle([ubicacion.latitude, ubicacion.longitude], {
            radius: ubicacion.accuracy,
            color: '#667eea',
            fillColor: '#667eea',
            fillOpacity: 0.1
        }).addTo(detailMap);
    }
}

function closeModal() {
    document.getElementById('modalDetalle').classList.remove('active');
    if (detailMap) {
        detailMap.remove();
        detailMap = null;
    }
}

// ===================
// MAPA GENERAL
// ===================

async function loadGeneralMap() {
    try {
        const response = await fetch(`${API_URL}/admin/respuestas?per_page=1000`);
        const data = await response.json();

        initGeneralMap(data.respuestas);

    } catch (error) {
        console.error('Error cargando mapa:', error);
    }
}

function initGeneralMap(respuestas) {
    if (generalMap) {
        generalMap.remove();
    }

    // Centro en México (CDMX/IPN)
    generalMap = L.map('generalMap').setView([19.4326, -99.1332], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(generalMap);

    // Agregar marcadores
    respuestas.forEach(r => {
        if (r.latitude && r.longitude) {
            const marker = L.marker([r.latitude, r.longitude]).addTo(generalMap);
            marker.bindPopup(`
                <strong>${r.nombre}</strong><br>
                ${formatPrograma(r.programa)}<br>
                ${formatDate(r.created_at)}
            `);
        }
    });

    // Ajustar vista si hay marcadores
    const bounds = respuestas
        .filter(r => r.latitude && r.longitude)
        .map(r => [r.latitude, r.longitude]);

    if (bounds.length > 0) {
        generalMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

// ===================
// ESTADÍSTICAS DETALLADAS
// ===================

async function loadDetailedStats() {
    try {
        const response = await fetch(`${API_URL}/admin/dashboard`);
        const data = await response.json();

        renderDetailedStats(data);

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

function renderDetailedStats(data) {
    const container = document.getElementById('statsContent');

    const html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <!-- Por Programa -->
            <div class="detail-section">
                <h3>📚 Por Programa</h3>
                ${data.por_programa.map(p => `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                        <span>${formatPrograma(p.programa)}</span>
                        <span style="font-weight: 600; color: #667eea;">${p.count}</span>
                    </div>
                `).join('')}
            </div>

            <!-- Por Horario -->
            <div class="detail-section">
                <h3>🕐 Por Horario</h3>
                ${data.horarios.map(h => `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                        <span>${formatHorario(h.horario)}</span>
                        <span style="font-weight: 600; color: #667eea;">${h.count}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ===================
// UTILIDADES
// ===================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatPrograma(programa) {
    const programas = {
        'maestria_administracion': 'Maestría en Administración',
        'maestria_educacion': 'Maestría en Educación',
        'maestria_ingenieria': 'Maestría en Ingeniería',
        'doctorado_ciencias': 'Doctorado en Ciencias',
        'doctorado_humanidades': 'Doctorado en Humanidades',
        'otro': 'Otro'
    };
    return programas[programa] || programa;
}

function formatTipoEvento(tipo) {
    const tipos = {
        'formal': 'Formal',
        'semiformal': 'Semi-formal',
        'casual': 'Casual',
        'tematico': 'Temático'
    };
    return tipos[tipo] || tipo;
}

function formatHorario(horario) {
    const horarios = {
        'manana': 'Mañana (9:00 AM - 12:00 PM)',
        'tarde': 'Tarde (2:00 PM - 6:00 PM)',
        'noche': 'Noche (7:00 PM - 11:00 PM)'
    };
    return horarios[horario] || horario;
}

function formatLugar(lugar) {
    const lugares = {
        'salon_eventos': 'Salón de eventos',
        'hotel': 'Hotel',
        'jardin': 'Jardín / Terraza',
        'restaurante': 'Restaurante',
        'campus': 'Campus universitario',
        'otro': 'Otro'
    };
    return lugares[lugar] || lugar;
}

function formatActividad(actividad) {
    const actividades = {
        'discursos': 'Discursos y reconocimientos',
        'musica': 'Música en vivo / DJ',
        'cena': 'Cena / Banquete',
        'networking': 'Networking profesional',
        'entretenimiento': 'Entretenimiento',
        'fotografia': 'Sesión de fotografía'
    };
    return actividades[actividad] || actividad;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function logout() {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
        // Usar el sistema de autenticación para cerrar sesión
        window.authSystem.logout();
        // Redirigir al formulario principal
        window.location.href = 'index_modular.html';
    }
}

// Cerrar modal al hacer click fuera
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});
