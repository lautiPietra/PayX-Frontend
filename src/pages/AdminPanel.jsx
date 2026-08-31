import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarUsuarios, buscarUsuarios, cambiarRol, darDeBaja, reactivarUsuario, obtenerLogs } from '../services/adminService';
import { esAdmin } from '../services/authService';
import Navbar from '../components/Navbar';
import './AdminPanel.css';

function AdminPanel() {
    const navigate = useNavigate();

    const [usuarios, setUsuarios] = useState([]);
    const [logs, setLogs] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [tabActiva, setTabActiva] = useState('usuarios');

    // Modal de confirmacion para baja
    const [modalBaja, setModalBaja] = useState(null);

    // Mensajes
    const [mensaje, setMensaje] = useState(null);

    useEffect(() => {
        if (!esAdmin()) {
            navigate('/perfil');
            return;
        }
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [usuariosData, logsData] = await Promise.all([
                listarUsuarios(),
                obtenerLogs()
            ]);
            setUsuarios(usuariosData);
            setLogs(logsData);
        } catch (error) {
            console.error('Error al cargar datos', error);
        } finally {
            setCargando(false);
        }
    };

    const handleBuscar = async (termino) => {
        setBusqueda(termino);
        try {
            if (termino.trim() === '') {
                const data = await listarUsuarios();
                setUsuarios(data);
            } else {
                const data = await buscarUsuarios(termino);
                setUsuarios(data);
            }
        } catch (error) {
            console.error('Error al buscar', error);
        }
    };

    const handleCambiarRol = async (usuarioId, nuevoRol) => {
        setMensaje(null);
        try {
            await cambiarRol(usuarioId, nuevoRol);
            setMensaje({ tipo: 'exito', texto: 'Rol actualizado correctamente' });
            cargarDatos();
        } catch (error) {
            setMensaje({ tipo: 'error', texto: error.response?.data?.error || 'Error al cambiar rol' });
        }
    };

    const handleDarDeBaja = async (usuarioId) => {
        setMensaje(null);
        try {
            await darDeBaja(usuarioId);
            setMensaje({ tipo: 'exito', texto: 'Usuario dado de baja correctamente' });
            setModalBaja(null);
            cargarDatos();
        } catch (error) {
            setMensaje({ tipo: 'error', texto: error.response?.data?.error || 'Error al dar de baja' });
            setModalBaja(null);
        }
    };

    const handleReactivar = async (usuarioId) => {
        setMensaje(null);
        try {
            await reactivarUsuario(usuarioId);
            setMensaje({ tipo: 'exito', texto: 'Usuario reactivado correctamente' });
            cargarDatos();
        } catch (error) {
            setMensaje({ tipo: 'error', texto: error.response?.data?.error || 'Error al reactivar' });
        }
    };

    const formatFecha = (fecha) => {
        return new Date(fecha).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (cargando) {
        return (
            <>
                <Navbar />
                <div className="admin-loading">Cargando panel de administracion...</div>
            </>
        );
    }

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
                        className={`admin-tab ${tabActiva === 'usuarios' ? 'activo' : ''}`}
                        onClick={() => setTabActiva('usuarios')}
                    >
                        👥 Usuarios ({usuarios.length})
                    </button>
                    <button
                        className={`admin-tab ${tabActiva === 'auditoria' ? 'activo' : ''}`}
                        onClick={() => setTabActiva('auditoria')}
                    >
                        📋 Auditoria ({logs.length})
                    </button>
                    <button
                        className={`admin-tab ${tabActiva === 'plantillas' ? 'activo' : ''}`}
                        onClick={() => navigate('/admin/plantillas')}
                    >
                        🔔 Plantillas de Notificación
                    </button>
                </div>

                {/* Tab de Usuarios */}
                {tabActiva === 'usuarios' && (
                    <div className="admin-seccion">

                        {/* Buscador */}
                        <div className="admin-buscador">
                            <span className="admin-buscador-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar por nombre, email o username..."
                                value={busqueda}
                                onChange={(e) => handleBuscar(e.target.value)}
                            />
                        </div>

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
                                                    <div className="admin-avatar">
                                                        {u.nombreCompleto?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="admin-nombre">{u.nombreCompleto}</p>
                                                        <p className="admin-username">@{u.nombreUsuario}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="admin-email">{u.email}</td>
                                            <td>
                                                <select
                                                    value={u.rol}
                                                    onChange={(e) => handleCambiarRol(u.id, e.target.value)}
                                                    className={`admin-select-rol ${u.rol.toLowerCase()}`}
                                                >
                                                    <option value="USUARIO">Usuario</option>
                                                    <option value="ADMIN">Admin</option>
                                                    <option value="SOPORTE">Soporte</option>
                                                </select>
                                            </td>
                                            <td>
                                                <span className={`admin-badge ${u.activo ? 'activo' : 'inactivo'}`}>
                                                    {u.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="admin-fecha">{formatFecha(u.fechaRegistro)}</td>
                                            <td>
                                                {u.activo ? (
                                                    <button
                                                        className="admin-btn-baja"
                                                        onClick={() => setModalBaja(u)}
                                                    >
                                                        Dar de baja
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="admin-btn-reactivar"
                                                        onClick={() => handleReactivar(u.id)}
                                                    >
                                                        Reactivar
                                                    </button>
                                                )}
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
                                        <div className="admin-avatar">{u.nombreCompleto?.charAt(0)?.toUpperCase()}</div>
                                        <div className="admin-card-info">
                                            <p className="admin-nombre">{u.nombreCompleto}</p>
                                            <p className="admin-username">@{u.nombreUsuario}</p>
                                            <p className="admin-email">{u.email}</p>
                                        </div>
                                        <span className={`admin-badge ${u.activo ? 'activo' : 'inactivo'}`}>
                                            {u.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <div className="admin-card-acciones">
                                        <select
                                            value={u.rol}
                                            onChange={(e) => handleCambiarRol(u.id, e.target.value)}
                                            className={`admin-select-rol ${u.rol.toLowerCase()}`}
                                        >
                                            <option value="USUARIO">Usuario</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="SOPORTE">Soporte</option>
                                        </select>
                                        {u.activo ? (
                                            <button className="admin-btn-baja" onClick={() => setModalBaja(u)}>
                                                Dar de baja
                                            </button>
                                        ) : (
                                            <button className="admin-btn-reactivar" onClick={() => handleReactivar(u.id)}>
                                                Reactivar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                )}

                {/* Tab de Auditoria */}
                {tabActiva === 'auditoria' && (
                    <div className="admin-seccion">
                        {logs.length === 0 ? (
                            <p className="admin-vacio">No hay registros de auditoria todavia</p>
                        ) : (
                            <div className="admin-logs">
                                {logs.map((log) => (
                                    <div key={log.id} className="admin-log-item">
                                        <div className="admin-log-icono">
                                            {log.accion === 'CAMBIO_ROL' ? '🔄' :
                                             log.accion === 'BAJA_LOGICA' ? '🚫' : '✅'}
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
                    </div>
                )}

            </div>

            {/* Modal de confirmacion de baja */}
            {modalBaja && (
                <div className="admin-modal-overlay" onClick={() => setModalBaja(null)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-icono">⚠️</div>
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
                            <button className="admin-modal-confirmar" onClick={() => handleDarDeBaja(modalBaja.id)}>
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