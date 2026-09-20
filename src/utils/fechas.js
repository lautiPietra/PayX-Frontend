// El backend manda dos clases de fecha, y se leen distinto:
//  - un DIA ("yyyy-MM-dd", ej. el vencimiento de una factura): se arma a mano en horario
//    local. new Date("2026-01-15") lo interpreta como medianoche UTC y, en Argentina (UTC-3),
//    mostraria el 14.
//  - un INSTANTE (con hora y zona, ej. cuando se pago una factura): se interpreta con new Date()
//    y se muestra en el huso del navegador. NO se le puede recortar el texto en la "T": segun el
//    huso con el que el servidor serialice, "2026-09-17T23:30-03:00" puede llegar como
//    "2026-09-18T02:30Z" y el recorte daria el dia siguiente al que el usuario vivio.

export function parsearDia(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
}

export function formatearDia(fechaIso, opciones = { day: '2-digit', month: 'short' }) {
    return parsearDia(fechaIso).toLocaleDateString('es-AR', opciones);
}

export function formatearInstante(fechaIso, opciones = { day: '2-digit', month: 'short' }) {
    return new Date(fechaIso).toLocaleDateString('es-AR', opciones);
}

// "hace 5 min", "hace 3 h", "hace 2 d" para un instante, respecto de "ahoraMs". Quien la usa pasa el "ahora" del
// servidor (no el reloj de esta computadora) para que sea consistente aunque el reloj local este desfasado.
export function haceCuanto(fecha, ahoraMs) {
    const segundos = Math.max(0, Math.round((ahoraMs - new Date(fecha).getTime()) / 1000));
    if (segundos < 60) return 'hace instantes';
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    return `hace ${Math.floor(horas / 24)} d`;
}
