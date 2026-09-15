import { IconArrowDownCircle, IconArrowUpCircle, IconClock, IconX, IconPiggyBank, IconDollarSign } from './icons/Icons';

const SIMBOLOS = { PESOS: '$', USD: 'US$' };

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFechaHora(fechaIso) {
    return new Date(fechaIso).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
}

// El backend manda las fechas de plazo fijo como "yyyy-MM-dd" (sin hora): se arma
// la fecha en horario local a mano para no correrse un dia por interpretarla en UTC.
function formatearSoloFecha(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// Una fila de actividad. Puede ser una transferencia (enviada/recibida/cancelada,
// via la prop "transferencia"), un evento de plazo fijo (constituido o acreditado
// al vencer, via "plazoFijoEvento": { tipo: 'ALTA' | 'VENCIMIENTO', plazoFijo }), o
// una compra/venta de dolares (via "cambioDolares", la operacion tal cual la
// devuelve el backend). Se usa tanto en el resumen de Home como en "Todos los movimientos".
function ActividadItem({ transferencia, plazoFijoEvento, cambioDolares, onClick }) {
    const esClickeable = Boolean(onClick);
    const claseItem = `home-actividad-item${esClickeable ? ' clickeable' : ''}`;

    if (cambioDolares) {
        const esCompra = cambioDolares.tipo === 'COMPRA';

        return (
            <div className={claseItem} onClick={onClick}>
                <div className={`home-actividad-icono ${esCompra ? 'positivo' : 'negativo'}`}>
                    <IconDollarSign size={18} />
                </div>
                <div className="home-actividad-info">
                    <p className="home-actividad-titulo">{esCompra ? 'Compra de dólares' : 'Venta de dólares'}</p>
                    <p className="home-actividad-detalle">
                        {esCompra ? 'Pagaste' : 'Recibiste'} $ {formatearMonto(cambioDolares.montoPesos)}
                    </p>
                </div>
                <div className="home-actividad-derecha">
                    <span className="home-actividad-hora">{formatearFechaHora(cambioDolares.fecha)}</span>
                    <span className={`home-actividad-monto ${esCompra ? 'positivo' : 'negativo'}`}>
                        {esCompra ? '+' : '-'}US$ {formatearMonto(cambioDolares.montoUsd)}
                    </span>
                </div>
            </div>
        );
    }

    if (plazoFijoEvento) {
        const { tipo, plazoFijo } = plazoFijoEvento;
        const esAlta = tipo === 'ALTA';
        const monto = esAlta ? plazoFijo.monto : plazoFijo.montoTotal;
        // El alta tiene hora (fechaCreacion); el vencimiento solo fecha (fechaVencimiento
        // es un "date" en la base, no se sabe la hora exacta en que se acredito).
        const fechaMostrada = esAlta ? formatearFechaHora(plazoFijo.fechaCreacion) : formatearSoloFecha(plazoFijo.fechaVencimiento);

        return (
            <div className={claseItem} onClick={onClick}>
                <div className={`home-actividad-icono ${esAlta ? 'negativo' : 'positivo'}`}>
                    <IconPiggyBank size={18} />
                </div>
                <div className="home-actividad-info">
                    <p className="home-actividad-titulo">{esAlta ? 'Plazo fijo constituido' : 'Plazo fijo acreditado'}</p>
                    <p className="home-actividad-detalle">{plazoFijo.plazoDias} días · TNA {plazoFijo.tna}%</p>
                </div>
                <div className="home-actividad-derecha">
                    <span className="home-actividad-hora">{fechaMostrada}</span>
                    <span className={`home-actividad-monto ${esAlta ? 'negativo' : 'positivo'}`}>
                        {esAlta ? '-' : '+'}$ {formatearMonto(monto)}
                    </span>
                </div>
            </div>
        );
    }

    const esRecibida = transferencia.direccion === 'RECIBIDA';
    const esCancelada = transferencia.estado === 'CANCELADA';
    const simbolo = SIMBOLOS[transferencia.moneda] || '$';
    const titulo = esCancelada
        ? 'Transferencia cancelada'
        : (esRecibida ? 'Transferencia recibida' : 'Transferencia enviada');
    const detalle = `${esRecibida ? 'De' : 'A'} ${transferencia.contraparteNombre}`;

    return (
        <div className={claseItem} onClick={onClick}>
            <div className={`home-actividad-icono ${esCancelada ? 'cancelada' : (esRecibida ? 'positivo' : 'negativo')}`}>
                {esCancelada ? <IconX size={18} /> : (esRecibida ? <IconArrowDownCircle size={18} /> : <IconArrowUpCircle size={18} />)}
            </div>
            <div className="home-actividad-info">
                <p className={`home-actividad-titulo ${esCancelada ? 'cancelada' : ''}`}>{titulo}</p>
                <p className="home-actividad-detalle">{detalle}</p>
                {transferencia.estado === 'PENDIENTE' && (
                    <span className="home-actividad-badge pendiente">
                        <IconClock size={11} /> Pendiente
                    </span>
                )}
            </div>
            <div className="home-actividad-derecha">
                <span className="home-actividad-hora">{formatearFechaHora(transferencia.fecha)}</span>
                {/* Cancelada: nunca se movio plata, asi que no se muestra con signo ni como si se hubiera recibido/enviado */}
                <span className={`home-actividad-monto ${esCancelada ? 'cancelada' : (esRecibida ? 'positivo' : 'negativo')}`}>
                    {esCancelada ? '' : (esRecibida ? '+' : '-')}{simbolo} {formatearMonto(transferencia.monto)}
                </span>
            </div>
        </div>
    );
}

export default ActividadItem;
