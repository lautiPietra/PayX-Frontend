import { useState } from 'react';
import './EstadisticaBarras.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearCompacto(valor) {
    if (valor >= 1_000_000) return `$${(valor / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;
    if (valor >= 1_000) return `$${(valor / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} mil`;
    return `$${Math.round(valor)}`;
}

function formatearFechaCorta(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function formatearFechaConDia(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
}

// Grafico de barras armado a mano (sin libreria): una barra por dia del periodo,
// escalada contra el maximo del propio periodo, con lineas guia, la barra del
// pico resaltada, una linea punteada con el promedio diario, y un tooltip al
// pasar el mouse (o tocar) sobre cualquier dia.
function EstadisticaBarras({ puntos, formatoValor = (v) => `$ ${formatearMonto(v)}`, formatoEje = formatearCompacto, etiquetaPromedio = "Promedio" }) {
    const [activo, setActivo] = useState(null);

    if (puntos.length === 0) return null;

    const montos = puntos.map((p) => Number(p.monto));
    const maximo = Math.max(...montos, 0.01);
    const promedio = montos.reduce((suma, m) => suma + m, 0) / montos.length;
    const indicePico = montos.some((m) => m > 0) ? montos.indexOf(Math.max(...montos)) : -1;
    const indiceMedio = Math.floor((puntos.length - 1) / 2);
    const puntoActivo = activo !== null ? puntos[activo] : null;

    // Cerca de los bordes el tooltip se ancla al costado en vez de centrarse, para no cortarse.
    const posicionActiva = activo !== null ? ((activo + 0.5) / puntos.length) * 100 : 0;
    const anclaTooltip = posicionActiva < 14 ? 'izquierda' : posicionActiva > 86 ? 'derecha' : 'centro';

    return (
        <div className="estadistica-barras">
            <div className="estadistica-barras-cuerpo">
                <div className="estadistica-barras-ejey">
                    <span>{formatoEje(maximo)}</span>
                    <span>{formatoEje(maximo / 2)}</span>
                    <span>{formatoEje(0)}</span>
                </div>

                <div className="estadistica-barras-area" onMouseLeave={() => setActivo(null)}>
                    <span className="estadistica-barras-guia" style={{ bottom: '0%' }} />
                    <span className="estadistica-barras-guia" style={{ bottom: '50%' }} />
                    <span className="estadistica-barras-guia" style={{ bottom: '100%' }} />

                    <div className="estadistica-barras-grafico">
                        {puntos.map((p, i) => {
                            const monto = montos[i];
                            const clases = [
                                'estadistica-columna',
                                activo === i ? 'activa' : '',
                                monto <= 0 ? 'vacia' : '',
                                i === indicePico ? 'pico' : '',
                            ].filter(Boolean).join(' ');
                            return (
                                <div
                                    key={p.fecha}
                                    className={clases}
                                    // El escalonado se topea (i hasta 40) para que con 90 barras la animacion no tarde una eternidad.
                                    style={{ '--i': Math.min(i, 40) }}
                                    onMouseEnter={() => setActivo(i)}
                                    onClick={() => setActivo((actual) => (actual === i ? null : i))}
                                >
                                    <div className="estadistica-barra" style={{ height: `${(monto / maximo) * 100}%` }} />
                                </div>
                            );
                        })}
                    </div>

                    {promedio > 0 && (
                        <span className="estadistica-barras-promedio" style={{ bottom: `${(promedio / maximo) * 100}%` }}>
                            <span className="estadistica-barras-promedio-label">{etiquetaPromedio} {formatoEje(promedio)}</span>
                        </span>
                    )}

                    {puntoActivo && (
                        <div
                            className={`estadistica-tooltip ${anclaTooltip}`}
                            style={{ left: `${posicionActiva}%`, bottom: `calc(${(montos[activo] / maximo) * 100}% + 12px)` }}
                        >
                            <span className="estadistica-tooltip-fecha">{formatearFechaConDia(puntoActivo.fecha)}</span>
                            <span className="estadistica-tooltip-monto">{formatoValor(puntoActivo.monto)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="estadistica-barras-eje">
                <span>{formatearFechaCorta(puntos[0].fecha)}</span>
                {puntos.length >= 5 && <span>{formatearFechaCorta(puntos[indiceMedio].fecha)}</span>}
                <span>{formatearFechaCorta(puntos[puntos.length - 1].fecha)}</span>
            </div>
        </div>
    );
}

export default EstadisticaBarras;
