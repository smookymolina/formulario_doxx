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
            FormAlerts.camposObligatorios();
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            FormAlerts.emailInvalido();
            return false;
        }

        const telefonoRegex = /^\d{10}$/;
        if (!telefonoRegex.test(telefono.replace(/\s/g, ''))) {
            FormAlerts.telefonoInvalido();
            return false;
        }
    }

    if (currentStep === 4) {
        const tipoEvento = document.querySelector('input[name="tipoEvento"]:checked');
        const horario = document.querySelector('input[name="horario"]:checked');
        const actividades = document.querySelectorAll('input[name="actividades"]:checked');

        if (!tipoEvento || !horario) {
            FormAlerts.seleccionaOpciones();
            return false;
        }

        if (actividades.length === 0) {
            FormAlerts.seleccionaActividad();
            return false;
        }
    }

    if (currentStep === 5) {
        const lugar = document.getElementById('lugar').value;
        const acompanante = document.querySelector('input[name="acompanante"]:checked');

        if (!lugar || !acompanante) {
            FormAlerts.completaPreguntas();
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
        FormAlerts.preparandoVideo();

        // Solicitar permisos de cámara
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: true
        });

        FormAlerts.obteniendoUbicacion();

        // Solicitar permisos de ubicación
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

                FormAlerts.ubicacionObtenida();

                showStep(2);
                startVideoRecording();
            },
            (error) => {
                FormAlerts.permisoUbicacionDenegado(error.message);
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

    } catch (error) {
        FormAlerts.permisoCamaraDenegado(error.message);
    }
}

// ===================================
// PASO 2: VIDEO
// ===================================

function startVideoRecording() {
    const video = document.getElementById('videoPreview');
    const statusDiv = document.getElementById('videoStatus');
    const countdownDiv = document.getElementById('countdown');
    const locationInfo = document.getElementById('locationInfo');
    const locationText = document.getElementById('locationText');

    video.style.display = 'block';
    video.srcObject = stream;

    if (locationData) {
        locationText.textContent = `Lat: ${locationData.latitude.toFixed(6)}, Long: ${locationData.longitude.toFixed(6)} (±${locationData.accuracy.toFixed(0)}m)`;
        locationInfo.style.display = 'block';
    }

    let countdown = 3;
    statusDiv.textContent = 'Prepárate para la grabación...';
    countdownDiv.textContent = countdown;

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownDiv.textContent = countdown;
        } else {
            clearInterval(countdownInterval);
            countdownDiv.textContent = '';
            startRecording();
        }
    }, 1000);
}

function startRecording() {
    const statusDiv = document.getElementById('videoStatus');
    const countdownDiv = document.getElementById('countdown');

    statusDiv.textContent = '🔴 Grabando...';

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

        // Metadata del video
        sessionData.videoMetadata = {
            size: videoBlob.size,
            type: videoBlob.type,
            duration: (recordingEndTime - recordingStartTime) / 1000,
            recordedAt: new Date().toISOString()
        };

        statusDiv.textContent = '✅ Video grabado exitosamente';

        stream.getTracks().forEach(track => track.stop());

        setTimeout(() => {
            showStep(3);
        }, 2000);
    };

    mediaRecorder.start();

    let recordTime = 5;
    countdownDiv.textContent = recordTime + 's';

    const recordInterval = setInterval(() => {
        recordTime--;
        countdownDiv.textContent = recordTime + 's';

        if (recordTime <= 0) {
            clearInterval(recordInterval);
            mediaRecorder.stop();
        }
    }, 1000);
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

    FormAlerts.enviandoFormulario();

    // Recopilar todos los datos
    const formData = new FormData();

    // Video
    formData.append('video', videoBlob, `video_${sessionData.sessionId}.webm`);

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

    formData.append('datos', JSON.stringify(jsonData));

    try {
        const response = await fetch(`${API_URL}/submit-form`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error en el servidor');
        }

        const result = await response.json();
        console.log('Formulario enviado exitosamente:', result);

        notificationSystem.clearAll();
        FormAlerts.formularioEnviado();

        showStep('Success');
    } catch (error) {
        console.error('Error al enviar:', error);
        notificationSystem.clearAll();
        FormAlerts.errorEnvio(error.message);
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Formulario';
    }
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
        FormAlerts.sesionIniciada();
    }, 500);
});

function openAdminPanel() {
    window.open('admin.html', '_blank');
}
