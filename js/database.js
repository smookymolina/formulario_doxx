// ===================================
// SISTEMA DE BASE DE DATOS LOCAL (IndexedDB)
// ===================================

class LocalDatabase {
    constructor() {
        this.dbName = 'FormularioEgresadosDB';
        this.version = 1;
        this.db = null;
    }

    /**
     * Inicializar la base de datos
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Error al abrir la base de datos');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Base de datos inicializada correctamente');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear almacén de respuestas
                if (!db.objectStoreNames.contains('respuestas')) {
                    const respuestasStore = db.createObjectStore('respuestas', {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    respuestasStore.createIndex('sessionId', 'sessionId', { unique: true });
                    respuestasStore.createIndex('email', 'email', { unique: false });
                    respuestasStore.createIndex('created_at', 'created_at', { unique: false });
                    respuestasStore.createIndex('programa', 'programa', { unique: false });
                }

                console.log('Estructura de base de datos creada');
            };
        });
    }

    /**
     * Guardar una respuesta completa
     */
    async saveRespuesta(data) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['respuestas'], 'readwrite');
            const store = transaction.objectStore('respuestas');

            // Agregar timestamp
            data.created_at = new Date().toISOString();

            const request = store.add(data);

            request.onsuccess = () => {
                console.log('Respuesta guardada con ID:', request.result);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error al guardar respuesta:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Obtener todas las respuestas
     */
    async getAllRespuestas() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['respuestas'], 'readonly');
            const store = transaction.objectStore('respuestas');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Obtener una respuesta por ID
     */
    async getRespuestaById(id) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['respuestas'], 'readonly');
            const store = transaction.objectStore('respuestas');
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Eliminar una respuesta
     */
    async deleteRespuesta(id) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['respuestas'], 'readwrite');
            const store = transaction.objectStore('respuestas');
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('Respuesta eliminada:', id);
                resolve(true);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Contar total de respuestas
     */
    async countRespuestas() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['respuestas'], 'readonly');
            const store = transaction.objectStore('respuestas');
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Obtener estadísticas
     */
    async getStatistics() {
        const respuestas = await this.getAllRespuestas();

        if (respuestas.length === 0) {
            return {
                total_respuestas: 0,
                respuestas_hoy: 0,
                tiempo_promedio: 0,
                por_programa: [],
                ultimas_respuestas: [],
                actividades_top: []
            };
        }

        // Total de respuestas
        const total_respuestas = respuestas.length;

        // Respuestas hoy
        const hoy = new Date().toDateString();
        const respuestas_hoy = respuestas.filter(r =>
            new Date(r.created_at).toDateString() === hoy
        ).length;

        // Tiempo promedio
        const tiempos = respuestas.map(r => {
            const start = new Date(r.startTime);
            const end = new Date(r.endTime);
            return (end - start) / 1000; // segundos
        });
        const tiempo_promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;

        // Por programa
        const programaCounts = {};
        respuestas.forEach(r => {
            programaCounts[r.programa] = (programaCounts[r.programa] || 0) + 1;
        });
        const por_programa = Object.entries(programaCounts).map(([programa, count]) => ({
            programa,
            count
        })).sort((a, b) => b.count - a.count);

        // Últimas respuestas
        const ultimas_respuestas = respuestas
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map(r => ({
                id: r.id,
                nombre: r.nombre,
                programa: r.programa,
                created_at: r.created_at
            }));

        // Top actividades
        const actividadesCounts = {};
        respuestas.forEach(r => {
            r.actividades.forEach(act => {
                actividadesCounts[act] = (actividadesCounts[act] || 0) + 1;
            });
        });
        const actividades_top = Object.entries(actividadesCounts).map(([actividad, count]) => ({
            actividad,
            count
        })).sort((a, b) => b.count - a.count).slice(0, 5);

        return {
            total_respuestas,
            respuestas_hoy,
            tiempo_promedio,
            por_programa,
            ultimas_respuestas,
            actividades_top
        };
    }

    /**
     * Obtener estadísticas detalladas
     */
    async getDetailedStatistics() {
        const respuestas = await this.getAllRespuestas();

        if (respuestas.length === 0) {
            return {
                por_programa: [],
                por_tipo_evento: [],
                por_horario: [],
                por_lugar: [],
                por_acompanante: [],
                por_actividad: []
            };
        }

        // Helper para contar
        const countBy = (field) => {
            const counts = {};
            respuestas.forEach(r => {
                const value = r[field];
                counts[value] = (counts[value] || 0) + 1;
            });
            return Object.entries(counts).map(([key, count]) => ({
                [field]: key,
                count
            })).sort((a, b) => b.count - a.count);
        };

        // Por actividad
        const actividadesCounts = {};
        respuestas.forEach(r => {
            r.actividades.forEach(act => {
                actividadesCounts[act] = (actividadesCounts[act] || 0) + 1;
            });
        });
        const por_actividad = Object.entries(actividadesCounts).map(([actividad, count]) => ({
            actividad,
            count
        })).sort((a, b) => b.count - a.count);

        return {
            por_programa: countBy('programa'),
            por_tipo_evento: countBy('tipoEvento'),
            por_horario: countBy('horario'),
            por_lugar: countBy('lugar'),
            por_acompanante: countBy('acompanante'),
            por_actividad
        };
    }
}

// Instancia global
const localDB = new LocalDatabase();

// Exportar para uso global
window.localDB = localDB;
