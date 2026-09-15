import { useEffect, useRef, useState } from 'react';
import { IconTrendingUp } from './icons/Icons';
import './CotizacionTicker.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Ticker en vivo del dolar oficial: compra siempre en verde, venta siempre en
// rojo. Cada vez que "cotizacion" cambia (Home la vuelve a pedir cada 20s), se
// compara contra el valor anterior para mostrar una flechita y un flash breve
// indicando si subio o bajo desde la ultima actualizacion.
function CotizacionTicker({ cotizacion }) {
    const anteriorRef = useRef({ compra: null, venta: null });
    const [flash, setFlash] = useState({ compra: null, venta: null }); // null | 'sube' | 'baja'

    useEffect(() => {
        if (!cotizacion) return;
        const anterior = anteriorRef.current;
        const compraActual = Number(cotizacion.compra);
        const ventaActual = Number(cotizacion.venta);

        const nuevoFlash = {
            compra: anterior.compra != null && compraActual !== anterior.compra
                ? (compraActual > anterior.compra ? 'sube' : 'baja') : null,
            venta: anterior.venta != null && ventaActual !== anterior.venta
                ? (ventaActual > anterior.venta ? 'sube' : 'baja') : null,
        };

        anteriorRef.current = { compra: compraActual, venta: ventaActual };

        if (nuevoFlash.compra || nuevoFlash.venta) {
            setFlash(nuevoFlash);
            const t = setTimeout(() => setFlash({ compra: null, venta: null }), 1500);
            return () => clearTimeout(t);
        }
    }, [cotizacion]);

    if (!cotizacion) return null;

    return (
        <div className="cotizacion-ticker">
            <div className="cotizacion-ticker-titulo">
                <span className="cotizacion-ticker-punto" />
                Dólar oficial en vivo
                {cotizacion.desactualizada && <span className="cotizacion-ticker-desactualizada">(sin actualizar)</span>}
            </div>
            <div className="cotizacion-ticker-valores">
                <div className={`cotizacion-ticker-item compra ${flash.compra ? `flash-${flash.compra}` : ''}`}>
                    <span className="cotizacion-ticker-label">Compra</span>
                    <span className="cotizacion-ticker-precio">
                        $ {formatearMonto(cotizacion.compra)}
                        {flash.compra && (
                            <IconTrendingUp size={13} className={`cotizacion-ticker-flecha ${flash.compra === 'baja' ? 'baja' : ''}`} />
                        )}
                    </span>
                </div>
                <div className={`cotizacion-ticker-item venta ${flash.venta ? `flash-${flash.venta}` : ''}`}>
                    <span className="cotizacion-ticker-label">Venta</span>
                    <span className="cotizacion-ticker-precio">
                        $ {formatearMonto(cotizacion.venta)}
                        {flash.venta && (
                            <IconTrendingUp size={13} className={`cotizacion-ticker-flecha ${flash.venta === 'baja' ? 'baja' : ''}`} />
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default CotizacionTicker;
