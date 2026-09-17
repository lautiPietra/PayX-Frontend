import './EstadisticaDonut.css';

const COLOR_POR_CATEGORIA = {
    TRANSFERENCIAS: '#ff6b1a',
    DOLARES: '#0ea5e9',
    CRIPTO: '#8b5cf6',
    PLAZO_FIJO: '#16a34a',
};

const RADIO = 70;
const GROSOR = 26;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Grafico de torta/dona armado a mano con circulos SVG (sin libreria de graficos):
// cada categoria es un tramo de circunferencia, con stroke-dasharray marcando
// "cuanto tramo pinto, cuanto dejo transparente" y un dashoffset acumulado para
// que empiecen justo donde termino el tramo anterior.
function EstadisticaDonut({ categorias, total }) {
    const conGasto = categorias.filter((c) => Number(c.monto) > 0);

    if (conGasto.length === 0) {
        return (
            <div className="estadistica-donut-vacio">
                <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r={RADIO} fill="none" stroke="#f3f4f6" strokeWidth={GROSOR} />
                </svg>
                <p>Sin gastos en este período</p>
            </div>
        );
    }

    const totalNumero = Number(total);

    const { segmentos } = conGasto.reduce((acc, c) => {
        // Se usa monto/total (la proporcion real) y no el porcentaje ya redondeado
        // que manda el backend: si cada porcentaje se redondea por separado, la
        // suma de los 4 puede no dar exactamente 100 (ej. 33.3+33.3+33.4=100 esta
        // bien, pero 33.3+33.3+33.3=99.9 dejaria un hueco/superposicion visible
        // en la union del primer y ultimo segmento).
        const largo = totalNumero > 0 ? CIRCUNFERENCIA * (Number(c.monto) / totalNumero) : 0;
        return {
            acumulado: acc.acumulado + largo,
            segmentos: [...acc.segmentos, {
                codigo: c.codigo,
                color: COLOR_POR_CATEGORIA[c.codigo] || '#9ca3af',
                largo,
                offset: -acc.acumulado,
            }],
        };
    }, { acumulado: 0, segmentos: [] });

    return (
        <div className="estadistica-donut">
            <div className="estadistica-donut-grafico">
                <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r={RADIO} fill="none" stroke="#f3f4f6" strokeWidth={GROSOR} />
                    {segmentos.map((s) => (
                        <circle
                            key={s.codigo}
                            cx="80" cy="80" r={RADIO} fill="none"
                            stroke={s.color} strokeWidth={GROSOR}
                            strokeDasharray={`${s.largo} ${CIRCUNFERENCIA - s.largo}`}
                            strokeDashoffset={s.offset}
                            transform="rotate(-90 80 80)"
                        />
                    ))}
                </svg>
                <div className="estadistica-donut-centro">
                    <span className="estadistica-donut-centro-label">Total</span>
                    <span className="estadistica-donut-centro-valor">$ {formatearMonto(total)}</span>
                </div>
            </div>

            <ul className="estadistica-donut-leyenda">
                {categorias.map((c) => (
                    <li key={c.codigo}>
                        <span className="estadistica-donut-punto" style={{ backgroundColor: COLOR_POR_CATEGORIA[c.codigo] || '#9ca3af' }} />
                        <span className="estadistica-donut-etiqueta">{c.etiqueta}</span>
                        <span className="estadistica-donut-monto">$ {formatearMonto(c.monto)}</span>
                        <span className="estadistica-donut-porcentaje">{Number(c.porcentaje).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default EstadisticaDonut;
