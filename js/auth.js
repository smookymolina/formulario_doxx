// ===================================
// SISTEMA DE AUTENTICACIÓN SIMPLE
// ===================================

/**
 * Sistema de autenticación básico para el panel de administración
 * NOTA: Para producción, implementar autenticación con backend (JWT, OAuth, etc.)
 */

const AUTH_CONFIG = {
    // CAMBIAR ESTA CONTRASEÑA en producción
    adminPassword: 'admin2024',

    // Tiempo de expiración de sesión (en milisegundos)
    sessionTimeout: 3600000, // 1 hora

    // Clave de almacenamiento
    storageKey: 'admin_auth_data'
};

class AuthSystem {
    constructor() {
        this.checkSessionExpiration();
    }

    /**
     * Verificar autenticación
     * @returns {boolean} true si está autenticado
     */
    isAuthenticated() {
        const authData = this.getAuthData();
        if (!authData) return false;

        // Verificar expiración
        const now = new Date().getTime();
        if (now > authData.expiresAt) {
            this.logout();
            return false;
        }

        return true;
    }

    /**
     * Solicitar autenticación
     * @returns {boolean} true si la autenticación fue exitosa
     */
    authenticate() {
        if (this.isAuthenticated()) {
            return true;
        }

        const password = prompt('🔐 Contraseña de Administrador:');

        if (password === null) {
            // Usuario canceló
            return false;
        }

        if (password === AUTH_CONFIG.adminPassword) {
            // Autenticación exitosa
            this.setAuthData();
            console.log('✅ Autenticación exitosa');
            return true;
        } else {
            alert('❌ Contraseña incorrecta');
            return false;
        }
    }

    /**
     * Guardar datos de autenticación
     */
    setAuthData() {
        const now = new Date().getTime();
        const authData = {
            authenticated: true,
            timestamp: now,
            expiresAt: now + AUTH_CONFIG.sessionTimeout,
            user: 'admin'
        };

        sessionStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(authData));
    }

    /**
     * Obtener datos de autenticación
     * @returns {Object|null}
     */
    getAuthData() {
        const data = sessionStorage.getItem(AUTH_CONFIG.storageKey);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Cerrar sesión
     */
    logout() {
        sessionStorage.removeItem(AUTH_CONFIG.storageKey);
        console.log('🔒 Sesión cerrada');
    }

    /**
     * Renovar sesión
     */
    renewSession() {
        if (this.isAuthenticated()) {
            const authData = this.getAuthData();
            authData.expiresAt = new Date().getTime() + AUTH_CONFIG.sessionTimeout;
            sessionStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(authData));
        }
    }

    /**
     * Verificar expiración de sesión periódicamente
     */
    checkSessionExpiration() {
        setInterval(() => {
            if (!this.isAuthenticated() && window.location.pathname.includes('admin')) {
                alert('⏰ Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                window.location.href = 'index.html';
            }
        }, 60000); // Verificar cada minuto
    }

    /**
     * Obtener tiempo restante de sesión
     * @returns {number} Minutos restantes
     */
    getSessionTimeRemaining() {
        const authData = this.getAuthData();
        if (!authData) return 0;

        const now = new Date().getTime();
        const remaining = authData.expiresAt - now;
        return Math.floor(remaining / 60000); // Convertir a minutos
    }
}

// Instancia global
const authSystem = new AuthSystem();

// Exportar para uso global
window.authSystem = authSystem;
