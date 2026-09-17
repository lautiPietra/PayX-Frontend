import './EstadisticaBarras.css';

const ALTURA = 140;

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFechaCorta(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

// Grafico de barras simple (sin libreria): cada dia del periodo es una barra,
// escalada contra el maximo del propio periodo. Sin eje de valores dibujado:
// el numero exacto de cada dia se ve al pasar el mouse (title nativo).
function EstadisticaBarras({ puntos }) {
    if (puntos.length === 0) return null;

    const maximo = Math.max(...puntos.map((p) => Number(p.monto)), 0.01);

    return (
        <div className="estadistica-barras">
            <div className="estadistica-barras-grafico">
                {puntos.map((p) => {
                    const alturaPx = Math.max(2, (Number(p.monto) / maximo) * ALTURA);
                    return (
                        <div
                            key={p.fecha}
                            className="estadistica-barra"
                            style={{ height: `${alturaPx}px` }}
                            title={`${formatearFechaCorta(p.fecha)}: $ ${formatearMonto(p.monto)}`}
                        />
                    );
                })}
            </div>
            <div className="estadistica-barras-eje">
                <span>{formatearFechaCorta(puntos[0].fecha)}</span>
                <span>{formatearFechaCorta(puntos[puntos.length - 1].fecha)}</span>
            </div>
        </div>
    );
}

export default EstadisticaBarras;
