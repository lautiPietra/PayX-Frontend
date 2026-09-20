import { useState, useEffect, useMemo, useRef } from 'react';
import { listarTransacciones, exportarTransacciones } from '../services/adminService';
import { aFechaLocalISO } from '../utils/actividad';
import { TIPOS, ESTADOS, textoMonto } from '../utils/transaccionesAdmin';
import AdminAvatar from './AdminAvatar';
import AdminExportar from './AdminExportar';
import AdminPaginacion from './AdminPaginacion';
import { BadgeTipo, BadgeEstado } from './AdminTransaccionBadges';
import { IconSearch, IconX, IconUser } from './icons/Icons';
import './AdminTransacciones.css';

const TAMANIOS_PAGINA = [10, 20, 50, 100];
const DEMORA_BUSQUEDA_MS = 350;

function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

function CeldaUsuario({ transaccion, onFiltrarUsuario, onVerFicha }) {
    const { usuario, contraparte } = transaccion;
    if (!usuario) return <span className="admin-tx-desconocido">Usuario desconocido</span>;

    return (
        <div className="admin-tx-usuario">
            <AdminAvatar key={usuario.fotoPerfilUrl || 'sin-foto'} usuario={usuario} />
            <div className="admin-tx-usuario-textos">
                <div className="admin-tx-usuario-linea">
                    <button className="admin-tx-usuario-nombre" onClick={() => onFiltrarUsuario(usuario)} title="Ver solo las transacciones de este usuario">
                        {usuario.nombreCompleto}
                    </button>
                    <button className="admin-tx-ficha" onClick={() => onVerFicha(usuario)} title="Ver la ficha de este usuario" aria-label={`Ver la ficha de ${usuario.nombreCompleto}`}>
                        <IconUser size={13} />
                    </button>
                </div>
                {contraparte ? (
                    <p className="admin-tx-contraparte">
                        → <button onClick={() => onFiltrarUsuario(contraparte)}>{contraparte.nombreCompleto}</button>
                    </p>
                ) : (
                    <p className="admin-tx-contraparte">@{usuario.nombreUsuario}</p>
                )}
            </div>
        </div>
    );
}

