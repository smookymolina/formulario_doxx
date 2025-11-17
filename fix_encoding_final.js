const fs = require('fs');

const archivos = [
    'index.html',
    'formulario_egresados.html',
    'admin.html',
    'demo_notificaciones.html',
    'index_modular.html'
];

// Mapeo de secuencias mal codificadas a emojis correctos
const emojiReemplazos = {
    'ðŸŽ"': '🎓',  // gorro de graduación
    'ðŸ"¹': '📹',  // cámara de video
    'ðŸ"': '📍',   // pin de ubicación
    'ðŸ"´': '🔴',  // círculo rojo
    'âœ…': '✅',   // marca de verificación
    'ðŸ"Š': '📊',  // gráfico de barras
    'ðŸ"‹': '📋',  // portapapeles
    'ðŸ—ºï¸': '🗺️', // mapa mundo
    'ðŸ"ˆ': '📈',  // gráfico creciente
    'ðŸ"': '🎯',   // diana
    'ðŸ"": '🔔',   // campana
    'ðŸ¤–': '🤖',  // robot
};

// Mapeo de texto mal codificado
const textoReemplazos = {
    // Vocales con tilde
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã"': 'Ó', 'Ãš': 'Ú',
    // Ñ
    'Ã±': 'ñ', 'Ã'': 'Ñ',
    // Signos
    'Â¿': '¿', 'Â¡': '¡',
};

archivos.forEach(archivo => {
    if (fs.existsSync(archivo)) {
        console.log(`Procesando ${archivo}...`);

        // Leer archivo como buffer binario
        let contenido = fs.readFileSync(archivo, 'utf8');

        // Remover BOM si existe
        if (contenido.charCodeAt(0) === 0xFEFF) {
            contenido = contenido.substring(1);
        }

        // Aplicar reemplazos de emojis
        for (const [malo, bueno] of Object.entries(emojiReemplazos)) {
            contenido = contenido.split(malo).join(bueno);
        }

        // Aplicar reemplazos de texto
        for (const [malo, bueno] of Object.entries(textoReemplazos)) {
            contenido = contenido.split(malo).join(bueno);
        }

        // Guardar sin BOM
        fs.writeFileSync(archivo, contenido, { encoding: 'utf8', flag: 'w' });

        console.log(`✓ ${archivo} corregido`);
    } else {
        console.log(`✗ ${archivo} no encontrado`);
    }
});

console.log('\n¡Corrección completada!');
