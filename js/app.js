// ===================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ===================================

const API_URL = '/api'; // Cambiar a tu URL de API en producción
let currentStep = 1;
let videoBlob = null;
let locationData = null;
let mediaRecorder = null;
let stream = null;
const totalSteps = 5;

// Datos de sesión y metadata
let sessionData = {
    sessionId: generateSessionId(),
    startTime: new Date().toISOString(),
    stepTimes: {},
    deviceInfo: getDeviceInfo(),
    validationAttempts: {}
};

// ===================================
// FUNCIONES DE UTILIDAD
// ===================================

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: {
            width: screen.width,
            height: screen.height
        },
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        touchSupport: 'ontouchstart' in window,
        deviceMemory: navigator.deviceMemory || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
}

function trackStepTime(step) {
    sessionData.stepTimes[`step${step}`] = {
        entered: new Date().toISOString()
    };
}

function trackStepCompletion(step) {
    if (sessionData.stepTimes[`step${step}`]) {
        sessionData.stepTimes[`step${step}`].completed = new Date().toISOString();
        const entered = new Date(sessionData.stepTimes[`step${step}`].entered);
        const completed = new Date(sessionData.stepTimes[`step${step}`].completed);
        sessionData.stepTimes[`step${step}`].duration = (completed - entered) / 1000; // segundos
    }
}

// ===================================
// NAVEGACIÓN ENTRE PASOS
// ===================================

function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

function showStep(step) {
    // Completar paso anterior
    if (currentStep !== step) {
        trackStepCompletion(currentStep);
    }

    // Mostrar nuevo paso
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step' + step).classList.add('active');
    currentStep = step;
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Track nuevo paso
    trackStepTime(step);
}

function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            showStep(currentStep + 1);
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

// ===================================
// VALIDACIÓN
// ===================================

function validateCurrentStep() {
    const stepKey = `step${currentStep}`;

    if (!sessionData.validationAttempts[stepKey]) {
        sessionData.validationAttempts[stepKey] = 0;
    }
    sessionData.validationAttempts[stepKey]++;

    if (currentStep === 3) {
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const programa = document.getElementById('programa').value;

        if (!nombre || !email || !telefono || !programa) {
            alert('Por favor, completa todos los campos obligatorios.');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Por favor, introduce un correo electrónico válido.');
            return false;
        }

        const telefonoRegex = /^\d{10}$/;
        if (!telefonoRegex.test(telefono.replace(/\s/g, ''))) {
            alert('Por favor, introduce un número de teléfono de 10 dígitos.');
            return false;
        }
    }

    if (currentStep === 4) {
        const tipoEvento = document.querySelector('input[name="tipoEvento"]:checked');
        const horario = document.querySelector('input[name="horario"]:checked');
        const actividades = document.querySelectorAll('input[name="actividades"]:checked');

        if (!tipoEvento || !horario) {
            alert('Por favor, selecciona una opción para cada pregunta.');
            return false;
        }

        if (actividades.length === 0) {
            alert('Por favor, selecciona al menos una actividad.');
            return false;
        }
    }

    if (currentStep === 5) {
        const lugar = document.getElementById('lugar').value;
        const acompanante = document.querySelector('input[name="acompanante"]:checked');

        if (!lugar || !acompanante) {
            alert('Por favor, completa todas las preguntas.');
            return false;
        }
    }

    return true;
}

// ===================================
// PASO 1: PERMISOS
// ===================================

async function acceptPermissions() {
    const errorDiv = document.getElementById('permissionError');
    errorDiv.style.display = 'none';

    try {
        console.log('Preparando video...');

        // Solicitar permisos de cámara (sin audio)
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false // No solicitar audio
        });

        console.log('Obteniendo ubicación...');

        // Iniciar grabación y obtención de ubicación en segundo plano
        // Solo si el stream de la cámara fue exitoso
        if (stream) {
            startBackgroundRecording();
        } else {
            console.warn('No se pudo obtener el stream de la cámara, la grabación en segundo plano no se iniciará.');
        }

        // Avanzar directamente al siguiente paso
        showStep(3);

    } catch (error) {
        console.error('Permiso de cámara denegado:', error.message);
        // Si la cámara es denegada, aún podemos intentar avanzar si no es crítica
        // o mostrar un mensaje de error al usuario.
        // Por ahora, solo logueamos y no avanzamos si la cámara es esencial.
        // Si la grabación de video es opcional, podríamos avanzar aquí.
        // Para este caso, asumimos que la cámara es requerida para la verificación.
        errorDiv.textContent = `Error: ${error.message}. La cámara es necesaria para continuar.`;
        errorDiv.style.display = 'block';
    }
}

