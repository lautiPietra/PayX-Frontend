import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ActividadItem from '../components/ActividadItem';
import TransferenciaDetalleModal from '../components/TransferenciaDetalleModal';
import { listarTransferencias } from '../services/transferenciaService';
import { listarPlazosFijos } from '../services/plazoFijoService';
import { listarCambiosDolares } from '../services/cambioDolaresService';
import { listarOperacionesCripto } from '../services/criptoService';
import {
    construirActividades, filtrarPorFecha, filtrarPorTipo, contarPorTipo, TIPOS_ACTIVIDAD, aFechaLocalISO,
} from '../utils/actividad';
import { IconArrowLeft, IconX } from '../components/icons/Icons';
import './Home.css';
import './Movimientos.css';

// El backend devuelve como maximo las 2.000 transferencias mas recientes (ver
// TransferenciaService.MAX_TRANSFERENCIAS_LISTADAS): un usuario con cien mil transferencias haria que cada
// carga bajara decenas de MB. Si llegan tantas, se avisa que puede haber mas antiguas que no se listan.
const LIMITE_TRANSFERENCIAS = 2000;
// Cuantos movimientos se dibujan de una vez; con "Mostrar mas" se agregan de a tandas.
const POR_TANDA = 100;

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
        { id: 'mes', label: 'Este mes', desde: aFechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: hoyISO },
    ];
}

function Movimientos() {
    const navigate = useNavigate();
    const [transferencias, setTransferencias] = useState([]);
    const [plazosFijos, setPlazosFijos] = useState([]);
    const [cambiosDolares, setCambiosDolares] = useState([]);
    const [cambiosCripto, setCambiosCripto] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [detalleActivo, setDetalleActivo] = useState(null);
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [tipo, setTipo] = useState('');
    const [cantidadVisible, setCantidadVisible] = useState(POR_TANDA);

    const todasLasActividades = construirActividades(transferencias, plazosFijos, cambiosDolares, cambiosCripto);
    // Los dos filtros se combinan: primero el rango de fechas y sobre eso el tipo. Los contadores de cada tipo
    // salen del resultado por fecha, asi el numero del boton es justo lo que se ve al elegirlo.
    const actividadesEnRango = filtrarPorFecha(todasLasActividades, desde, hasta);
    const cuentasPorTipo = contarPorTipo(actividadesEnRango);
    const actividades = filtrarPorTipo(actividadesEnRango, tipo);
    const atajos = armarAtajos();
    const hoyISO = aFechaLocalISO(new Date());
    const hayFiltroFecha = Boolean(desde || hasta);
    const hayFiltro = hayFiltroFecha || Boolean(tipo);
    const rangoInvalido = Boolean(desde && hasta && desde > hasta);
    const atajoActivo = atajos.find((a) => a.desde === desde && a.hasta === hasta);
    const hayTopeDeTransferencias = transferencias.length >= LIMITE_TRANSFERENCIAS;

    // Cada vez que cambia el filtro se vuelve a la primera tanda.
    function cambiarDesde(valor) {
        setDesde(valor);
        setCantidadVisible(POR_TANDA);
    }

    function cambiarHasta(valor) {
        setHasta(valor);
        setCantidadVisible(POR_TANDA);
    }

    function aplicarAtajo(atajo) {
        setDesde(atajo.desde);
        setHasta(atajo.hasta);
        setCantidadVisible(POR_TANDA);
    }

    function cambiarTipo(valor) {
        setTipo(valor);
        setCantidadVisible(POR_TANDA);
    }

    function limpiarFiltros() {
        setDesde('');
        setHasta('');
        setTipo('');
        setCantidadVisible(POR_TANDA);
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
            const [datosTransferencias, datosPlazosFijos, datosCambios, datosCripto] = await Promise.all([
                listarTransferencias(),
                listarPlazosFijos(),
                listarCambiosDolares(),
                listarOperacionesCripto(),
            ]);
            setTransferencias(datosTransferencias);
            setPlazosFijos(datosPlazosFijos);
            setCambiosDolares(datosCambios);
            setCambiosCripto(datosCripto);
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
            const [datosTransferencias, datosPlazosFijos, datosCambios, datosCripto] = await Promise.all([
                listarTransferencias(),
                listarPlazosFijos(),
                listarCambiosDolares(),
                listarOperacionesCripto(),
            ]);
            setTransferencias(datosTransferencias);
            setPlazosFijos(datosPlazosFijos);
            setCambiosDolares(datosCambios);
            setCambiosCripto(datosCripto);
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
                <p className="movimientos-subtitulo">Transferencias, plazos fijos, dólares y cripto</p>

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
                            {tipo && hayFiltroFecha ? 'No hay movimientos de ese tipo en ese rango de fechas.'
                                : tipo ? 'No hay movimientos de ese tipo.'
                                    : 'No hay movimientos en ese rango de fechas.'}
                        </p>
                        <button className="movimientos-filtros-limpiar" onClick={limpiarFiltros}>Ver todos los movimientos</button>
                    </div>
                )}

                {!cargando && actividades.length > 0 && (
                    <div className="home-actividad-lista">
                        {actividades.slice(0, cantidadVisible).map((item) => (
                            <ActividadItem
                                key={item.key}
                                transferencia={item.transferencia}
                                plazoFijoEvento={item.plazoFijoEvento}
                                cambioDolares={item.cambioDolares}
                                cambioCripto={item.cambioCripto}
                                onClick={
                                    item.transferencia ? () => setDetalleActivo(item.transferencia)
                                        : item.plazoFijoEvento ? () => navigate('/plazos-fijos')
                                            : undefined
                                }
                            />
                        ))}
                    </div>
                )}

                {!cargando && actividades.length > cantidadVisible && (
                    <button className="movimientos-mostrar-mas" onClick={() => setCantidadVisible((n) => n + POR_TANDA)}>
                        Mostrar más ({(actividades.length - cantidadVisible).toLocaleString('es-AR')} restantes)
                    </button>
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
