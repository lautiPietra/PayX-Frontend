import { useState } from 'react';
import { COLOR_POR_CATEGORIA, COLOR_CATEGORIA_DEFAULT } from '../utils/estadisticasTemas';
import './EstadisticaDonut.css';

const TAMANIO = 190;
const CENTRO = TAMANIO / 2;
const RADIO = 70;
const GROSOR = 24;
const GROSOR_ACTIVO = 31;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearPorcentaje(valor) {
    return `${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
}

// El monto del centro tiene que entrar en el hueco de la dona (116px): cuanto mas largo el numero, mas chica
// la letra, para que un total de cientos de millones no se salga del circulo.
function estiloValorCentro(texto) {
    const n = texto.length;
    const px = n <= 11 ? 16 : n <= 13 ? 14 : n <= 15 ? 12 : n <= 17 ? 11 : 10;
    return { fontSize: `${px}px` };
}

// Grafico de dona armado a mano con circulos SVG (sin libreria de graficos):
// cada categoria es un tramo de circunferencia, con stroke-dasharray marcando
// "cuanto tramo pinto, cuanto dejo transparente" y un dashoffset acumulado para
// que empiecen justo donde termino el tramo anterior. Se dibujan TODAS las
// categorias (las de gasto cero con largo 0) para que al cambiar de periodo cada
// tramo se anime desde su tamaño anterior en vez de aparecer/desaparecer de golpe.
function EstadisticaDonut({ categorias, total, textoVacio = "Sin gastos en este período", etiquetaTotal = "Total" }) {
    const [activa, setActiva] = useState(null);
    const totalNumero = Number(total);

    if (!(totalNumero > 0)) {
        return (
            <div className="estadistica-donut-vacio">
                <svg width={TAMANIO} height={TAMANIO} viewBox={`0 0 ${TAMANIO} ${TAMANIO}`}>
                    <circle cx={CENTRO} cy={CENTRO} r={RADIO} fill="none" stroke="#f3f4f6" strokeWidth={GROSOR} />
                </svg>
                <p>{textoVacio}</p>
            </div>
        );
    }

    const { segmentos } = categorias.reduce((acc, c) => {
        // Se usa monto/total (la proporcion real) y no el porcentaje ya redondeado
        // que manda el backend: si cada porcentaje se redondea por separado, la
        // suma puede no dar exactamente 100 y dejaria un hueco o superposicion
        // visible en la union del primer y ultimo segmento.
        const largo = CIRCUNFERENCIA * (Number(c.monto) / totalNumero);
        return {
            acumulado: acc.acumulado + largo,
            segmentos: [...acc.segmentos, {
                codigo: c.codigo,
                color: COLOR_POR_CATEGORIA[c.codigo] || COLOR_CATEGORIA_DEFAULT,
                largo,
                offset: -acc.acumulado,
                indice: acc.segmentos.length,
            }],
        };
    }, { acumulado: 0, segmentos: [] });

    const categoriaActiva = categorias.find((c) => c.codigo === activa);
    const textoCentro = `$ ${formatearMonto(categoriaActiva ? categoriaActiva.monto : total)}`;

    function alternar(codigo) {
        setActiva((actual) => (actual === codigo ? null : codigo));
    }

    return (
        <div className="estadistica-donut">
            <div className="estadistica-donut-grafico">
                <svg width={TAMANIO} height={TAMANIO} viewBox={`0 0 ${TAMANIO} ${TAMANIO}`}>
                    <circle cx={CENTRO} cy={CENTRO} r={RADIO} fill="none" stroke="#f3f4f6" strokeWidth={GROSOR} />
                    {segmentos.map((s) => (
                        <circle
                            key={s.codigo}
                            className={`estadistica-donut-segmento${activa && activa !== s.codigo ? ' atenuado' : ''}`}
                            style={{ animationDelay: `${s.indice * 110}ms` }}
                            cx={CENTRO} cy={CENTRO} r={RADIO} fill="none"
                            stroke={s.color}
                            strokeWidth={activa === s.codigo ? GROSOR_ACTIVO : GROSOR}
                            strokeDasharray={`${s.largo} ${CIRCUNFERENCIA - s.largo}`}
                            strokeDashoffset={s.offset}
                            transform={`rotate(-90 ${CENTRO} ${CENTRO})`}
                            onMouseEnter={() => setActiva(s.codigo)}
                            onMouseLeave={() => setActiva(null)}
                            onClick={() => alternar(s.codigo)}
                        />
                    ))}
                </svg>
                <div className="estadistica-donut-centro">
                    {categoriaActiva ? (
                        <>
                            <span className="estadistica-donut-centro-label">{categoriaActiva.etiqueta}</span>
                            <span className="estadistica-donut-centro-valor" style={estiloValorCentro(textoCentro)}>{textoCentro}</span>
                            <span className="estadistica-donut-centro-pct">{formatearPorcentaje(categoriaActiva.porcentaje)} del total</span>
                        </>
                    ) : (
                        <>
                            <span className="estadistica-donut-centro-label">{etiquetaTotal}</span>
                            <span className="estadistica-donut-centro-valor" style={estiloValorCentro(textoCentro)}>{textoCentro}</span>
                            <span className="estadistica-donut-centro-pct">Tocá una categoría</span>
                        </>
                    )}
                </div>
            </div>

            <ul className="estadistica-donut-leyenda">
                {categorias.map((c, indice) => {
                    const color = COLOR_POR_CATEGORIA[c.codigo] || COLOR_CATEGORIA_DEFAULT;
                    const sinGasto = !(Number(c.monto) > 0);
                    return (
                        <li
                            key={c.codigo}
                            className={`estadistica-donut-fila${activa === c.codigo ? ' activa' : ''}${sinGasto ? ' sin-gasto' : ''}${activa && activa !== c.codigo ? ' atenuada' : ''}`}
                            style={{ '--color': color }}
                            tabIndex={0}
                            onMouseEnter={() => setActiva(c.codigo)}
                            onMouseLeave={() => setActiva(null)}
                            onFocus={() => setActiva(c.codigo)}
                            onBlur={() => setActiva(null)}
                            onClick={() => alternar(c.codigo)}
                        >
                            <span className="estadistica-donut-punto" />
                            <span className="estadistica-donut-etiqueta">{c.etiqueta}{c.detalle && <small className="estadistica-donut-detalle">{c.detalle}</small>}</span>
                            <span className="estadistica-donut-monto">$ {formatearMonto(c.monto)}</span>
                            <span className="estadistica-donut-porcentaje">{formatearPorcentaje(c.porcentaje)}</span>
                            <span className="estadistica-donut-barra">
                                <span
                                    className="estadistica-donut-barra-relleno"
                                    style={{ width: `${Math.min(100, Number(c.porcentaje))}%`, animationDelay: `${indice * 110}ms` }}
                                />
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default EstadisticaDonut;
