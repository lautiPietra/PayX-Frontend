import { IconArrowDownCircle, IconArrowUpCircle, IconClock, IconX } from './icons/Icons';

const SIMBOLOS = { PESOS: '$', USD: 'US$' };

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFecha(fechaIso) {
    return new Date(fechaIso).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
}

// Una fila de transferencia (enviada o recibida) en las listas de actividad.
// Se usa tanto en el resumen de Home como en la pantalla de "Todos los movimientos".
function ActividadItem({ transferencia, onClick }) {
    const esRecibida = transferencia.direccion === 'RECIBIDA';
    const esCancelada = transferencia.estado === 'CANCELADA';
    const simbolo = SIMBOLOS[transferencia.moneda] || '$';
    const titulo = esCancelada
        ? 'Transferencia cancelada'
        : (esRecibida ? 'Transferencia recibida' : 'Transferencia enviada');
    const detalle = `${esRecibida ? 'De' : 'A'} ${transferencia.contraparteNombre}`;

    return (
        <div className="home-actividad-item clickeable" onClick={onClick}>
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
                <span className="home-actividad-hora">{formatearFecha(transferencia.fecha)}</span>
                {/* Cancelada: nunca se movio plata, asi que no se muestra con signo ni como si se hubiera recibido/enviado */}
                <span className={`home-actividad-monto ${esCancelada ? 'cancelada' : (esRecibida ? 'positivo' : 'negativo')}`}>
                    {esCancelada ? '' : (esRecibida ? '+' : '-')}{simbolo} {formatearMonto(transferencia.monto)}
                </span>
            </div>
        </div>
    );
}

export default ActividadItem;
