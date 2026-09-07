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
    const simbolo = SIMBOLOS[transferencia.moneda] || '$';
    const titulo = esRecibida ? 'Transferencia recibida' : 'Transferencia enviada';
    const detalle = `${esRecibida ? 'De' : 'A'} ${transferencia.contraparteNombre}`;

    return (
        <div className="home-actividad-item clickeable" onClick={onClick}>
            <div className={`home-actividad-icono ${esRecibida ? 'positivo' : 'negativo'}`}>
                {esRecibida ? <IconArrowDownCircle size={18} /> : <IconArrowUpCircle size={18} />}
            </div>
            <div className="home-actividad-info">
                <p className="home-actividad-titulo">{titulo}</p>
                <p className="home-actividad-detalle">{detalle}</p>
                {transferencia.estado !== 'COMPLETADA' && (
                    <span className={`home-actividad-badge ${transferencia.estado.toLowerCase()}`}>
                        {transferencia.estado === 'PENDIENTE'
                            ? <><IconClock size={11} /> Pendiente</>
                            : <><IconX size={11} /> Cancelada</>}
                    </span>
                )}
            </div>
            <div className="home-actividad-derecha">
                <span className="home-actividad-hora">{formatearFecha(transferencia.fecha)}</span>
                <span className={`home-actividad-monto ${esRecibida ? 'positivo' : 'negativo'}`}>
                    {esRecibida ? '+' : '-'}{simbolo} {formatearMonto(transferencia.monto)}
                </span>
            </div>
        </div>
    );
}

export default ActividadItem;
