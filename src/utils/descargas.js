import { aFechaLocalISO } from './actividad';

// Nombre del archivo CSV de una exportacion del panel de admin: "payx-usuarios-2026-09-19.csv".
export function nombreArchivoCsv(tipo, fecha = new Date()) {
    return `payx-${tipo}-${aFechaLocalISO(fecha)}.csv`;
}

// Le entrega al navegador un archivo ya armado (un Blob) como descarga. El enlace temporal se saca
// enseguida, pero la URL del Blob se libera recien despues de unos segundos: revocarla de inmediato
// puede cancelar la descarga en algunos navegadores.
export function descargarArchivo(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.rel = 'noopener';
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// El aviso que se muestra al terminar una exportacion. "filas" puede faltar (null) si el backend no
// la informo; "sugerencia" dice como acotar la busqueda cuando habia mas filas que el tope.
export function mensajeExportacion({ nombre, filas, truncada, sugerencia = '' }) {
    const cantidad = filas == null ? '' : `${filas.toLocaleString('es-AR')} ${filas === 1 ? 'fila' : 'filas'}`;

    if (truncada) {
        const con = cantidad ? ` con las ${cantidad} más recientes` : '';
        return `Se descargó ${nombre}${con}, pero hay más con estos filtros. ${sugerencia}`.trim();
    }
    const con = cantidad ? ` con ${cantidad}` : '';
    return `Listo: se descargó ${nombre}${con}.`;
}
