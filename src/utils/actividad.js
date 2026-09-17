// Arma un feed de actividad combinando transferencias, eventos de plazo fijo
// (alta y, si ya vencio, acreditacion) y operaciones de compra/venta de dolares y
// de cripto, ordenado por fecha mas reciente primero. Se usa tanto en Home
// (resumen) como en Movimientos (listado completo) para no duplicar esta logica.
export function construirActividades(transferencias, plazosFijos, cambiosDolares = [], cambiosCripto = []) {
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

    items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return items;
}
