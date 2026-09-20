import { COLOR_POR_CATEGORIA, COLOR_CATEGORIA_DEFAULT } from '../utils/estadisticasTemas';
import { ETIQUETA_TIPO, ETIQUETA_ESTADO } from '../utils/transaccionesAdmin';
import './AdminTransacciones.css';

// Etiquetas de tipo y de estado de una transaccion, iguales en el monitor y en la ficha de usuario.
export function BadgeTipo({ tipo }) {
    const color = COLOR_POR_CATEGORIA[tipo] || COLOR_CATEGORIA_DEFAULT;
    return (
        <span className="admin-tx-tipo" style={{ '--color': color }}>
            {ETIQUETA_TIPO[tipo] || tipo}
        </span>
    );
}

export function BadgeEstado({ estado }) {
    return <span className={`admin-tx-estado ${estado.toLowerCase()}`}>{ETIQUETA_ESTADO[estado] || estado}</span>;
}
