import { IconTrendingUp } from './icons/Icons';
import { useValorAnimado } from '../hooks/useValorAnimado';
import './CriptoTicker.css';

function formatearPrecio(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Una fila por cripto, con su propio hook de animacion (no se puede llamar un hook
// dentro del .map() del padre). El numero se desliza suavemente hacia el precio
// real cada vez que llega uno nuevo, en vez de saltar de golpe, y se pinta verde
// mientras sube o rojo mientras baja.
function FilaCripto({ cotizacion }) {
    const [precioAnimado, direccion] = useValorAnimado(Number(cotizacion.precio));

    return (
        <div className={`cripto-ticker-item ${direccion ? `flash-${direccion}` : ''}`}>
            <span className="cripto-ticker-simbolo">{cotizacion.simbolo}</span>
            <span className={`cripto-ticker-precio ${direccion || ''}`}>
                $ {formatearPrecio(precioAnimado)}
                {direccion && (
                    <IconTrendingUp size={12} className={`cripto-ticker-flecha ${direccion === 'baja' ? 'baja' : ''}`} />
                )}
            </span>
        </div>
    );
}

// Ticker en vivo de BTC/ETH/SOL: a diferencia del dolar, ac no hay compra/venta
// separadas -es el mismo precio de mercado que despues se usa para operar-, asi
// que cada fila muestra un unico precio, deslizandose suavemente y cambiando de
// color cada vez que llega una cotizacion nueva del backend.
function CriptoTicker({ cotizaciones }) {
    if (!cotizaciones || cotizaciones.length === 0) return null;

    const desactualizada = cotizaciones.some((c) => c.desactualizada);

    return (
        <div className="cripto-ticker">
            <div className="cripto-ticker-titulo">
                <span className="cripto-ticker-punto" />
                Precios en vivo
                {desactualizada && <span className="cripto-ticker-desactualizada">(sin actualizar)</span>}
            </div>
            <div className="cripto-ticker-valores">
                {cotizaciones.map((c) => (
                    <FilaCripto key={c.simbolo} cotizacion={c} />
                ))}
            </div>
        </div>
    );
}

export default CriptoTicker;
