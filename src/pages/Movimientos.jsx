import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ActividadItem from '../components/ActividadItem';
import TransferenciaDetalleModal from '../components/TransferenciaDetalleModal';
import { listarTransferencias } from '../services/transferenciaService';
import { listarPlazosFijos } from '../services/plazoFijoService';
import { listarCambiosDolares } from '../services/cambioDolaresService';
import { listarOperacionesCripto } from '../services/criptoService';
import { listarHistorialFacturas } from '../services/facturaService';
import { listarMovimientosCajas } from '../services/cajaAhorroService';
import {
    construirActividades, filtrarPorFecha, filtrarPorTipo, contarPorTipo, TIPOS_ACTIVIDAD, aFechaLocalISO,
    FILTROS_TRANSFERENCIA, SIN_FILTROS_TRANSFERENCIA, hayFiltrosTransferencia, filtrarTransferencias, contarTransferencias,
} from '../utils/actividad';
import { IconArrowLeft, IconX } from '../components/icons/Icons';
import './Home.css';
import './Movimientos.css';

// El backend devuelve como maximo las 2.000 transferencias mas recientes (ver
// TransferenciaService.MAX_TRANSFERENCIAS_LISTADAS): un usuario con cien mil transferencias haria que cada
// carga bajara decenas de MB. Si llegan tantas, se avisa que puede haber mas antiguas que no se listan.
const LIMITE_TRANSFERENCIAS = 2000;
// Cuantos movimientos entran en cada pagina de la lista.
const POR_PAGINA = 30;
// Cuantos numeros de pagina se muestran a cada lado de la actual (el resto se resume con "...").
const PAGINAS_ALREDEDOR = 1;

// Atajos de rango, con la misma convencion que las estadisticas: "7 dias" es hoy y
// los 6 anteriores. Se calculan en cada render (no una sola vez al montar) para que
// sigan siendo correctos si la pagina queda abierta pasada la medianoche.
function armarAtajos() {
    const hoy = new Date();
    const haceDias = (n) => {
        const d = new Date(hoy);
        d.setDate(d.getDate() - n);
        return aFechaLocalISO(d);
    };
    const hoyISO = aFechaLocalISO(hoy);
    return [
        { id: 'todo', label: 'Todo', desde: '', hasta: '' },
        { id: 'hoy', label: 'Hoy', desde: hoyISO, hasta: hoyISO },
        { id: '7', label: '7 días', desde: haceDias(6), hasta: hoyISO },
        { id: '30', label: '30 días', desde: haceDias(29), hasta: hoyISO },
    ];
}

// Arma la lista de botones de pagina con "..." cuando hay demasiadas para mostrarlas todas:
// siempre la primera, la ultima, la actual y las PAGINAS_ALREDEDOR de cada lado.
function armarPaginas(paginaActual, totalPaginas) {
    if (totalPaginas <= 1) return [1];
    const paginas = new Set([1, totalPaginas, paginaActual]);
    for (let i = 1; i <= PAGINAS_ALREDEDOR; i++) {
        if (paginaActual - i >= 1) paginas.add(paginaActual - i);
        if (paginaActual + i <= totalPaginas) paginas.add(paginaActual + i);
    }
    const ordenadas = [...paginas].sort((a, b) => a - b);
    const resultado = [];
    ordenadas.forEach((pagina, i) => {
        if (i > 0 && pagina - ordenadas[i - 1] > 1) resultado.push('...');
        resultado.push(pagina);
    });
    return resultado;
}

