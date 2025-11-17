const fs = require('fs');

const archivos = [
    'index.html',
    'formulario_egresados.html',
    'admin.html',
    'demo_notificaciones.html',
    'index_modular.html'
];

const reemplazos = [
    // Emojis mal codificados - regex para encontrar secuencias corruptas
    [/<�[^>]*>/g, '🎓'],  // Cualquier emoji corrupto en h1
    [/=�\s*=�/g, '📹 📍'],  // iconos corruptos en alert-box
    [/�x�\s*�x�/g, '📹 📍'],  // otra variante
    [/=�\s*/g, '🔔'],  // campana
    [/<�\s*/g, '🎓'],  // gorro de graduación
    [/=� /g, '📍'],  // ubicación
    [/�x� /g, '📹'],  // cámara
    [/�x�/g, '🔴'],  // círculo rojo
    [/>/g, '✅'],  // check
];

archivos.forEach(archivo => {
    if (fs.existsSync(archivo)) {
        console.log(`Procesando ${archivo}...`);

        let contenido = fs.readFileSync(archivo, 'utf8');

        // Aplicar reemplazos
        reemplazos.forEach(([pattern, replacement]) => {
            contenido = contenido.replace(pattern, replacement);
        });

        // Guardar
        fs.writeFileSync(archivo, contenido, 'utf8');

        console.log(`✓ ${archivo} corregido`);
    }
});

console.log('\n¡Emojis corregidos!');
