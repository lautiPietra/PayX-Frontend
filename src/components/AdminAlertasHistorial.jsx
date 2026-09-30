import { useState, useEffect, useMemo, useRef } from 'react';
import { obtenerHistorialAlertas, cambiarRevisionAlerta, volverAlertaAPendiente } from '../services/adminService';
import { aFechaLocalISO } from '../utils/actividad';
import AdminAlertaItem from './AdminAlertaItem';
import AdminPaginacion from './AdminPaginacion';
import { BloqueUsuarioAlerta, EditorNota, InfoRevision } from './AdminAlertaRevision';
import { IconSearch, IconX, IconHistory } from './icons/Icons';
import './AdminAlertas.css';

const TAMANIOS_PAGINA = [10, 20, 50, 100];
const DEMORA_BUSQUEDA_MS = 350;

const ESTADOS = [
    { codigo: '', etiqueta: 'Todas' },
    { codigo: 'LEIDA', etiqueta: 'Leídas' },
    { codigo: 'ANALIZADA', etiqueta: 'Analizadas' },
];
const SEVERIDADES = [
    { codigo: 'ALTA', etiqueta: 'Alta' },
    { codigo: 'MEDIA', etiqueta: 'Media' },
    { codigo: 'BAJA', etiqueta: 'Baja' },
];
// Los codigos son los de AdminAlertaService.
const REGLAS = [
    { codigo: 'MONTO_ALTO', etiqueta: 'Monto alto' },
    { codigo: 'RAFAGA', etiqueta: 'Ráfaga de transferencias' },
    { codigo: 'CUENTA_NUEVA', etiqueta: 'Cuenta nueva' },
    { codigo: 'SALDO_NEGATIVO', etiqueta: 'Saldo negativo' },
    { codigo: 'ESCALADA_PRIVILEGIOS', etiqueta: 'Nuevo administrador' },
];
const ORDENES = [
    { codigo: 'recientes', etiqueta: 'Más recientes primero' },
    { codigo: 'antiguos', etiqueta: 'Más antiguas primero' },
    { codigo: 'gravedad', etiqueta: 'Por gravedad' },
];

// Acciones de una fila del historial: pasar una leida a analizada, editar la nota de una analizada, o volver la
// alerta a pendiente (pide confirmar: borra la marca). Despues de cada cambio se recarga el historial.
function AccionesHistorial({ alerta, onCambio }) {
    const { revision } = alerta;
    const [editando, setEditando] = useState(false);
    const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    async function ejecutar(accion) {
        setEnviando(true);
        setError('');
        try {
            await accion();
            setEditando(false);
            setConfirmandoBorrar(false);
            onCambio();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo completar la acción. Probá de nuevo en un momento.');
        } finally {
            setEnviando(false);
        }
    }

    if (editando) {
        return (
            <div className="admin-alerta-revisar">
                <EditorNota
                    inicial={revision.nota || ''}
                    etiquetaConfirmar={revision.estado === 'LEIDA' ? 'Marcar como analizada' : 'Guardar nota'}
                    enviando={enviando}
                    onConfirmar={(nota) => ejecutar(() => cambiarRevisionAlerta(revision.id, 'ANALIZADA', nota))}
                    onCancelar={() => setEditando(false)}
                />
                {error && <p className="admin-alerta-error" role="alert">{error}</p>}
            </div>
        );
    }

    return (
        <div className="admin-alerta-revisar">
            <div className="admin-alerta-acciones">
                {revision.estado === 'LEIDA' && (
                    <button onClick={() => setEditando(true)} disabled={enviando}>Marcar como analizada</button>
                )}
                {revision.estado === 'ANALIZADA' && (
                    <button onClick={() => setEditando(true)} disabled={enviando}>Editar nota</button>
                )}
                {!confirmandoBorrar ? (
                    <button onClick={() => setConfirmandoBorrar(true)} disabled={enviando}>Volver a pendiente</button>
                ) : (
                    <>
                        <span className="admin-alerta-confirmar-texto">¿Sacarla del historial?</span>
                        <button className="peligro" onClick={() => ejecutar(() => volverAlertaAPendiente(revision.id))} disabled={enviando}>
                            {enviando ? 'Quitando...' : 'Sí, volver a pendiente'}
                        </button>
                        <button onClick={() => setConfirmandoBorrar(false)} disabled={enviando}>Cancelar</button>
                    </>
                )}
            </div>
            {error && <p className="admin-alerta-error" role="alert">{error}</p>}
        </div>
    );
}