function Movimientos() {
    const navigate = useNavigate();
    const [transferencias, setTransferencias] = useState([]);
    const [plazosFijos, setPlazosFijos] = useState([]);
    const [cambiosDolares, setCambiosDolares] = useState([]);
    const [cambiosCripto, setCambiosCripto] = useState([]);
    const [facturas, setFacturas] = useState([]);
    const [movimientosCajas, setMovimientosCajas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [detalleActivo, setDetalleActivo] = useState(null);
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [tipo, setTipo] = useState('');
    // Direccion / estado / moneda: solo existen (y solo se aplican) mientras el tipo elegido es "transferencias".
    const [filtrosTransf, setFiltrosTransf] = useState(SIN_FILTROS_TRANSFERENCIA);
    const [pagina, setPagina] = useState(1);

    const todasLasActividades = construirActividades(transferencias, plazosFijos, cambiosDolares, cambiosCripto, facturas, movimientosCajas);
    // Los filtros se combinan: primero el rango de fechas, sobre eso el tipo y, si es "transferencias", sus
    // sub-filtros. Los contadores salen del paso anterior, asi el numero de cada opcion es justo lo que se ve al
    // elegirla.
    const actividadesEnRango = filtrarPorFecha(todasLasActividades, desde, hasta);
    const cuentasPorTipo = contarPorTipo(actividadesEnRango);
    const actividadesDelTipo = filtrarPorTipo(actividadesEnRango, tipo);
    const filtrandoTransferencias = tipo === 'transferencias';
    const actividades = filtrandoTransferencias ? filtrarTransferencias(actividadesDelTipo, filtrosTransf) : actividadesDelTipo;
    const cuentasTransf = filtrandoTransferencias ? contarTransferencias(actividadesDelTipo, filtrosTransf) : null;
    const hayFiltroTransf = filtrandoTransferencias && hayFiltrosTransferencia(filtrosTransf);
    const atajos = armarAtajos();
    const hoyISO = aFechaLocalISO(new Date());
    const hayFiltroFecha = Boolean(desde || hasta);
    const hayFiltro = hayFiltroFecha || Boolean(tipo);
    const rangoInvalido = Boolean(desde && hasta && desde > hasta);
    const atajoActivo = atajos.find((a) => a.desde === desde && a.hasta === hasta);
    const hayTopeDeTransferencias = transferencias.length >= LIMITE_TRANSFERENCIAS;
    const totalPaginas = Math.max(1, Math.ceil(actividades.length / POR_PAGINA));
    // Si un filtro deja menos paginas que la actual (por ejemplo, se estaba en la pagina 5 y el
    // nuevo filtro solo tiene 2), se cae a la ultima pagina valida en vez de mostrar una vacia.
    const paginaActual = Math.min(pagina, totalPaginas);

    // Cada vez que cambia el filtro se vuelve a la primera pagina.
    function cambiarDesde(valor) {
        setDesde(valor);
        setPagina(1);
    }

    function cambiarHasta(valor) {
        setHasta(valor);
        setPagina(1);
    }

    function aplicarAtajo(atajo) {
        setDesde(atajo.desde);
        setHasta(atajo.hasta);
        setPagina(1);
    }

    function cambiarTipo(valor) {
        // Volver a tocar el tipo ya elegido no debe borrar los sub-filtros; cambiar a otro tipo si (si no,
        // quedarian aplicados sin que se vean).
        if (valor !== tipo) setFiltrosTransf(SIN_FILTROS_TRANSFERENCIA);
        setTipo(valor);
        setPagina(1);
    }

    function cambiarFiltroTransferencia(faceta, valor) {
        setFiltrosTransf((actuales) => ({ ...actuales, [faceta]: valor }));
        setPagina(1);
    }

    function limpiarFiltros() {
        setDesde('');
        setHasta('');
        setTipo('');
        setFiltrosTransf(SIN_FILTROS_TRANSFERENCIA);
        setPagina(1);
    }

    function irAPagina(numero) {
        setPagina(numero);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    useEffect(() => {
        cargar();
    }, []);

    // Polling: si otro usuario confirma o cancela una transferencia pendiente que
    // tenes con el (o si un plazo fijo tuyo vencio y el scheduler ya lo acredito),
    // no hay forma de enterarse sin preguntarle al backend de tanto en tanto (no hay
    // websockets en este proyecto). Silencioso: no toca "cargando" para no reemplazar
    // la lista por el cartel de "Cargando..." cada vez.
    useEffect(() => {
        const intervalo = setInterval(refrescarSilencioso, 5000);
        return () => clearInterval(intervalo);
    }, []);

    async function cargar() {
        setCargando(true);
        try {
            // Servicios y cajas van con su propio catch (null = no se pudo): si alguna de esas dos falla no
            // tiene que llevarse puestos los demas movimientos (que ya andaban antes de sumarlas).
            const [datosTransferencias, datosPlazosFijos, datosCambios, datosCripto, datosFacturas, datosCajas] = await Promise.all([
                listarTransferencias(),
                listarPlazosFijos(),
                listarCambiosDolares(),
                listarOperacionesCripto(),
                listarHistorialFacturas().catch(() => null),
                listarMovimientosCajas().catch(() => null),
            ]);
            setTransferencias(datosTransferencias);
            setPlazosFijos(datosPlazosFijos);
            setCambiosDolares(datosCambios);
            setCambiosCripto(datosCripto);
            if (datosFacturas) setFacturas(datosFacturas);
            if (datosCajas) setMovimientosCajas(datosCajas);
        } catch {
            // si falla, se muestra la lista vacia
        } finally {
            setCargando(false);
        }
    }

    async function refrescarSilencioso() {
        // Con la pestaña oculta nadie ve el cambio: no se le pega al backend (con un historial grande son varios
        // listados completos cada 5 segundos).
        if (document.hidden) return;
        try {
            const [datosTransferencias, datosPlazosFijos, datosCambios, datosCripto, datosFacturas, datosCajas] = await Promise.all([
                listarTransferencias(),
                listarPlazosFijos(),
                listarCambiosDolares(),
                listarOperacionesCripto(),
                listarHistorialFacturas().catch(() => null),
                listarMovimientosCajas().catch(() => null),
            ]);
            setTransferencias(datosTransferencias);
            setPlazosFijos(datosPlazosFijos);
            setCambiosDolares(datosCambios);
            setCambiosCripto(datosCripto);
            if (datosFacturas) setFacturas(datosFacturas);
            if (datosCajas) setMovimientosCajas(datosCajas);
            setDetalleActivo((actual) => (actual ? datosTransferencias.find((t) => t.id === actual.id) || actual : actual));
        } catch {
            // si falla, se mantiene la lista tal como estaba
        }
    }

    function manejarActualizada(actualizada) {
        setTransferencias((prev) => prev.map((t) => (t.id === actualizada.id ? actualizada : t)));
        setDetalleActivo(actualizada);
        // Confirmar una pendiente genera notificaciones (enviada/recibida) al instante
        window.dispatchEvent(new Event('notificaciones-actualizadas'));
    }

    return (
        <>
            <Navbar />
            <div className="movimientos-container">

                <button className="movimientos-volver" onClick={() => navigate('/inicio')}>
                    <IconArrowLeft size={16} /> Volver
                </button>

                <h1 className="movimientos-titulo">Todos tus movimientos</h1>
                <p className="movimientos-subtitulo">Transferencias, plazos fijos, dólares, cripto, servicios y cajas de ahorro</p>

                {!cargando && hayTopeDeTransferencias && (
                    <p className="movimientos-aviso-tope">
                        Tenés muchísimas transferencias: se muestran las {LIMITE_TRANSFERENCIAS.toLocaleString('es-AR')} más recientes.
                    </p>
                )}

                {cargando && <p className="movimientos-cargando">Cargando movimientos...</p>}

                {!cargando && todasLasActividades.length === 0 && (
                    <p className="home-actividad-vacio">Todavía no tenés movimientos</p>
                )}

                {!cargando && todasLasActividades.length > 0 && (
                    <div className="movimientos-filtros">
                        <div className="movimientos-filtros-atajos" role="group" aria-label="Tipo de movimiento">
                            <button
                                className={`movimientos-filtros-atajo ${tipo === '' ? 'activo' : ''}`}
                                onClick={() => cambiarTipo('')}
                            >
                                Todos los tipos <span className="movimientos-filtros-contador">{actividadesEnRango.length}</span>
                            </button>
                            {TIPOS_ACTIVIDAD.map((t) => (
                                <button
                                    key={t.id}
                                    className={`movimientos-filtros-atajo ${tipo === t.id ? 'activo' : ''}`}
                                    onClick={() => cambiarTipo(t.id)}
                                >
                                    {t.label} <span className="movimientos-filtros-contador">{cuentasPorTipo[t.id]}</span>
                                </button>
                            ))}
                        </div>

                        {filtrandoTransferencias && (
                            <div className="movimientos-subfiltros" role="group" aria-label="Filtros de transferencias">
                                {[
                                    { faceta: 'direccion', titulo: 'Dirección' },
                                    { faceta: 'estado', titulo: 'Estado' },
                                    { faceta: 'moneda', titulo: 'Moneda' },
                                ].map(({ faceta, titulo }) => (
                                    <label key={faceta} className="movimientos-filtros-campo">
                                        <span>{titulo}</span>
                                        <select
                                            className={filtrosTransf[faceta] ? 'activo' : ''}
                                            value={filtrosTransf[faceta]}
                                            onChange={(e) => cambiarFiltroTransferencia(faceta, e.target.value)}
                                        >
                                            {FILTROS_TRANSFERENCIA[faceta].map((opcion) => (
                                                <option key={opcion.id} value={opcion.id}>
                                                    {opcion.label} · {cuentasTransf[faceta][opcion.id]}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                ))}
                            </div>
                        )}

                        <div className="movimientos-filtros-atajos" role="group" aria-label="Rango de fechas">
                            {atajos.map((a) => (
                                <button
                                    key={a.id}
                                    className={`movimientos-filtros-atajo ${atajoActivo?.id === a.id ? 'activo' : ''}`}
                                    onClick={() => aplicarAtajo(a)}
                                >
                                    {a.label}
                                </button>
                            ))}
                        </div>

                        <div className="movimientos-filtros-fechas">
                            <label className="movimientos-filtros-campo">
                                <span>Desde</span>
                                <input
                                    type="date"
                                    value={desde}
                                    max={hasta || hoyISO}
                                    onChange={(e) => cambiarDesde(e.target.value)}
                                />
                            </label>
                            <label className="movimientos-filtros-campo">
                                <span>Hasta</span>
                                <input
                                    type="date"
                                    value={hasta}
                                    min={desde || undefined}
                                    max={hoyISO}
                                    onChange={(e) => cambiarHasta(e.target.value)}
                                />
                            </label>
                            {hayFiltro && (
                                <button className="movimientos-filtros-limpiar" onClick={limpiarFiltros}>
                                    <IconX size={13} /> Limpiar filtros
                                </button>
                            )}
                        </div>

                        {rangoInvalido && (
                            <p className="movimientos-filtros-error">La fecha "Desde" no puede ser posterior a "Hasta".</p>
                        )}
                        {hayFiltro && !rangoInvalido && (
                            <p className="movimientos-filtros-resumen">
                                {actividades.length} de {todasLasActividades.length} {todasLasActividades.length === 1 ? 'movimiento' : 'movimientos'}
                            </p>
                        )}
                    </div>
                )}

                {!cargando && todasLasActividades.length > 0 && actividades.length === 0 && !rangoInvalido && (
                    <div className="movimientos-sin-resultados">
                        <p>
                            {hayFiltroTransf ? `No hay transferencias que coincidan con esos filtros${hayFiltroFecha ? ' en ese rango de fechas' : ''}.`
                                : tipo && hayFiltroFecha ? 'No hay movimientos de ese tipo en ese rango de fechas.'
                                    : tipo ? 'No hay movimientos de ese tipo.'
                                        : 'No hay movimientos en ese rango de fechas.'}
                        </p>
                        <button className="movimientos-filtros-limpiar" onClick={limpiarFiltros}>Ver todos los movimientos</button>
                    </div>
                )}

                {!cargando && actividades.length > 0 && (
                    <div className="home-actividad-lista">
                        {actividades.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA).map((item) => (
                            <ActividadItem
                                key={item.key}
                                transferencia={item.transferencia}
                                plazoFijoEvento={item.plazoFijoEvento}
                                cambioDolares={item.cambioDolares}
                                cambioCripto={item.cambioCripto}
                                pagoServicio={item.pagoServicio}
                                movimientoCaja={item.movimientoCaja}
                                onClick={
                                    item.transferencia ? () => setDetalleActivo(item.transferencia)
                                        : item.plazoFijoEvento ? () => navigate('/plazos-fijos')
                                            : item.pagoServicio ? () => navigate('/servicios')
                                                : item.movimientoCaja ? () => navigate('/cajas-ahorro')
                                                    : undefined
                                }
                            />
                        ))}
                    </div>
                )}

                {!cargando && totalPaginas > 1 && (
                    <nav className="movimientos-paginacion" aria-label="Paginado de movimientos">
                        <p className="movimientos-paginacion-info">Página {paginaActual} de {totalPaginas}</p>
                        <button
                            className="movimientos-paginacion-boton"
                            onClick={() => irAPagina(paginaActual - 1)}
                            disabled={paginaActual === 1}
                            aria-label="Página anterior"
                        >
                            ‹
                        </button>
                        {armarPaginas(paginaActual, totalPaginas).map((p, i) => (
                            p === '...'
                                ? <span key={`puntos-${i}`} className="movimientos-paginacion-puntos">…</span>
                                : (
                                    <button
                                        key={p}
                                        className={`movimientos-paginacion-boton ${p === paginaActual ? 'activo' : ''}`}
                                        onClick={() => irAPagina(p)}
                                        aria-current={p === paginaActual ? 'page' : undefined}
                                    >
                                        {p}
                                    </button>
                                )
                        ))}
                        <button
                            className="movimientos-paginacion-boton"
                            onClick={() => irAPagina(paginaActual + 1)}
                            disabled={paginaActual === totalPaginas}
                            aria-label="Página siguiente"
                        >
                            ›
                        </button>
                    </nav>
                )}
            </div>

            <TransferenciaDetalleModal
                transferencia={detalleActivo}
                onCerrar={() => setDetalleActivo(null)}
                onActualizada={manejarActualizada}
            />
        </>
    );
}

export default Movimientos;
