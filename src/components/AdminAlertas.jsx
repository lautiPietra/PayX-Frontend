import AdminAvatar from './AdminAvatar';
import AdminAlertaItem from './AdminAlertaItem';
import AdminExportar from './AdminExportar';
import { IconRefreshCw, IconCheck } from './icons/Icons';
import './AdminAlertas.css';

const HORAS = [
    { horas: 24, label: '24 horas' },
    { horas: 72, label: '3 días' },
    { horas: 168, label: '7 días' },
];

// Alertas de actividad sospechosa. Es presentacional: el panel se ocupa de pedirlas (asi puede
// mostrar el contador en la pestaña sin abrirla) y de las acciones que cruzan con otras pestañas.
function AdminAlertas({ resultado, horas, onCambiarHoras, onActualizar, onExportar, onVerMovimientos, onVerUsuario, onDarDeBaja }) {
    const { datos, cargando, error } = resultado;
    const alertas = datos?.alertas ?? [];
    const ahoraMs = datos ? new Date(datos.desde).getTime() + datos.horas * 3600 * 1000 : 0;

    return (
        <div className="admin-seccion">
            <div className="admin-alertas-cabecera">
                <div className="admin-chips" role="tablist" aria-label="Ventana de tiempo">
                    {HORAS.map((h) => (
                        <button
                            key={h.horas}
                            role="tab"
                            aria-selected={horas === h.horas}
                            className={`admin-chip ${horas === h.horas ? 'activo' : ''}`}
                            onClick={() => onCambiarHoras(h.horas)}
                        >
                            {h.label}
                        </button>
                    ))}
                </div>

                {datos && (
                    <div className="admin-alertas-resumen">
                        <span className="admin-alertas-conteo alta">{datos.resumen.alta} {datos.resumen.alta === 1 ? "alta" : "altas"}</span>
                        <span className="admin-alertas-conteo media">{datos.resumen.media} {datos.resumen.media === 1 ? "media" : "medias"}</span>
                        {datos.resumen.baja > 0 && <span className="admin-alertas-conteo baja">{datos.resumen.baja} {datos.resumen.baja === 1 ? "baja" : "bajas"}</span>}
                    </div>
                )}

                <button className="admin-alertas-actualizar" onClick={onActualizar} disabled={cargando}>
                    <IconRefreshCw size={14} /> {cargando ? 'Actualizando...' : 'Actualizar'}
                </button>

                <AdminExportar
                    tipo="alertas"
                    exportar={onExportar}
                    deshabilitado={cargando || !datos || alertas.length === 0}
                    sugerencia="Elegí una ventana más corta para exportar el resto."
                />
            </div>

            {error && <div className="admin-mensaje error">{error}</div>}

            {datos && alertas.length < datos.resumen.alta + datos.resumen.media + datos.resumen.baja && (
                <div className="admin-alertas-aviso">
                    Hay {(datos.resumen.alta + datos.resumen.media + datos.resumen.baja).toLocaleString('es-AR')} alertas en total:
                    se muestran las {alertas.length} más graves y recientes. Elegí una ventana más corta para ver el resto.
                </div>
            )}

            {datos?.truncado && (
                <div className="admin-alertas-aviso">
                    Hubo tanta actividad en este período que solo se analizaron las transacciones más recientes.
                    Elegí una ventana más corta para no dejar nada afuera.
                </div>
            )}

            {!datos && cargando && (
                <div className="admin-skeleton-lista">
                    {Array.from({ length: 3 }, (_, i) => <div key={i} className="admin-skeleton-fila alto" />)}
                </div>
            )}

            {datos && alertas.length === 0 && (
                <div className="admin-alertas-vacio">
                    <span className="admin-alertas-vacio-icono"><IconCheck size={26} /></span>
                    <p>Todo tranquilo</p>
                    <p className="admin-alertas-vacio-sub">No se detectó actividad sospechosa en las últimas {datos.horas} horas.</p>
                </div>
            )}

            {alertas.length > 0 && (
                <div className={`admin-alertas-lista ${cargando ? 'cargando' : ''}`}>
                    {alertas.map((a) => (
                        <AdminAlertaItem key={a.id} alerta={a} ahoraMs={ahoraMs}>
                            {a.usuario && (
                                <div className="admin-alerta-usuario">
                                    <AdminAvatar key={a.usuario.fotoPerfilUrl || 'sin-foto'} usuario={a.usuario} />
                                    <div>
                                        <p className="admin-alerta-usuario-nombre">
                                            {a.usuario.nombreCompleto}
                                            {!a.usuario.activo && <span className="admin-badge inactivo">Inactivo</span>}
                                        </p>
                                        <p className="admin-alerta-usuario-email">{a.usuario.email}</p>
                                    </div>
                                </div>
                            )}

                            {a.usuario && (
                                <div className="admin-alerta-acciones">
                                    <button onClick={() => onVerMovimientos(a.usuario)}>Ver movimientos</button>
                                    <button onClick={() => onVerUsuario(a.usuario)}>Ver ficha</button>
                                    {a.usuario.activo && (
                                        <button className="peligro" onClick={() => onDarDeBaja(a.usuario)}>Dar de baja</button>
                                    )}
                                </div>
                            )}
                        </AdminAlertaItem>
                    ))}
                </div>
            )}

            {datos && datos.reglas.length > 0 && (
                <details className="admin-alertas-reglas">
                    <summary>Qué se vigila</summary>
                    <ul>
                        {datos.reglas.map((regla) => <li key={regla}>{regla}</li>)}
                    </ul>
                    <p>
                        Las alertas se calculan en el momento con la actividad de la ventana elegida: desaparecen solas
                        cuando el hecho queda afuera de esa ventana.
                    </p>
                </details>
            )}
        </div>
    );
}

export default AdminAlertas;
