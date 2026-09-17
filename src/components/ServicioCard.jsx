import { createElement } from 'react';
import { TEMA_POR_SERVICIO, TEMA_DEFAULT } from '../utils/serviciosTemas';
import './ServicioCard.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFecha(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function ServicioCard({ servicio, onPagar }) {
    const tema = TEMA_POR_SERVICIO[servicio.servicioCodigo] || TEMA_DEFAULT;
    const pagada = servicio.estado === 'PAGADA';

    return (
        <div className="servicio-card">
            <span className="servicio-card-icono" style={{ backgroundColor: tema.color }}>
                {createElement(tema.Icon, { size: 20 })}
            </span>

            <div className="servicio-card-info">
                <h3 className="servicio-card-nombre">{servicio.nombre}</h3>
                <p className="servicio-card-proveedor">{servicio.proveedor}</p>
            </div>

            <div className="servicio-card-datos">
                <p className="servicio-card-monto">$ {formatearMonto(servicio.monto)}</p>
                <p className={`servicio-card-fecha ${servicio.vencida ? 'vencida' : ''}`}>
                    {pagada ? `Pagada el ${formatearFecha(servicio.fechaPago.split('T')[0])}` : `Vence el ${formatearFecha(servicio.fechaVencimiento)}`}
                </p>
            </div>

            <button
                className={`servicio-card-btn ${pagada ? 'pagada' : ''}`}
                onClick={() => onPagar(servicio)}
                disabled={pagada}
            >
                {pagada ? 'Pagada ✓' : 'Pagar'}
            </button>
        </div>
    );
}

export default ServicioCard;