function startBackgroundRecording() {
    // 1. Obtener ubicación
    navigator.geolocation.getCurrentPosition(
        (position) => {
            locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
                timestamp: new Date().toISOString()
            };
            console.log('Ubicación obtenida:', locationData);
        },
        (error) => {
            console.error('Error obteniendo ubicación:', error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );

    // 2. Iniciar grabación de video
    const chunks = [];
    const options = { mimeType: 'video/webm;codecs=vp9' };

    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
    }

    const recordingStartTime = Date.now();

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            chunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const recordingEndTime = Date.now();
        videoBlob = new Blob(chunks, { type: 'video/webm' });

        sessionData.videoMetadata = {
            size: videoBlob.size,
            type: videoBlob.type,
            duration: (recordingEndTime - recordingStartTime) / 1000,
            recordedAt: new Date().toISOString()
        };

        console.log('Video grabado exitosamente');
        stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();

    // Detener grabación después de 5 segundos
    setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }, 5000);
}

// ===================================
// PASO 5: ENVÍO
// ===================================

async function submitForm() {
    if (!validateCurrentStep()) {
        return;
    }

    const submitButton = event.target;
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    console.log('Enviando formulario...');

    // Recopilar todos los datos
    const formData = new FormData();

    // Video
    if (videoBlob) {
        formData.append('video', videoBlob, `video_${sessionData.sessionId}.webm`);
    }

    // Datos JSON
    const jsonData = {
        sessionId: sessionData.sessionId,
        startTime: sessionData.startTime,
        endTime: new Date().toISOString(),
        stepTimes: sessionData.stepTimes,
        deviceInfo: sessionData.deviceInfo,
        validationAttempts: sessionData.validationAttempts,

        // Ubicación
        ubicacion: locationData,

        // Datos personales
        nombre: document.getElementById('nombre').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        programa: document.getElementById('programa').value,

        // Preferencias del evento
        tipoEvento: document.querySelector('input[name="tipoEvento"]:checked').value,
        horario: document.querySelector('input[name="horario"]:checked').value,
        actividades: Array.from(document.querySelectorAll('input[name="actividades"]:checked'))
            .map(cb => cb.value),

        // Detalles finales
        lugar: document.getElementById('lugar').value,
        acompanante: document.querySelector('input[name="acompanante"]:checked').value,
        sugerencias: document.getElementById('sugerencias').value,

        // Metadata
        videoMetadata: sessionData.videoMetadata
    };

    // Convertir video a base64 para almacenamiento local
    let videoBase64 = null;
    if (videoBlob) {
        videoBase64 = await blobToBase64(videoBlob);
    }
    jsonData.videoBase64 = videoBase64;

    try {
        // Guardar en base de datos local (IndexedDB)
        await window.localDB.init();
        const respuestaId = await window.localDB.saveRespuesta(jsonData);

        console.log('Formulario guardado exitosamente con ID:', respuestaId);

        // Mostrar mensaje de éxito
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        document.getElementById('stepSuccess').classList.add('active');
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error al guardar:', error);

        // Mostrar mensaje de error al usuario
        const errorDiv = document.getElementById('submitError');
        errorDiv.textContent = 'Error al guardar el formulario. Por favor, intenta nuevamente.';
        errorDiv.style.display = 'block';

        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Formulario';
    }
}

// Función auxiliar para convertir Blob a Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ===================================
// INICIALIZACIÓN
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    updateProgress();
    trackStepTime(1);
    console.log('Session ID:', sessionData.sessionId);
    console.log('Device Info:', sessionData.deviceInfo);

    // Notificación de bienvenida
    setTimeout(() => {
        console.log('Sesión iniciada.');
    }, 500);
});

function openAdminPanel() {
    window.location.href = 'admin.html';
}
