import { useState } from 'react';
import AdminAlertaItem from './AdminAlertaItem';
import AdminAlertasHistorial from './AdminAlertasHistorial';
import { BloqueUsuarioAlerta, EditorNota } from './AdminAlertaRevision';
import AdminExportar from './AdminExportar';
import { IconRefreshCw, IconCheck } from './icons/Icons';
import './AdminAlertas.css';

const HORAS = [
    { horas: 24, label: '24 horas' },
    { horas: 72, label: '3 días' },
    { horas: 168, label: '7 días' },
];

const VISTA_PENDIENTES = 'pendientes';
const VISTA_HISTORIAL = 'historial';

function textoAvisoRevisadas({ revisadas, noVigentes }, estado) {
    const que = estado === 'ANALIZADA' ? 'analizada' : 'leída';
    const marcadas = revisadas === 1 ? `1 alerta marcada como ${que}` : `${revisadas} alertas marcadas como ${que}s`;
    if (noVigentes > 0) {
        return `${marcadas}. ${noVigentes === 1 ? '1 ya no estaba vigente' : `${noVigentes} ya no estaban vigentes`} y se actualizó la lista.`;
    }
    return `${marcadas}.`;
}

// Los botones para marcar UNA alerta pendiente: "leída" es un clic; "analizada" abre un campo para dejar una nota
// (opcional) antes de confirmar. Al marcarla, el panel recarga la lista y la alerta pasa al historial.
function AccionesRevision({ alerta, onRevisar }) {
    const [editando, setEditando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    async function marcar(estado, nota) {
        setEnviando(true);
        setError('');
        try {
            const resultado = await onRevisar([alerta.id], estado, nota);
            if (resultado.revisadas === 0) {
                setError('Esta alerta ya no está vigente: se actualizó la lista.');
            }
            setEditando(false);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo marcar la alerta. Probá de nuevo en un momento.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="admin-alerta-revisar">
            {!editando && (
                <div className="admin-alerta-acciones">
                    <button onClick={() => marcar('LEIDA', null)} disabled={enviando}>
                        <IconCheck size={13} /> Marcar como leída
                    </button>
                    <button onClick={() => setEditando(true)} disabled={enviando}>Marcar como analizada</button>
                </div>
            )}
            {editando && (
                <EditorNota
                    etiquetaConfirmar="Marcar como analizada"
                    enviando={enviando}
                    onConfirmar={(nota) => marcar('ANALIZADA', nota)}
                    onCancelar={() => setEditando(false)}
                />
            )}
            {error && <p className="admin-alerta-error" role="alert">{error}</p>}
        </div>
    );
}

// Alertas de actividad sospechosa, en dos vistas: las PENDIENTES (con botones para marcarlas como leídas o
// analizadas) y el HISTORIAL de las ya revisadas. Es presentacional respecto de las pendientes: el panel se ocupa
// de pedirlas (asi puede mostrar el contador en la pestaña sin abrirla) y de las acciones que cruzan con otras
// pestañas. El historial se pide solo (ver AdminAlertasHistorial).
function AdminAlertas({ resultado, horas, onCambiarHoras, onActualizar, onExportar, onVerMovimientos, onVerUsuario, onDarDeBaja, onRevisar, onCambioHistorial }) {
    const { datos, cargando, error } = resultado;
    const alertas = datos?.alertas ?? [];
    const ahoraMs = datos ? new Date(datos.desde).getTime() + datos.horas * 3600 * 1000 : 0;
    const puedeRevisar = Boolean(datos?.historialDisponible);

    const [vista, setVista] = useState(VISTA_PENDIENTES);
    const [confirmandoTodas, setConfirmandoTodas] = useState(false);
    const [enviandoTodas, setEnviandoTodas] = useState(false);
    const [aviso, setAviso] = useState(null); // { tipo: 'exito' | 'error', texto }

    async function marcarTodasComoLeidas() {
        setEnviandoTodas(true);
        setAviso(null);
        try {
            const resultadoRevision = await onRevisar(alertas.map((a) => a.id), 'LEIDA', null);
            setAviso({ tipo: 'exito', texto: textoAvisoRevisadas(resultadoRevision, 'LEIDA') });
        } catch (err) {
            setAviso({ tipo: 'error', texto: err.response?.data?.error || 'No se pudieron marcar las alertas. Probá de nuevo en un momento.' });
        } finally {
            setEnviandoTodas(false);
            setConfirmandoTodas(false);
        }
    }

    const pendientes = datos ? datos.resumen.alta + datos.resumen.media + datos.resumen.baja : 0;

    return (
        <div className="admin-seccion">
            <div className="admin-chips admin-alertas-vistas" role="tablist" aria-label="Pendientes o historial">
                <button
                    role="tab"
                    aria-selected={vista === VISTA_PENDIENTES}
                    className={`admin-chip ${vista === VISTA_PENDIENTES ? 'activo' : ''}`}
                    onClick={() => setVista(VISTA_PENDIENTES)}
                >
                    Pendientes{datos ? ` (${pendientes.toLocaleString('es-AR')})` : ''}
                </button>
                <button
                    role="tab"
                    aria-selected={vista === VISTA_HISTORIAL}
                    className={`admin-chip ${vista === VISTA_HISTORIAL ? 'activo' : ''}`}
                    onClick={() => setVista(VISTA_HISTORIAL)}
                >
                    Historial
                </button>
            </div>

            {vista === VISTA_HISTORIAL && (
                <AdminAlertasHistorial
                    onVerMovimientos={onVerMovimientos}
                    onVerUsuario={onVerUsuario}
                    onCambio={onCambioHistorial}
                />
            )}

            {vista === VISTA_PENDIENTES && (
                <>
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
                    {aviso && <div className={`admin-mensaje ${aviso.tipo}`} role="status">{aviso.texto}</div>}

                    {datos && !puedeRevisar && (
                        <div className="admin-alertas-aviso">
                            Para poder marcar alertas como leídas o analizadas (y tener su historial) falta crear la tabla en la base:
                            correr <strong>sql/alertas-revisadas.sql</strong> en Supabase.
                        </div>
                    )}

                    {datos && datos.revisadas > 0 && (
                        <p className="admin-alertas-revisadas">
                            {datos.revisadas === 1 ? '1 alerta de esta ventana ya está revisada' : `${datos.revisadas.toLocaleString('es-AR')} alertas de esta ventana ya están revisadas`}
                            {' · '}
                            <button onClick={() => setVista(VISTA_HISTORIAL)}>Ver historial</button>
                        </p>
                    )}

                    {datos && alertas.length < pendientes && (
                        <div className="admin-alertas-aviso">
                            Hay {pendientes.toLocaleString('es-AR')} alertas pendientes en total:
                            se muestran las {alertas.length} más graves y recientes. Marcá estas como revisadas para ver el resto, o elegí una ventana más corta.
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
                            <p>{datos.revisadas > 0 ? 'No quedan alertas pendientes' : 'Todo tranquilo'}</p>
                            <p className="admin-alertas-vacio-sub">
                                {datos.revisadas > 0
                                    ? `Ya revisaste todas las alertas de las últimas ${datos.horas} horas.`
                                    : `No se detectó actividad sospechosa en las últimas ${datos.horas} horas.`}
                            </p>
                        </div>
                    )}

                    {puedeRevisar && alertas.length > 1 && (
                        <div className="admin-alertas-masivo">
                            {!confirmandoTodas ? (
                                <button onClick={() => setConfirmandoTodas(true)} disabled={cargando}>
                                    <IconCheck size={13} /> Marcar todas como leídas ({alertas.length})
                                </button>
                            ) : (
                                <>
                                    <span>¿Marcar las {alertas.length} alertas de la lista como leídas?</span>
                                    <button className="primario" onClick={marcarTodasComoLeidas} disabled={enviandoTodas}>
                                        {enviandoTodas ? 'Marcando...' : 'Sí, marcar'}
                                    </button>
                                    <button onClick={() => setConfirmandoTodas(false)} disabled={enviandoTodas}>Cancelar</button>
                                </>
                            )}
                        </div>
                    )}

                    {alertas.length > 0 && (
                        <div className={`admin-alertas-lista ${cargando ? 'cargando' : ''}`}>
                            {alertas.map((a) => (
                                <AdminAlertaItem key={a.id} alerta={a} ahoraMs={ahoraMs}>
                                    {a.usuario && <BloqueUsuarioAlerta usuario={a.usuario} />}

                                    {puedeRevisar && <AccionesRevision alerta={a} onRevisar={onRevisar} />}

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
                                cuando el hecho queda afuera de esa ventana. Las que marcás como leídas o analizadas quedan guardadas
                                en el historial; si una cuenta vuelve a disparar la misma regla con un hecho nuevo, aparece otra vez como pendiente.
                            </p>
                        </details>
                    )}
                </>
            )}
        </div>
    );
}

export default AdminAlertas;
