// ===================================
// SISTEMA DE NOTIFICACIONES MODERNO
// Reemplaza todos los alert() del sistema
// ===================================

class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Crear contenedor de notificaciones si no existe
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    /**
     * Mostrar una notificación
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: success, error, warning, info
     * @param {number} duration - Duración en ms (0 = no se cierra automáticamente)
     */
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} notification-enter`;

        // Icono según el tipo
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <div class="notification-icon">${icons[type]}</div>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="notificationSystem.close(this.parentElement)">
                ×
            </button>
        `;

        this.container.appendChild(notification);

        // Animación de entrada
        setTimeout(() => {
            notification.classList.remove('notification-enter');
            notification.classList.add('notification-show');
        }, 10);

        // Auto-cerrar si duration > 0
        if (duration > 0) {
            setTimeout(() => {
                this.close(notification);
            }, duration);
        }

        return notification;
    }

    close(notification) {
        notification.classList.remove('notification-show');
        notification.classList.add('notification-exit');

        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }

    // Métodos específicos por tipo
    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 6000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Mostrar confirmación (reemplaza window.confirm)
     * @param {string} message - Mensaje
     * @param {function} onConfirm - Callback al confirmar
     * @param {function} onCancel - Callback al cancelar
     */
    confirm(message, onConfirm, onCancel = null) {
        const overlay = document.createElement('div');
        overlay.className = 'notification-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'notification-dialog notification-enter';

        dialog.innerHTML = `
            <div class="notification-dialog-icon">⚠️</div>
            <div class="notification-dialog-message">${message}</div>
            <div class="notification-dialog-buttons">
                <button class="notification-btn notification-btn-cancel" id="notif-cancel">
                    Cancelar
                </button>
                <button class="notification-btn notification-btn-confirm" id="notif-confirm">
                    Confirmar
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Animación
        setTimeout(() => {
            dialog.classList.remove('notification-enter');
            dialog.classList.add('notification-show');
        }, 10);

        // Event listeners
        const closeDialog = (confirmed) => {
            dialog.classList.remove('notification-show');
            dialog.classList.add('notification-exit');

            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);

            if (confirmed && onConfirm) {
                onConfirm();
            } else if (!confirmed && onCancel) {
                onCancel();
            }
        };

        document.getElementById('notif-confirm').onclick = () => closeDialog(true);
        document.getElementById('notif-cancel').onclick = () => closeDialog(false);
        overlay.onclick = (e) => {
            if (e.target === overlay) closeDialog(false);
        };
    }

    /**
     * Limpiar todas las notificaciones
     */
    clearAll() {
        const notifications = this.container.querySelectorAll('.notification');
        notifications.forEach(notif => this.close(notif));
    }
}

// ===================================
// ALERTAS ESPECÍFICAS DEL FORMULARIO
// ===================================

const FormAlerts = {
    // PASO 3: Validación de datos personales
    camposObligatorios() {
        notificationSystem.error(
            '📝 Por favor, completa todos los campos obligatorios.',
            6000
        );
    },

    emailInvalido() {
        notificationSystem.error(
            '📧 Por favor, ingresa un correo electrónico válido.',
            6000
        );
    },

    telefonoInvalido() {
        notificationSystem.error(
            '📱 Por favor, ingresa un teléfono válido de 10 dígitos.',
            6000
        );
    },

    // PASO 4: Validación de preferencias
    seleccionaOpciones() {
        notificationSystem.warning(
            '☑️ Por favor, selecciona una opción en todas las preguntas.',
            6000
        );
    },

    seleccionaActividad() {
        notificationSystem.warning(
            '🎯 Por favor, selecciona al menos una actividad.',
            6000
        );
    },

    // PASO 5: Validación final
    completaPreguntas() {
        notificationSystem.warning(
            '✍️ Por favor, completa todas las preguntas obligatorias.',
            6000
        );
    },

    // Permisos
    permisoCamaraDenegado(error) {
        notificationSystem.error(
            `📹 Error al acceder a la cámara: ${error}<br>Por favor, acepta los permisos de cámara en tu navegador.`,
            8000
        );
    },

    permisoUbicacionDenegado(error) {
        notificationSystem.error(
            `📍 Error al obtener la ubicación: ${error}<br>Por favor, acepta los permisos de ubicación en tu navegador.`,
            8000
        );
    },

    // Envío del formulario
    enviandoFormulario() {
        notificationSystem.info(
            '⏳ Enviando formulario... Por favor espera.',
            0 // No se cierra automáticamente
        );
    },

    formularioEnviado() {
        notificationSystem.success(
            '🎉 ¡Formulario enviado exitosamente! Tus datos han sido guardados.',
            6000
        );
    },

    errorEnvio(mensaje = '') {
        notificationSystem.error(
            `❌ Error al enviar el formulario. ${mensaje}<br>Por favor, intenta nuevamente.`,
            8000
        );
    },

    // Video
    preparandoVideo() {
        notificationSystem.info(
            '📹 Preparando cámara para grabación...',
            3000
        );
    },

    grabandoVideo() {
        notificationSystem.info(
            '🔴 ¡Grabando! Mantente quieto frente a la cámara.',
            5000
        );
    },

    videoGrabadoExito() {
        notificationSystem.success(
            '✅ Video grabado exitosamente. Continuando...',
            3000
        );
    },

    // Ubicación
    obteniendoUbicacion() {
        notificationSystem.info(
            '📍 Obteniendo tu ubicación...',
            3000
        );
    },

    ubicacionObtenida() {
        notificationSystem.success(
            '✅ Ubicación registrada correctamente.',
            3000
        );
    },

    // Progreso
    pasoCompletado(paso) {
        notificationSystem.success(
            `✅ Paso ${paso} completado correctamente.`,
            2000
        );
    },

    // Sesión
    sesionIniciada() {
        notificationSystem.info(
            '👋 Bienvenido al formulario de egresados.',
            3000
        );
    },

    // Conexión
    sinConexion() {
        notificationSystem.error(
            '📡 No hay conexión a internet. Por favor, verifica tu conexión.',
            0 // No se cierra
        );
    },

    conexionRestaurada() {
        notificationSystem.success(
            '📡 Conexión restaurada.',
            3000
        );
    },

    // Validación en tiempo real
    validacionExitosa(campo) {
        notificationSystem.success(
            `✅ ${campo} válido.`,
            2000
        );
    }
};

// Inicializar sistema de notificaciones
const notificationSystem = new NotificationSystem();

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationSystem, FormAlerts };
}
