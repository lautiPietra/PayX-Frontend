import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarUsuarios, cambiarRol, darDeBaja, reactivarUsuario, obtenerLogs, obtenerAlertas, revisarAlertas, exportarUsuarios, exportarAuditoria, exportarAlertas } from '../services/adminService';
import { esAdmin } from '../services/authService';
import Navbar from '../components/Navbar';
import AdminAvatar from '../components/AdminAvatar';
import AdminExportar from '../components/AdminExportar';
import AdminPaginacion from '../components/AdminPaginacion';
import AdminMetricas from '../components/AdminMetricas';
import AdminTransacciones from '../components/AdminTransacciones';
import AdminAlertas from '../components/AdminAlertas';
import AdminFicha from '../components/AdminFicha';
import AdminConfiguracion from '../components/AdminConfiguracion';
import { IconUsers, IconFileText, IconBell, IconSearch, IconRefreshCw, IconUserX, IconCheck, IconAlertTriangle, IconX, IconBarChart, IconTrendingUp, IconSettings } from '../components/icons/Icons';
import './AdminPanel.css';

const TAMANIOS_PAGINA = [10, 20, 50, 100];
const TAMANIO_LOGS = 20;
const DEMORA_BUSQUEDA_MS = 350;

function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function AdminPanel() {
    const navigate = useNavigate();
    const admin = esAdmin();

    const [tabActiva, setTabActiva] = useState('metricas');

    // ----- Usuarios: todo (busqueda, filtros, orden, pagina) se resuelve en el backend -----
    const [busqueda, setBusqueda] = useState('');
    const [terminoAplicado, setTerminoAplicado] = useState('');
    const [filtroRol, setFiltroRol] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [orden, setOrden] = useState('recientes');
    const [tamanio, setTamanio] = useState(20);
    const [pagina, setPagina] = useState(0);
    const [resultadoUsuarios, setResultadoUsuarios] = useState(null); // { consulta, datos, error }

    // ----- Auditoria -----
    const [paginaLogs, setPaginaLogs] = useState(0);
    const [resultadoLogs, setResultadoLogs] = useState(null);

    // ----- Alertas: se piden desde aca (no desde su pestaña) para poder mostrar el contador en la pestaña -----
    const [horasAlertas, setHorasAlertas] = useState(24);
    const [recargaAlertas, setRecargaAlertas] = useState(0);
    const [resultadoAlertas, setResultadoAlertas] = useState(null); // { consulta, datos, error }

    // ----- Monitor de transacciones: el filtro por usuario vive aca para poder llegar desde una alerta -----
    const [usuarioFiltroTransacciones, setUsuarioFiltroTransacciones] = useState(null); // { id, etiqueta } | null

    // ----- Ficha de usuario: el panel lateral se abre desde la lista, una alerta o el monitor -----
    const [fichaUsuarioId, setFichaUsuarioId] = useState(null);

    // Se incrementa para volver a pedir la pagina actual despues de una accion (baja,
    // cambio de rol...) sin perder en que pagina/filtros estaba el admin.
    const [recarga, setRecarga] = useState(0);
    const [accionEnCurso, setAccionEnCurso] = useState(null);
    const [modalBaja, setModalBaja] = useState(null);
    const [mensaje, setMensaje] = useState(null);
    const tablaRef = useRef(null);

    useEffect(() => {
        if (!admin) navigate('/inicio');
    }, [admin, navigate]);

    // Debounce de la busqueda: no se le pega al backend en cada tecla, solo cuando el
    // admin deja de escribir, y una busqueda nueva vuelve a la primera pagina.
    useEffect(() => {
        const id = setTimeout(() => {
            setTerminoAplicado(busqueda.trim());
            setPagina(0);
        }, DEMORA_BUSQUEDA_MS);
        return () => clearTimeout(id);
    }, [busqueda]);

    // La "consulta" identifica exactamente que se pidio. El resultado guarda la consulta
    // que lo produjo: mientras no coincida con la actual, sabemos que se esta cargando
    // (sin tener que prender un flag de "cargando" dentro del efecto).
    const consultaUsuarios = useMemo(
        () => ({ pagina, tamanio, termino: terminoAplicado, rol: filtroRol, estado: filtroEstado, orden, recarga }),
        [pagina, tamanio, terminoAplicado, filtroRol, filtroEstado, orden, recarga]
    );
    const consultaLogs = useMemo(() => ({ pagina: paginaLogs, tamanio: TAMANIO_LOGS, recarga }), [paginaLogs, recarga]);
    const consultaAlertas = useMemo(
        () => ({ horas: horasAlertas, recarga, recargaAlertas }),
        [horasAlertas, recarga, recargaAlertas]
    );

    useEffect(() => {
        if (!admin) return;
        let cancelado = false;
        obtenerAlertas(consultaAlertas.horas)
            .then((datos) => { if (!cancelado) setResultadoAlertas({ consulta: consultaAlertas, datos, error: '' }); })
            .catch((error) => {
                if (cancelado) return;
                setResultadoAlertas((previo) => ({
                    consulta: consultaAlertas,
                    datos: previo?.datos ?? null,
                    error: error.response?.data?.error || 'No se pudieron cargar las alertas. Probá de nuevo en un momento.',
                }));
            });
        return () => { cancelado = true; };
    }, [admin, consultaAlertas]);

    useEffect(() => {
        if (!admin) return;
        // Si el admin cambia filtros/pagina rapido, las respuestas pueden volver
        // desordenadas: se ignora la de cualquier consulta que ya no es la actual.
        let cancelado = false;
        listarUsuarios(consultaUsuarios)
            .then((datos) => {
                if (cancelado) return;
                setResultadoUsuarios({ consulta: consultaUsuarios, datos, error: '' });
                // Se pidio una pagina que ya no existe (ej. se dio de baja al ultimo usuario de
                // la ultima pagina con un filtro por estado): se vuelve a la ultima que si.
                if (datos.contenido.length === 0 && consultaUsuarios.pagina > 0) {
                    setPagina(Math.max(0, datos.totalPaginas - 1));
                }
            })
            .catch((error) => {
                if (cancelado) return;
                setResultadoUsuarios((previo) => ({
                    consulta: consultaUsuarios,
                    datos: previo?.datos ?? null,
                    error: error.response?.data?.error || 'No se pudieron cargar los usuarios. Probá de nuevo en un momento.',
                }));
            });
        return () => { cancelado = true; };
    }, [admin, consultaUsuarios]);

    useEffect(() => {
        if (!admin || tabActiva !== 'auditoria') return;
        let cancelado = false;
        obtenerLogs(consultaLogs)
            .then((datos) => {
                if (cancelado) return;
                setResultadoLogs({ consulta: consultaLogs, datos, error: '' });
                if (datos.contenido.length === 0 && consultaLogs.pagina > 0) {
                    setPaginaLogs(Math.max(0, datos.totalPaginas - 1));
                }
            })
            .catch((error) => {
                if (cancelado) return;
                setResultadoLogs((previo) => ({
                    consulta: consultaLogs,
                    datos: previo?.datos ?? null,
                    error: error.response?.data?.error || 'No se pudo cargar la auditoría. Probá de nuevo en un momento.',
                }));
            });
        return () => { cancelado = true; };
    }, [admin, tabActiva, consultaLogs]);

    const datosUsuarios = resultadoUsuarios?.datos ?? null;
    const cargandoUsuarios = resultadoUsuarios?.consulta !== consultaUsuarios;
    const errorUsuarios = cargandoUsuarios ? '' : (resultadoUsuarios?.error ?? '');
    const usuarios = datosUsuarios?.contenido ?? [];

    const datosLogs = resultadoLogs?.datos ?? null;
    const cargandoLogs = resultadoLogs?.consulta !== consultaLogs;
    const errorLogs = cargandoLogs ? '' : (resultadoLogs?.error ?? '');
    const logs = datosLogs?.contenido ?? [];

    const datosAlertas = resultadoAlertas?.datos ?? null;
    const cargandoAlertas = resultadoAlertas?.consulta !== consultaAlertas;
    const errorAlertas = cargandoAlertas ? '' : (resultadoAlertas?.error ?? '');
    const totalAlertas = datosAlertas ? datosAlertas.resumen.alta + datosAlertas.resumen.media + datosAlertas.resumen.baja : 0;

    const hayFiltros = Boolean(busqueda || filtroRol || filtroEstado || orden !== 'recientes');

    function cambiarFiltroRol(valor) {
        setFiltroRol(valor);
        setPagina(0);
    }

    function cambiarFiltroEstado(valor) {
        setFiltroEstado(valor);
        setPagina(0);
    }

    function cambiarOrden(valor) {
        setOrden(valor);
        setPagina(0);
    }

    function cambiarTamanio(valor) {
        setTamanio(valor);
        setPagina(0);
    }

    function limpiarFiltros() {
        setBusqueda('');
        setTerminoAplicado('');
        setFiltroRol('');
        setFiltroEstado('');
        setOrden('recientes');
        setPagina(0);
    }

    // Marca alertas pendientes como leidas o analizadas con la ventana que se esta mirando. La lista de pendientes
    // se recarga siempre (tambien si fallo: pudo haber cambiado por otro lado, ej. otro admin la marco antes).
    async function revisarAlertasDelPanel(ids, estado, nota) {
        try {
            return await revisarAlertas({ horas: horasAlertas, ids, estado, nota });
        } finally {
            setRecargaAlertas((n) => n + 1);
        }
    }

    // Desde una alerta: saltar al monitor ya filtrado por ese usuario.
    function verMovimientosDe(usuario) {
        setUsuarioFiltroTransacciones({ id: usuario.id, etiqueta: usuario.nombreCompleto });
        setTabActiva('transacciones');
    }

    // Abrir la ficha de un usuario (desde la lista, una alerta o el monitor de transacciones).
    function verFicha(usuario) {
        setFichaUsuarioId(usuario.id);
    }

    // Con hasta 100 filas por pagina, el paginador queda abajo de todo: al cambiar
    // de pagina se vuelve al principio de la lista.
    function irAPagina(nueva) {
        setPagina(nueva);
        tablaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const ejecutarAccion = async (usuarioId, accion, textoExito, textoError) => {
        setMensaje(null);
        setAccionEnCurso(usuarioId);
        try {
            await accion();
            setMensaje({ tipo: 'exito', texto: textoExito });
            setRecarga((n) => n + 1);
        } catch (error) {
            setMensaje({ tipo: 'error', texto: error.response?.data?.error || textoError });
        } finally {
            setAccionEnCurso(null);
        }
    };

    const handleCambiarRol = (usuarioId, nuevoRol) =>
        ejecutarAccion(usuarioId, () => cambiarRol(usuarioId, nuevoRol), 'Rol actualizado correctamente', 'Error al cambiar rol');

    const handleDarDeBaja = async (usuarioId) => {
        await ejecutarAccion(usuarioId, () => darDeBaja(usuarioId), 'Usuario dado de baja correctamente', 'Error al dar de baja');
        setModalBaja(null);
    };

    const handleReactivar = (usuarioId) =>
        ejecutarAccion(usuarioId, () => reactivarUsuario(usuarioId), 'Usuario reactivado correctamente', 'Error al reactivar');

    if (!admin) return null;

    const selectorRol = (u) => (
        <select
            value={u.rol}
            onChange={(e) => handleCambiarRol(u.id, e.target.value)}
            disabled={accionEnCurso === u.id}
            className={`admin-select-rol ${u.rol.toLowerCase()}`}
        >
            <option value="USUARIO">Usuario</option>
            <option value="ADMIN">Admin</option>
            <option value="SOPORTE">Soporte</option>
        </select>
    );

    const botonEstado = (u) => (u.activo ? (
        <button className="admin-btn-baja" onClick={() => setModalBaja(u)} disabled={accionEnCurso === u.id}>
            Dar de baja
        </button>
    ) : (
        <button className="admin-btn-reactivar" onClick={() => handleReactivar(u.id)} disabled={accionEnCurso === u.id}>
            Reactivar
        </button>
    ));

    return (
        <>
            <Navbar />
            <div className="admin-container">

                <h1 className="admin-titulo">Panel de Administracion</h1>
                <p className="admin-subtitulo">Gestiona usuarios, roles y permisos del sistema</p>

                {mensaje && (
                    <div className={`admin-mensaje ${mensaje.tipo}`}>
                        {mensaje.texto}
                        <button className="admin-mensaje-cerrar" onClick={() => setMensaje(null)}>×</button>
                    </div>
                )}

                {/* Tabs */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${tabActiva === 'metricas' ? 'activo' : ''}`}
                        onClick={() => setTabActiva('metricas')}
                    >
                        <IconBarChart size={16} /> Métricas
                    </button>
                    <button
                        className={`admin-tab ${tabActiva === 'usuarios' ? 'activo' : ''}`}
                        onClick={() => setTabActiva('usuarios')}
                    >
                        <IconUsers size={16} /> Usuarios
                    </button>
                    <button
                        className={`admin-tab ${tabActiva === 'transacciones' ? 'activo' : ''}`}
                        onClick={() => setTabActiva('transacciones')}
                    >
                        <IconTrendingUp size={16} /> Transacciones
                    </button>
                    <button
                        className={`admin-tab ${tabActiva === 'alertas' ? 'activo' : ''}`}
                        onClick={() => setTabActiva('alertas')}
                    >
                        <IconAlertTriangle size={16} /> Alertas
                        {totalAlertas > 0 && (
                            <span className={`admin-tab-contador ${datosAlertas.resumen.alta > 0 ? 'alta' : 'media'}`}>{totalAlertas}</span>
                        )}
                    </button>
                    <button
                        className={`admin-tab ${tabActiva === 'auditoria' ? 'activo' : ''}`}
                        onClick={() => setTabActiva('auditoria')}
                    >
                        <IconFileText size={16} /> Auditoria
                    </button>
                    <button
                        className={`admin-tab ${tabActiva === 'configuracion' ? 'activo' : ''}`}
                        onClick={() => setTabActiva('configuracion')}
                    >
                        <IconSettings size={16} /> Configuración
                    </button>
                    <button
                        className={`admin-tab ${tabActiva === 'plantillas' ? 'activo' : ''}`}
                        onClick={() => navigate('/admin/plantillas')}
                    >
                        <IconBell size={16} /> Plantillas de Notificación
                    </button>
                </div>

                {/* Tab de Configuracion */}
                {tabActiva === 'configuracion' && <AdminConfiguracion />}

                {/* Tab de Metricas */}
                {tabActiva === 'metricas' && <AdminMetricas />}

                {/* Tab de Transacciones */}
                {tabActiva === 'transacciones' && (
                    <AdminTransacciones
                        usuarioFiltro={usuarioFiltroTransacciones}
                        onCambiarUsuarioFiltro={setUsuarioFiltroTransacciones}
                        onVerFicha={verFicha}
                    />
                )}

                {/* Tab de Alertas */}
                {tabActiva === 'alertas' && (
                    <AdminAlertas
                        resultado={{ datos: datosAlertas, cargando: cargandoAlertas, error: errorAlertas }}
                        horas={horasAlertas}
                        onCambiarHoras={setHorasAlertas}
                        onActualizar={() => setRecargaAlertas((n) => n + 1)}
                        onExportar={() => exportarAlertas(horasAlertas)}
                        onVerMovimientos={verMovimientosDe}
                        onVerUsuario={verFicha}
                        onDarDeBaja={setModalBaja}
                        onRevisar={revisarAlertasDelPanel}
                        onCambioHistorial={() => setRecargaAlertas((n) => n + 1)}
                    />
                )}

                {/* Tab de Usuarios */}
                {tabActiva === 'usuarios' && (
                    <div className="admin-seccion" ref={tablaRef}>

                        {/* Buscador y filtros */}
                        <div className="admin-buscador">
                            <IconSearch className="admin-buscador-icon" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, email o username..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                maxLength={100}
                            />
                        </div>

                        <div className="admin-filtros">
                            <select value={filtroRol} onChange={(e) => cambiarFiltroRol(e.target.value)} aria-label="Filtrar por rol">
                                <option value="">Todos los roles</option>
                                <option value="USUARIO">Usuario</option>
                                <option value="ADMIN">Admin</option>
                                <option value="SOPORTE">Soporte</option>
                            </select>
                            <select value={filtroEstado} onChange={(e) => cambiarFiltroEstado(e.target.value)} aria-label="Filtrar por estado">
                                <option value="">Cualquier estado</option>
                                <option value="ACTIVO">Activos</option>
                                <option value="INACTIVO">Inactivos</option>
                            </select>
                            <select value={orden} onChange={(e) => cambiarOrden(e.target.value)} aria-label="Ordenar">
                                <option value="recientes">Más recientes primero</option>
                                <option value="antiguos">Más antiguos primero</option>
                                <option value="nombre">Nombre (A-Z)</option>
                            </select>
                            {hayFiltros && (
                                <button className="admin-filtros-limpiar" onClick={limpiarFiltros}>
                                    <IconX size={13} /> Limpiar
                                </button>
                            )}
                            {datosUsuarios && (
                                <span className="admin-filtros-conteo">
                                    {datosUsuarios.totalElementos.toLocaleString('es-AR')} {datosUsuarios.totalElementos === 1 ? 'usuario' : 'usuarios'}
                                </span>
                            )}
                            <AdminExportar
                                tipo="usuarios"
                                exportar={() => exportarUsuarios({ termino: terminoAplicado, rol: filtroRol, estado: filtroEstado, orden })}
                                deshabilitado={cargandoUsuarios || !datosUsuarios || datosUsuarios.totalElementos === 0}
                                sugerencia="Acotá por rol o estado, o buscá por nombre, para exportar el resto."
                            />
                        </div>

                        {errorUsuarios && <div className="admin-mensaje error">{errorUsuarios}</div>}

                        {!datosUsuarios && cargandoUsuarios && <div className="admin-skeleton-lista">
                            {Array.from({ length: 8 }, (_, i) => <div key={i} className="admin-skeleton-fila" />)}
                        </div>}

                        {datosUsuarios && usuarios.length === 0 && (
                            <p className="admin-vacio">
                                {hayFiltros ? 'No se encontraron usuarios con esos filtros' : 'Todavía no hay usuarios registrados'}
                            </p>
                        )}

                        {usuarios.length > 0 && (
                            <div className={`admin-lista ${cargandoUsuarios ? 'cargando' : ''}`}>
                                {/* Tabla de usuarios (desktop) */}
                                <div className="admin-tabla-wrapper">
                                    <table className="admin-tabla">
                                        <thead>
                                            <tr>
                                                <th>Usuario</th>
                                                <th>Email</th>
                                                <th>Rol</th>
                                                <th>Estado</th>
                                                <th>Registro</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usuarios.map((u) => (
                                                <tr key={u.id} className={!u.activo ? 'fila-inactiva' : ''}>
                                                    <td>
                                                        <div className="admin-usuario-info">
                                                            <AdminAvatar key={u.fotoPerfilUrl || 'sin-foto'} usuario={u} />
                                                            <div>
                                                                <p className="admin-nombre"><button className="admin-nombre-enlace" onClick={() => verFicha(u)} title="Ver la ficha de este usuario">{u.nombreCompleto}</button></p>
                                                                <p className="admin-username">@{u.nombreUsuario}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="admin-email">{u.email}</td>
                                                    <td>{selectorRol(u)}</td>
                                                    <td>
                                                        <span className={`admin-badge ${u.activo ? 'activo' : 'inactivo'}`}>
                                                            {u.activo ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </td>
                                                    <td className="admin-fecha">{formatFecha(u.fechaRegistro)}</td>
                                                    <td>
                                                        <div className="admin-acciones-fila">
                                                            <button className="admin-btn-ficha" onClick={() => verFicha(u)}>Ver ficha</button>
                                                            {botonEstado(u)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Cards de usuarios (mobile) */}
                                <div className="admin-cards-mobile">
                                    {usuarios.map((u) => (
                                        <div key={u.id} className={`admin-card-usuario ${!u.activo ? 'inactivo' : ''}`}>
                                            <div className="admin-card-header-usuario">
                                                <AdminAvatar key={u.fotoPerfilUrl || 'sin-foto'} usuario={u} />
                                                <div className="admin-card-info">
                                                    <p className="admin-nombre"><button className="admin-nombre-enlace" onClick={() => verFicha(u)} title="Ver la ficha de este usuario">{u.nombreCompleto}</button></p>
                                                    <p className="admin-username">@{u.nombreUsuario}</p>
                                                    <p className="admin-email">{u.email}</p>
                                                </div>
                                                <span className={`admin-badge ${u.activo ? 'activo' : 'inactivo'}`}>
                                                    {u.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                            <div className="admin-card-acciones">
                                                {selectorRol(u)}
                                                <button className="admin-btn-ficha" onClick={() => verFicha(u)}>Ver ficha</button>
                                                {botonEstado(u)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {datosUsuarios && (
                            <AdminPaginacion
                                pagina={datosUsuarios.pagina}
                                totalPaginas={datosUsuarios.totalPaginas}
                                totalElementos={datosUsuarios.totalElementos}
                                tamanio={datosUsuarios.tamanio}
                                cantidadEnPagina={usuarios.length}
                                onCambiarPagina={irAPagina}
                                tamanios={TAMANIOS_PAGINA}
                                onCambiarTamanio={cambiarTamanio}
                                deshabilitado={cargandoUsuarios}
                            />
                        )}

                    </div>
                )}

                {/* Tab de Auditoria */}
                {tabActiva === 'auditoria' && (
                    <div className="admin-seccion">
                        <div className="admin-filtros">
                            {datosLogs && (
                                <span className="admin-filtros-conteo">
                                    {datosLogs.totalElementos.toLocaleString('es-AR')} {datosLogs.totalElementos === 1 ? 'registro' : 'registros'}
                                </span>
                            )}
                            <AdminExportar
                                tipo="auditoria"
                                exportar={exportarAuditoria}
                                deshabilitado={cargandoLogs || !datosLogs || datosLogs.totalElementos === 0}
                            />
                        </div>

                        {errorLogs && <div className="admin-mensaje error">{errorLogs}</div>}

                        {!datosLogs && cargandoLogs && <div className="admin-skeleton-lista">
                            {Array.from({ length: 6 }, (_, i) => <div key={i} className="admin-skeleton-fila alto" />)}
                        </div>}

                        {datosLogs && logs.length === 0 && (
                            <p className="admin-vacio">No hay registros de auditoria todavia</p>
                        )}

                        {logs.length > 0 && (
                            <div className={`admin-logs ${cargandoLogs ? 'cargando' : ''}`}>
                                {logs.map((log) => (
                                    <div key={log.id} className="admin-log-item">
                                        <div className="admin-log-icono">
                                            {log.accion === 'CAMBIO_ROL' ? <IconRefreshCw size={17} /> :
                                             log.accion === 'BAJA_LOGICA' ? <IconUserX size={17} /> : <IconCheck size={17} />}
                                        </div>
                                        <div className="admin-log-contenido">
                                            <p className="admin-log-accion">
                                                <strong>{log.accion.replace('_', ' ')}</strong>
                                            </p>
                                            <p className="admin-log-detalle">{log.detalle}</p>
                                            <p className="admin-log-meta">
                                                Usuario: <strong>{log.usuarioAfectadoEmail}</strong> · Admin: {log.adminEmail} · {formatFecha(log.fecha)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {datosLogs && (
                            <AdminPaginacion
                                pagina={datosLogs.pagina}
                                totalPaginas={datosLogs.totalPaginas}
                                totalElementos={datosLogs.totalElementos}
                                tamanio={datosLogs.tamanio}
                                cantidadEnPagina={logs.length}
                                onCambiarPagina={setPaginaLogs}
                                deshabilitado={cargandoLogs}
                            />
                        )}
                    </div>
                )}

            </div>

            {/* Ficha de usuario (panel lateral) */}
            {fichaUsuarioId && (
                <AdminFicha
                    key={fichaUsuarioId}
                    usuarioId={fichaUsuarioId}
                    onCerrar={() => setFichaUsuarioId(null)}
                    onCambio={() => setRecarga((n) => n + 1)}
                    onVerMovimientos={(usuario) => {
                        setFichaUsuarioId(null);
                        verMovimientosDe(usuario);
                    }}
                />
            )}

            {/* Modal de confirmacion de baja */}
            {modalBaja && (
                <div className="admin-modal-overlay" onClick={() => setModalBaja(null)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-icono"><IconAlertTriangle size={26} /></div>
                        <h2 className="admin-modal-titulo">Confirmar baja de usuario</h2>
                        <p className="admin-modal-texto">
                            ¿Estas seguro de dar de baja a <strong>{modalBaja.nombreCompleto}</strong> ({modalBaja.email})?
                        </p>
                        <p className="admin-modal-warning">
                            El usuario no podra iniciar sesion. Esta accion se puede revertir.
                        </p>
                        <div className="admin-modal-botones">
                            <button className="admin-modal-cancelar" onClick={() => setModalBaja(null)}>
                                Cancelar
                            </button>
                            <button
                                className="admin-modal-confirmar"
                                onClick={() => handleDarDeBaja(modalBaja.id)}
                                disabled={accionEnCurso === modalBaja.id}
                            >
                                Si, dar de baja
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default AdminPanel;