// Monitor global: transferencias, cambios de dolares/cripto, plazos fijos y servicios de TODOS los
// usuarios en un solo listado, paginado y filtrable (todo resuelto en el backend). El filtro por
// usuario lo maneja el panel (asi se puede llegar aca desde una alerta, ya filtrado).
function AdminTransacciones({ usuarioFiltro, onCambiarUsuarioFiltro, onVerFicha }) {
    const [busqueda, setBusqueda] = useState('');
    const [terminoAplicado, setTerminoAplicado] = useState('');
    const [tipo, setTipo] = useState('');
    const [estado, setEstado] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [tamanio, setTamanio] = useState(20);
    const [pagina, setPagina] = useState(0);
    const [resultado, setResultado] = useState(null); // { consulta, datos, error }
    const contenedorRef = useRef(null);

    const usuarioId = usuarioFiltro?.id ?? '';
    const rangoInvalido = Boolean(desde && hasta && desde > hasta);
    const hoyISO = aFechaLocalISO(new Date());
    const hayFiltros = Boolean(busqueda || tipo || estado || desde || hasta || usuarioId);

    useEffect(() => {
        const id = setTimeout(() => {
            setTerminoAplicado(busqueda.trim());
            setPagina(0);
        }, DEMORA_BUSQUEDA_MS);
        return () => clearTimeout(id);
    }, [busqueda]);

    const consulta = useMemo(
        () => ({ pagina, tamanio, tipo, estado, desde, hasta, termino: terminoAplicado, usuarioId }),
        [pagina, tamanio, tipo, estado, desde, hasta, terminoAplicado, usuarioId]
    );

    useEffect(() => {
        // Con el rango invertido no se le pregunta nada al backend (respondería 400): se avisa en pantalla.
        if (rangoInvalido) return;
        let cancelado = false;
        listarTransacciones(consulta)
            .then((datos) => {
                if (cancelado) return;
                setResultado({ consulta, datos, error: '' });
                if (datos.contenido.length === 0 && consulta.pagina > 0) {
                    setPagina(Math.max(0, datos.totalPaginas - 1));
                }
            })
            .catch((error) => {
                if (cancelado) return;
                setResultado((previo) => ({
                    consulta,
                    datos: previo?.datos ?? null,
                    error: error.response?.data?.error || 'No se pudieron cargar las transacciones. Probá de nuevo en un momento.',
                }));
            });
        return () => { cancelado = true; };
    }, [consulta, rangoInvalido]);

    const datos = resultado?.datos ?? null;
    const cargando = !rangoInvalido && resultado?.consulta !== consulta;
    const error = cargando || rangoInvalido ? '' : (resultado?.error ?? '');
    const filas = datos?.contenido ?? [];

    function cambiar(setter) {
        return (valor) => {
            setter(valor);
            setPagina(0);
        };
    }

    function limpiarFiltros() {
        setBusqueda('');
        setTerminoAplicado('');
        setTipo('');
        setEstado('');
        setDesde('');
        setHasta('');
        setPagina(0);
        onCambiarUsuarioFiltro(null);
    }

    function filtrarPorUsuario(usuario) {
        setPagina(0);
        onCambiarUsuarioFiltro({ id: usuario.id, etiqueta: usuario.nombreCompleto });
    }

    function irAPagina(nueva) {
        setPagina(nueva);
        contenedorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return (
        <div className="admin-seccion" ref={contenedorRef}>
            {usuarioFiltro && (
                <div className="admin-tx-usuario-filtro">
                    <span>Mostrando solo las transacciones de <strong>{usuarioFiltro.etiqueta}</strong></span>
                    <button onClick={() => { setPagina(0); onCambiarUsuarioFiltro(null); }}>
                        <IconX size={13} /> Ver todas
                    </button>
                </div>
            )}

            <div className="admin-buscador">
                <IconSearch className="admin-buscador-icon" size={16} />
                <input
                    type="text"
                    placeholder="Buscar por nombre, email o username de cualquiera de las partes..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    maxLength={100}
                />
            </div>

            <div className="admin-filtros">
                <select value={tipo} onChange={(e) => cambiar(setTipo)(e.target.value)} aria-label="Filtrar por tipo">
                    <option value="">Todos los tipos</option>
                    {TIPOS.map((t) => <option key={t.codigo} value={t.codigo}>{t.etiqueta}</option>)}
                </select>
                <select value={estado} onChange={(e) => cambiar(setEstado)(e.target.value)} aria-label="Filtrar por estado">
                    <option value="">Cualquier estado</option>
                    {ESTADOS.map((e) => <option key={e.codigo} value={e.codigo}>{e.etiqueta}</option>)}
                </select>
                <label className="admin-tx-fecha">
                    Desde
                    <input type="date" value={desde} max={hasta || hoyISO} onChange={(e) => cambiar(setDesde)(e.target.value)} />
                </label>
                <label className="admin-tx-fecha">
                    Hasta
                    <input type="date" value={hasta} min={desde || undefined} max={hoyISO} onChange={(e) => cambiar(setHasta)(e.target.value)} />
                </label>
                {hayFiltros && (
                    <button className="admin-filtros-limpiar" onClick={limpiarFiltros}>
                        <IconX size={13} /> Limpiar
                    </button>
                )}
                {datos && !rangoInvalido && (
                    <span className="admin-filtros-conteo">
                        {datos.totalAproximado ? 'Más de ' : ''}{datos.totalElementos.toLocaleString('es-AR')} {datos.totalElementos === 1 ? 'transacción' : 'transacciones'}
                    </span>
                )}
                <AdminExportar
                    tipo="transacciones"
                    exportar={() => exportarTransacciones({ tipo, estado, desde, hasta, termino: terminoAplicado, usuarioId })}
                    deshabilitado={rangoInvalido || cargando || !datos || datos.totalElementos === 0}
                    sugerencia="Acotá por fecha, tipo, estado o usuario para exportar el resto."
                />
            </div>

            {datos?.totalAproximado && !rangoInvalido && (
                <p className="admin-tx-aviso-tope">
                    Hay más de {datos.totalElementos.toLocaleString('es-AR')} transacciones con estos filtros: se pueden recorrer las más recientes.
                    Acotá por fecha, tipo, estado o usuario para ver las anteriores.
                </p>
            )}

            {rangoInvalido && <div className="admin-mensaje error">La fecha "Desde" no puede ser posterior a "Hasta".</div>}
            {error && <div className="admin-mensaje error">{error}</div>}

            {!rangoInvalido && !datos && cargando && (
                <div className="admin-skeleton-lista">
                    {Array.from({ length: 8 }, (_, i) => <div key={i} className="admin-skeleton-fila" />)}
                </div>
            )}

            {!rangoInvalido && datos && filas.length === 0 && (
                <p className="admin-vacio">
                    {hayFiltros ? 'No se encontraron transacciones con esos filtros' : 'Todavía no hay transacciones registradas'}
                </p>
            )}

            {!rangoInvalido && filas.length > 0 && (
                <div className={`admin-lista ${cargando ? 'cargando' : ''}`}>
                    {/* Tabla (desktop) */}
                    <div className="admin-tabla-wrapper">
                        <table className="admin-tabla">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Usuario</th>
                                    <th>Detalle</th>
                                    <th>Monto</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((t) => (
                                    <tr key={`${t.tipo}-${t.id}`}>
                                        <td className="admin-fecha">{formatFecha(t.fecha)}</td>
                                        <td><BadgeTipo tipo={t.tipo} /></td>
                                        <td><CeldaUsuario transaccion={t} onFiltrarUsuario={filtrarPorUsuario} onVerFicha={onVerFicha} /></td>
                                        <td className="admin-tx-detalle">{t.detalle || '—'}</td>
                                        <td className="admin-tx-monto">{textoMonto(t)}</td>
                                        <td><BadgeEstado estado={t.estado} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Cards (mobile) */}
                    <div className="admin-cards-mobile">
                        {filas.map((t) => (
                            <div key={`${t.tipo}-${t.id}`} className="admin-card-usuario">
                                <div className="admin-tx-card-cabecera">
                                    <BadgeTipo tipo={t.tipo} />
                                    <BadgeEstado estado={t.estado} />
                                </div>
                                <p className="admin-tx-card-monto">{textoMonto(t)}</p>
                                <CeldaUsuario transaccion={t} onFiltrarUsuario={filtrarPorUsuario} onVerFicha={onVerFicha} />
                                {t.detalle && <p className="admin-tx-card-detalle">{t.detalle}</p>}
                                <p className="admin-tx-card-fecha">{formatFecha(t.fecha)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!rangoInvalido && datos && (
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
                    totalAproximado={datos.totalAproximado}
                />
            )}
        </div>
    );
}

export default AdminTransacciones;
