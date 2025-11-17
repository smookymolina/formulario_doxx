const fs = require('fs');

const archivos = [
    'index.html',
    'formulario_egresados.html',
    'admin.html',
    'demo_notificaciones.html',
    'index_modular.html'
];

archivos.forEach(archivo => {
    if (fs.existsSync(archivo)) {
        console.log(`Procesando ${archivo}...`);

        // Leer el archivo como buffer
        let buffer = fs.readFileSync(archivo);

        // Convertir a string UTF-8
        let contenido = buffer.toString('utf8');

        // Remover BOM si existe
        if (contenido.charCodeAt(0) === 0xFEFF) {
            contenido = contenido.substring(1);
        }

        // El problema es doble codificación UTF-8
        // Primero, decodificar como Latin-1 y luego como UTF-8
        try {
            // Convertir a buffer con latin1 y luego a utf8
            const bytes = Buffer.from(contenido, 'latin1');
            contenido = bytes.toString('utf8');
        } catch (e) {
            console.log(`  No se pudo recodificar, manteniendo original`);
        }

        // Guardar el archivo sin BOM
        fs.writeFileSync(archivo, contenido, 'utf8');

        console.log(`✓ ${archivo} corregido`);
    } else {
        console.log(`✗ ${archivo} no encontrado`);
    }
});

console.log('\n¡Corrección completada!');
