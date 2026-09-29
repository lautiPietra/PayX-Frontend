// Arma un feed de actividad combinando transferencias, eventos de plazo fijo
// (alta y, si ya vencio, acreditacion), operaciones de compra/venta de dolares y
// de cripto, pagos de servicios y movimientos de cajas de ahorro (alta, deposito,
// retiro), ordenado por fecha mas reciente primero. Se usa tanto en Home
// (resumen) como en Movimientos (listado completo) para no duplicar esta logica.
// "facturas" es el historial completo de facturas del usuario: aca se filtran solo las
// PAGADAS (una pendiente todavia no es un movimiento de plata).
export function construirActividades(transferencias, plazosFijos, cambiosDolares = [], cambiosCripto = [], facturas = [], movimientosCajas = []) {
    const items = [];

    for (const t of transferencias) {
        items.push({ key: `t-${t.id}`, fecha: t.fecha, transferencia: t });
    }

    for (const p of plazosFijos) {
        // El alta ordena por fechaCreacion (con hora), no por fechaInicio (una fecha
        // sin hora): dos plazos fijos constituidos el mismo dia quedarian empatados
        // y no se podria saber cual fue realmente el ultimo.
        items.push({ key: `pf-alta-${p.id}`, fecha: p.fechaCreacion, plazoFijoEvento: { tipo: 'ALTA', plazoFijo: p } });
        if (p.estado === 'VENCIDO') {
            items.push({ key: `pf-venc-${p.id}`, fecha: p.fechaVencimiento, plazoFijoEvento: { tipo: 'VENCIMIENTO', plazoFijo: p } });
        }
    }

    for (const c of cambiosDolares) {
        items.push({ key: `cd-${c.id}`, fecha: c.fecha, cambioDolares: c });
    }

    for (const c of cambiosCripto) {
        items.push({ key: `cc-${c.id}`, fecha: c.fecha, cambioCripto: c });
    }

    for (const f of facturas) {
        if (f.estado === 'PAGADA' && f.fechaPago) {
            items.push({ key: `sv-${f.id}`, fecha: f.fechaPago, pagoServicio: f });
        }
    }

    for (const m of movimientosCajas) {
        items.push({ key: `cj-${m.id}`, fecha: m.fecha, movimientoCaja: m });
    }

    items.sort((a, b) => instanteDe(b.fecha) - instanteDe(a.fecha));
    return items;
}

// Un dia suelto ("yyyy-MM-dd", ej. el vencimiento de un plazo fijo) se ordena como el inicio de ESE dia en
// horario local. new Date("2026-09-17") lo tomaria como medianoche UTC = las 21:00 del 16 en Argentina, y el
// evento quedaria ordenado antes que transferencias del 16 a la noche, pese a estar fechado el 17.
export function instanteDe(fecha) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [anio, mes, dia] = fecha.split('-').map(Number);
        return new Date(anio, mes - 1, dia);
    }
    return new Date(fecha);
}

function dosDigitos(n) {
    return String(n).padStart(2, '0');
}

// "yyyy-MM-dd" en horario LOCAL (el mismo formato que devuelve un <input type="date">).
// No se puede usar toISOString(): eso convierte a UTC y, pasada la tarde/noche en
// Argentina, devolveria el dia siguiente.
export function aFechaLocalISO(fecha) {
    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

// El dia calendario (local) al que pertenece la fecha de un movimiento. Las de
// transferencias/dolares/cripto vienen con hora y zona (hay que pasarlas a horario
// local: una compra hecha a las 23:30 pertenece a ESE dia, no al siguiente en UTC);
// las de vencimiento de plazo fijo vienen como "yyyy-MM-dd" sin hora y ya son el dia.
export function diaLocalDe(fecha) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    return aFechaLocalISO(new Date(fecha));
}

// Los tipos de movimiento por los que se puede filtrar. El plazo fijo cuenta sus dos eventos (alta y
// acreditacion al vencer) como del mismo tipo.
export const TIPOS_ACTIVIDAD = [
    { id: 'transferencias', label: 'Transferencias' },
    { id: 'plazos-fijos', label: 'Plazos fijos' },
    { id: 'dolares', label: 'Dólares' },
    { id: 'cripto', label: 'Cripto' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'cajas', label: 'Cajas de ahorro' },
];

export function tipoDe(item) {
    if (item.transferencia) return 'transferencias';
    if (item.plazoFijoEvento) return 'plazos-fijos';
    if (item.cambioDolares) return 'dolares';
    if (item.cambioCripto) return 'cripto';
    if (item.pagoServicio) return 'servicios';
    if (item.movimientoCaja) return 'cajas';
    return null;
}

// Filtra por tipo de movimiento. "" = todos los tipos.
export function filtrarPorTipo(items, tipo) {
    if (!tipo) return items;
    return items.filter((item) => tipoDe(item) === tipo);
}

// Cuantos movimientos hay de cada tipo, para mostrarlo en los botones del filtro.
export function contarPorTipo(items) {
    const cuentas = Object.fromEntries(TIPOS_ACTIVIDAD.map((t) => [t.id, 0]));
    for (const item of items) {
        const tipo = tipoDe(item);
        if (tipo) cuentas[tipo] += 1;
    }
    return cuentas;
}

// Filtra por rango de dias, ambos extremos incluidos. "" = sin limite de ese lado.
// Si desde > hasta el resultado queda vacio (el rango no contiene ningun dia).
export function filtrarPorFecha(items, desde, hasta) {
    if (!desde && !hasta) return items;
    return items.filter((item) => {
        const dia = diaLocalDe(item.fecha);
        if (desde && dia < desde) return false;
        if (hasta && dia > hasta) return false;
        return true;
    });
}