// Historial de alertas ya marcadas como leidas o analizadas: paginado y filtrable (todo resuelto en el backend).
// Cada fila es la COPIA que se guardo al marcarla, asi que se ve igual aunque la alerta original ya no se calcule.
// "onCambio" avisa al panel cuando algo vuelve a pendiente (para que recargue la lista de pendientes).
function AdminAlertasHistorial({ onVerMovimientos, onVerUsuario, onCambio }) {
    const [busqueda, setBusqueda] = useState('');
    const [terminoAplicado, setTerminoAplicado] = useState('');
    const [estado, setEstado] = useState('');
    const [severidad, setSeveridad] = useState('');
    const [regla, setRegla] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [orden, setOrden] = useState('recientes');
    const [tamanio, setTamanio] = useState(20);
    const [pagina, setPagina] = useState(0);
    const [recarga, setRecarga] = useState(0);
    const [resultado, setResultado] = useState(null); // { consulta, datos, error }
    const contenedorRef = useRef(null);

    const rangoInvalido = Boolean(desde && hasta && desde > hasta);
    const hoyISO = aFechaLocalISO(new Date());
    const hayFiltros = Boolean(busqueda || estado || severidad || regla || desde || hasta || orden !== 'recientes');

    // El texto ya aplicado vive tambien en un ref para comparar sin depender del estado: el temporizador corre
    // al montar y, si reiniciara la pagina siempre, pasaria a la pagina 1 a alguien que ya fue a la 2 (o haria un
    // pedido de mas) aunque no haya tocado la busqueda.
    const terminoRef = useRef('');
    useEffect(() => {
        const id = setTimeout(() => {
            const nuevo = busqueda.trim();
            if (nuevo === terminoRef.current) return;
            terminoRef.current = nuevo;
            setTerminoAplicado(nuevo);
            setPagina(0);
        }, DEMORA_BUSQUEDA_MS);
        return () => clearTimeout(id);
    }, [busqueda]);

    const consulta = useMemo(
        () => ({ pagina, tamanio, estado, severidad, regla, desde, hasta, termino: terminoAplicado, orden, recarga }),
        [pagina, tamanio, estado, severidad, regla, desde, hasta, terminoAplicado, orden, recarga]
    );

    useEffect(() => {
        // Con el rango invertido no se le pregunta nada al backend (respondería 400): se avisa en pantalla.
        if (rangoInvalido) return;
        let cancelado = false;
        obtenerHistorialAlertas(consulta)
            .then((datos) => {
                if (cancelado) return;
                setResultado({ consulta, datos, error: '' });
                // Si se vacio la ultima pagina (se saco la unica alerta de ella), volver a la anterior.
                if (datos.contenido.length === 0 && consulta.pagina > 0) {
                    setPagina(Math.max(0, datos.totalPaginas - 1));
                }
            })
            .catch((error) => {
                if (cancelado) return;
                setResultado((previo) => ({
                    consulta,
                    datos: previo?.datos ?? null,
                    error: error.response?.data?.error || 'No se pudo cargar el historial. Probá de nuevo en un momento.',
                }));
            });
        return () => { cancelado = true; };
    }, [consulta, rangoInvalido]);

    const datos = resultado?.datos ?? null;
    const cargando = !rangoInvalido && resultado?.consulta !== consulta;
    const error = cargando || rangoInvalido ? '' : (resultado?.error ?? '');
    const filas = datos?.contenido ?? [];
    const ahoraMs = datos ? new Date(datos.ahora).getTime() : 0;

    function cambiar(setter) {
        return (valor) => {
            setter(valor);
            setPagina(0);
        };
    }

    function limpiarFiltros() {
        setBusqueda('');
        terminoRef.current = '';
        setTerminoAplicado('');
        setEstado('');
        setSeveridad('');
        setRegla('');
        setDesde('');
        setHasta('');
        setOrden('recientes');
        setPagina(0);
    }

    function irAPagina(nueva) {
        setPagina(nueva);
        contenedorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function despuesDeUnCambio() {
        setRecarga((n) => n + 1);
        onCambio?.();
    }

    return (
        <div ref={contenedorRef}>
            <div className="admin-buscador">
                <IconSearch className="admin-buscador-icon" size={16} />
                <input
                    type="text"
                    placeholder="Buscar por título, descripción, nota, usuario o quién la revisó..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    maxLength={100}
                    aria-label="Buscar en el historial"
                />
            </div>

            <div className="admin-chips admin-alertas-estados" role="tablist" aria-label="Estado de la revisión">
                {ESTADOS.map((e) => (
                    <button
                        key={e.codigo || 'todas'}
                        role="tab"
                        aria-selected={estado === e.codigo}
                        className={`admin-chip ${estado === e.codigo ? 'activo' : ''}`}
                        onClick={() => cambiar(setEstado)(e.codigo)}
                    >
                        {e.etiqueta}
                    </button>
                ))}
            </div>

            <div className="admin-filtros">
                <select value={severidad} onChange={(e) => cambiar(setSeveridad)(e.target.value)} aria-label="Filtrar por gravedad">
                    <option value="">Cualquier gravedad</option>
                    {SEVERIDADES.map((s) => <option key={s.codigo} value={s.codigo}>{s.etiqueta}</option>)}
                </select>
                <select value={regla} onChange={(e) => cambiar(setRegla)(e.target.value)} aria-label="Filtrar por tipo de alerta">
                    <option value="">Todos los tipos</option>
                    {REGLAS.map((r) => <option key={r.codigo} value={r.codigo}>{r.etiqueta}</option>)}
                </select>
                <label className="admin-alertas-fecha">
                    Revisadas desde
                    <input type="date" value={desde} max={hasta || hoyISO} onChange={(e) => cambiar(setDesde)(e.target.value)} />
                </label>
                <label className="admin-alertas-fecha">
                    hasta
                    <input type="date" value={hasta} min={desde || undefined} max={hoyISO} onChange={(e) => cambiar(setHasta)(e.target.value)} />
                </label>
                <select value={orden} onChange={(e) => cambiar(setOrden)(e.target.value)} aria-label="Ordenar">
                    {ORDENES.map((o) => <option key={o.codigo} value={o.codigo}>{o.etiqueta}</option>)}
                </select>
                {hayFiltros && (
                    <button className="admin-filtros-limpiar" onClick={limpiarFiltros}>
                        <IconX size={13} /> Limpiar
                    </button>
                )}
                {datos && !rangoInvalido && datos.disponible && (
                    <span className="admin-filtros-conteo">
                        {datos.totalElementos.toLocaleString('es-AR')} {datos.totalElementos === 1 ? 'alerta' : 'alertas'}
                    </span>
                )}
            </div>

            {rangoInvalido && <div className="admin-mensaje error">La fecha "desde" no puede ser posterior a "hasta".</div>}
            {error && <div className="admin-mensaje error">{error}</div>}

            {datos && !datos.disponible && (
                <div className="admin-alertas-aviso">
                    El historial todavía no está habilitado: falta crear la tabla en la base. Correr <strong>sql/alertas-revisadas.sql</strong> en Supabase.
                </div>
            )}

            {!rangoInvalido && !datos && cargando && (
                <div className="admin-skeleton-lista">
                    {Array.from({ length: 4 }, (_, i) => <div key={i} className="admin-skeleton-fila alto" />)}
                </div>
            )}

            {!rangoInvalido && datos?.disponible && filas.length === 0 && !cargando && (
                <div className="admin-alertas-vacio">
                    <span className="admin-alertas-vacio-icono"><IconHistory size={26} /></span>
                    <p>{hayFiltros ? 'No se encontraron alertas con esos filtros' : 'Todavía no revisaste ninguna alerta'}</p>
                    {!hayFiltros && (
                        <p className="admin-alertas-vacio-sub">Las que marques como leídas o analizadas van a quedar acá.</p>
                    )}
                </div>
            )}

            {!rangoInvalido && filas.length > 0 && (
                <div className={`admin-alertas-lista ${cargando ? 'cargando' : ''}`}>
                    {filas.map((a) => (
                        <AdminAlertaItem key={a.revision.id} alerta={a} ahoraMs={ahoraMs}>
                            {a.usuario && <BloqueUsuarioAlerta usuario={a.usuario} />}
                            <InfoRevision revision={a.revision} />
                            <AccionesHistorial alerta={a} onCambio={despuesDeUnCambio} />
                            {a.usuario && (
                                <div className="admin-alerta-acciones">
                                    <button onClick={() => onVerMovimientos(a.usuario)}>Ver movimientos</button>
                                    <button onClick={() => onVerUsuario(a.usuario)}>Ver ficha</button>
                                </div>
                            )}
                        </AdminAlertaItem>
                    ))}
                </div>
            )}

            {!rangoInvalido && datos?.disponible && (
                <AdminPaginacion
                    pagina={datos.pagina}
                    totalPaginas={datos.totalPaginas}
                    totalElementos={datos.totalElementos}
                    tamanio={datos.tamanio}
                    cantidadEnPagina={filas.length}
                    onCambiarPagina={irAPagina}
                    tamanios={TAMANIOS_PAGINA}
                    onCambiarTamanio={(t) => { setTamanio(t); setPagina(0); }}
                    deshabilitado={cargando}
                />
            )}
        </div>
    );
}

export default AdminAlertasHistorial;
