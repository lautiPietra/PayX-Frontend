import { IconTrendingUp } from './icons/Icons';
import { useValorAnimado } from '../hooks/useValorAnimado';
import './CotizacionTicker.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Ticker en vivo del dolar oficial: compra siempre en verde, venta siempre en
// rojo (fijo, sea cual sea la direccion). El numero se desliza suavemente hacia
// el valor real cada vez que llega uno nuevo del backend (no salta de golpe), y
// ademas flashea con una flechita mientras esta en movimiento.
function CotizacionTicker({ cotizacion }) {
    const [compraAnimada, direccionCompra] = useValorAnimado(cotizacion ? Number(cotizacion.compra) : null);
    const [ventaAnimada, direccionVenta] = useValorAnimado(cotizacion ? Number(cotizacion.venta) : null);

    if (!cotizacion) return null;

    return (
        <div className="cotizacion-ticker">
            <div className="cotizacion-ticker-titulo">
                <span className="cotizacion-ticker-punto" />
                Dólar oficial en vivo
                {cotizacion.desactualizada && <span className="cotizacion-ticker-desactualizada">(sin actualizar)</span>}
            </div>
            <div className="cotizacion-ticker-valores">
                <div className={`cotizacion-ticker-item compra ${direccionCompra ? `flash-${direccionCompra}` : ''}`}>
                    <span className="cotizacion-ticker-label">Compra</span>
                    <span className="cotizacion-ticker-precio">
                        $ {formatearMonto(compraAnimada)}
                        {direccionCompra && (
                            <IconTrendingUp size={13} className={`cotizacion-ticker-flecha ${direccionCompra === 'baja' ? 'baja' : ''}`} />
                        )}
                    </span>
                </div>
                <div className={`cotizacion-ticker-item venta ${direccionVenta ? `flash-${direccionVenta}` : ''}`}>
                    <span className="cotizacion-ticker-label">Venta</span>
                    <span className="cotizacion-ticker-precio">
                        $ {formatearMonto(ventaAnimada)}
                        {direccionVenta && (
                            <IconTrendingUp size={13} className={`cotizacion-ticker-flecha ${direccionVenta === 'baja' ? 'baja' : ''}`} />
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default CotizacionTicker;
