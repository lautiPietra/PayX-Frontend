import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EstadisticaDonut from '../components/EstadisticaDonut';
import EstadisticaBarras from '../components/EstadisticaBarras';
import EstadisticaSparkline from '../components/EstadisticaSparkline';
import { IconArrowLeft, IconBarChart, IconTrendingUp, IconCalendar, IconArrowUpCircle } from '../components/icons/Icons';
import { obtenerEstadisticaGastos } from '../services/estadisticaService';
import { useValorAnimado } from '../hooks/useValorAnimado';
import { COLOR_POR_CATEGORIA, COLOR_CATEGORIA_DEFAULT } from '../utils/estadisticasTemas';
import './Movimientos.css';
import '../components/TransferModal.css';
import './Estadisticas.css';

const PERIODOS = [
    { dias: 7, label: '7 días' },
    { dias: 30, label: '30 días' },
    { dias: 90, label: '90 días' },
    { dias: 0, label: 'Todo' },
];

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parsearFecha(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
}

function formatearFechaLarga(fechaIso) {
    return parsearFecha(fechaIso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatearFechaCorta(fechaIso) {
    return parsearFecha(fechaIso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

// Cantidad de dias del periodo, contando ambos extremos (igual que la ventana del backend).
function diasDelPeriodo(desde, hasta) {
    return Math.round((parsearFecha(hasta) - parsearFecha(desde)) / 86400000) + 1;
}

// Todo lo que se muestra en el resumen y las tarjetas y se puede deducir de la
// respuesta del backend sin pedirle nada mas.
function calcularResumen(datos) {
    const total = Number(datos.totalGastado);

    // En "Todo" no hay fecha de inicio: el periodo es el que cubre la serie (desde el
    // primer gasto), y si no hay serie no hay con que calcular un promedio.
    const dias = datos.desde ? diasDelPeriodo(datos.desde, datos.hasta) : (datos.porDia.length || null);
    const promedioDiario = dias ? total / dias : null;

    let diaPico = null;
    for (const p of datos.porDia) {
        if (Number(p.monto) > 0 && (!diaPico || Number(p.monto) > Number(diaPico.monto))) diaPico = p;
    }

    // El backend ya manda las categorias ordenadas de mayor a menor gasto.
    const categoriaPrincipal = datos.categorias.find((c) => Number(c.monto) > 0) || null;

    let variacion = null;
    if (datos.totalPeriodoAnterior != null) {
        const anterior = Number(datos.totalPeriodoAnterior);
        if (anterior > 0) variacion = { tipo: 'porcentaje', valor: ((total - anterior) / anterior) * 100 };
        else if (total > 0) variacion = { tipo: 'nuevo' };
    }

    return { total, promedioDiario, diaPico, categoriaPrincipal, variacion };
}

function Variacion({ variacion }) {
    if (!variacion) return null;

    if (variacion.tipo === 'nuevo') {
        return <span className="estadisticas-variacion neutra">Sin gastos en el período anterior</span>;
    }

    const redondeada = Math.round(variacion.valor * 10) / 10;
    if (redondeada === 0) {
        return <span className="estadisticas-variacion neutra">Igual que el período anterior</span>;
    }

    const sube = redondeada > 0;
    return (
        <span className={`estadisticas-variacion ${sube ? 'sube' : 'baja'}`}>
            <IconTrendingUp size={13} className={sube ? '' : 'invertido'} />
            {Math.abs(redondeada).toLocaleString('es-AR', { maximumFractionDigits: 1 })}% {sube ? 'más' : 'menos'} que el período anterior
        </span>
    );
}

function Esqueleto() {
    return (
        <>
            <div className="estadisticas-skeleton estadisticas-skeleton-hero" />
            <div className="estadisticas-kpis">
                {[0, 1, 2, 3].map((i) => <div key={i} className="estadisticas-skeleton estadisticas-skeleton-kpi" />)}
            </div>
            <div className="estadisticas-skeleton estadisticas-skeleton-seccion" />
        </>
    );
}

function Estadisticas() {
    const navigate = useNavigate();
    const [dias, setDias] = useState(30);
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Si el usuario clickea varios periodos seguido (7/30/90/todo), los pedidos
        // pueden volver desordenados: sin esto, una respuesta vieja que llega tarde
        // pisaria los datos del periodo que en realidad esta seleccionado ahora.
        let cancelado = false;
        obtenerEstadisticaGastos(dias)
            .then((data) => { if (!cancelado) setDatos(data); })
            .catch(() => { if (!cancelado) setError('No pudimos cargar tus estadísticas. Probá de nuevo en un momento.'); })
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, [dias]);

    // El "cargando" y el error se reinician aca (en el evento) y no dentro del
    // efecto de arriba, que solo se ocupa de pedir los datos.
    function cambiarPeriodo(nuevosDias) {
        if (nuevosDias === dias) return;
        setCargando(true);
        setError('');
        setDias(nuevosDias);
    }

    const resumen = datos ? calcularResumen(datos) : null;
    // Al cambiar de periodo el total "corre" desde el valor anterior hasta el nuevo
    // en vez de saltar de golpe (y la primera vez arranca desde cero).
    const [totalAnimado] = useValorAnimado(resumen ? resumen.total : 0, 1000);

    const indicePeriodo = PERIODOS.findIndex((p) => p.dias === dias);
    const primeraCarga = cargando && !datos;
    const mostrarContenido = !error && datos;

    const kpis = resumen ? [
        {
            clave: 'operaciones',
            Icon: IconArrowUpCircle,
            etiqueta: 'Operaciones',
            valor: String(datos.cantidadOperaciones),
            detalle: datos.cantidadOperaciones === 1 ? 'movimiento de salida' : 'movimientos de salida',
        },
        resumen.promedioDiario != null && {
            clave: 'promedio',
            Icon: IconTrendingUp,
            etiqueta: 'Promedio diario',
            valor: `$ ${formatearMonto(resumen.promedioDiario)}`,
            esMonto: true,
            detalle: 'por día del período',
        },
        resumen.diaPico && {
            clave: 'pico',
            Icon: IconCalendar,
            etiqueta: 'Día de mayor gasto',
            valor: `$ ${formatearMonto(resumen.diaPico.monto)}`,
            esMonto: true,
            detalle: formatearFechaCorta(resumen.diaPico.fecha),
        },
        resumen.categoriaPrincipal && {
            clave: 'categoria',
            Icon: IconBarChart,
            etiqueta: 'Categoría principal',
            valor: resumen.categoriaPrincipal.etiqueta,
            detalle: `${Number(resumen.categoriaPrincipal.porcentaje).toLocaleString('es-AR', { maximumFractionDigits: 1 })}% del total`,
            color: COLOR_POR_CATEGORIA[resumen.categoriaPrincipal.codigo] || COLOR_CATEGORIA_DEFAULT,
        },
    ].filter(Boolean) : [];

    return (
        <>
            <Navbar />
            <div className="movimientos-container">
                <button className="movimientos-volver" onClick={() => navigate('/inicio')}>
                    <IconArrowLeft size={16} /> Volver
                </button>

                <h1 className="movimientos-titulo">Estadísticas de gastos</h1>
                <p className="movimientos-subtitulo">
                    Transferencias enviadas, compra de dólares y cripto, plazos fijos y pago de servicios. Mover plata a una caja de ahorro no cuenta como gasto: sigue siendo tuya.
                </p>

                <div className="estadisticas-periodos" style={{ '--idx': indicePeriodo }} role="tablist" aria-label="Período">
                    <span className="estadisticas-periodos-indicador" aria-hidden="true" />
                    {PERIODOS.map((p) => (
                        <button
                            key={p.dias}
                            role="tab"
                            aria-selected={dias === p.dias}
                            className={`estadisticas-periodo-btn ${dias === p.dias ? 'activo' : ''}`}
                            onClick={() => cambiarPeriodo(p.dias)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {error && <div className="transfer-error">{error}</div>}

                {primeraCarga && <Esqueleto />}

                {mostrarContenido && (
                    <div className={`estadisticas-contenido${cargando ? ' actualizando' : ''}`}>
                        <div className="estadisticas-hero estadisticas-entrada" style={{ '--d': 0 }}>
                            <div className="estadisticas-hero-cabecera">
                                <span className="estadisticas-hero-icono"><IconBarChart size={20} /></span>
                                <div>
                                    <p className="estadisticas-hero-label">
                                        {datos.desde
                                            ? `Gastado del ${formatearFechaLarga(datos.desde)} al ${formatearFechaLarga(datos.hasta)}`
                                            : 'Gastado desde siempre'}
                                    </p>
                                    <p className="estadisticas-hero-valor">$ {formatearMonto(totalAnimado)}</p>
                                </div>
                            </div>
                            <Variacion variacion={resumen.variacion} />
                            {datos.porDia.length > 1 && (
                                <div className="estadisticas-hero-sparkline">
                                    <EstadisticaSparkline key={`${datos.desde}-${datos.porDia.length}`} puntos={datos.porDia} />
                                </div>
                            )}
                        </div>

                        {kpis.length > 0 && (
                            <div className="estadisticas-kpis">
                                {kpis.map((k, i) => (
                                    <div key={k.clave} className="estadisticas-kpi estadisticas-entrada" style={{ '--d': i + 1 }}>
                                        <span className="estadisticas-kpi-icono" style={k.color ? { color: k.color, backgroundColor: `color-mix(in srgb, ${k.color} 14%, transparent)` } : undefined}>
                                            <k.Icon size={16} />
                                        </span>
                                        <p className="estadisticas-kpi-etiqueta">{k.etiqueta}</p>
                                        <p className={`estadisticas-kpi-valor${k.esMonto ? ' monto' : ''}`}>{k.valor}</p>
                                        <p className="estadisticas-kpi-detalle">{k.detalle}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="estadisticas-seccion estadisticas-entrada" style={{ '--d': 5 }}>
                            <h2 className="estadisticas-seccion-titulo">Por categoría</h2>
                            <EstadisticaDonut categorias={datos.categorias} total={datos.totalGastado} />
                        </div>

                        {datos.porDia.length > 0 && (
                            <div className="estadisticas-seccion estadisticas-entrada" style={{ '--d': 6 }}>
                                <h2 className="estadisticas-seccion-titulo">Día a día</h2>
                                <EstadisticaBarras key={`${datos.desde}-${datos.porDia.length}`} puntos={datos.porDia} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

export default Estadisticas;
