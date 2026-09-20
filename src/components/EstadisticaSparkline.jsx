import './EstadisticaSparkline.css';

const ANCHO = 100;
const ALTO = 32;
const MARGEN = 5;

// Mini grafico de tendencia (sin ejes ni numeros) para decorar el resumen:
// la linea se "dibuja" sola con stroke-dashoffset y el area bajo ella se
// desvanece hacia adentro. Muestra el gasto ACUMULADO dia a dia y no el de cada
// dia: como la mayoria de los dias no hay gasto, la serie diaria quedaba como una
// linea plana pegada al borde con un solo pico. El detalle por dia esta en las barras.
function EstadisticaSparkline({ puntos }) {
    if (puntos.length < 2) return null;

    const montos = puntos.reduce((serie, p) => {
        const previo = serie.length > 0 ? serie[serie.length - 1] : 0;
        return [...serie, previo + Number(p.monto)];
    }, []);
    const maximo = montos[montos.length - 1];
    if (!(maximo > 0)) return null;

    const coordenadas = montos.map((m, i) => {
        const x = (i / (montos.length - 1)) * ANCHO;
        const y = ALTO - MARGEN - (m / maximo) * (ALTO - MARGEN * 2);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const linea = `M ${coordenadas.join(' L ')}`;
    const area = `${linea} L ${ANCHO},${ALTO} L 0,${ALTO} Z`;

    return (
        <svg className="estadistica-sparkline" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id="estadistica-sparkline-relleno" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff8b4d" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#ff8b4d" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill="url(#estadistica-sparkline-relleno)" />
            <path
                d={linea}
                fill="none"
                stroke="#ff8b4d"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

export default EstadisticaSparkline;
