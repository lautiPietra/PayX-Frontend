import { useState, useEffect } from 'react';
import { obtenerConfiguracion, guardarConfiguracion } from '../services/adminService';
import { normalizarTexto, validarValor, esCambio, formatearValor, textoDeValor } from '../utils/configuracionAdmin';
import { IconAlertTriangle, IconCheck, IconRefreshCw } from './icons/Icons';
import './AdminConfiguracion.css';

const GRUPOS = [
    { codigo: 'PLAZOS_FIJOS', titulo: 'Plazos fijos', descripcion: 'Lo que ven los usuarios al constituir un plazo fijo.' },
    { codigo: 'CAJAS_AHORRO', titulo: 'Cajas de ahorro', descripcion: 'Cuántas cajas puede tener cada usuario.' },
];

function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// Configuracion editable: la TNA de cada plazo fijo, el monto minimo y los maximos por usuario. Todo se
// valida en el backend; aca se avisa al instante, se pide confirmacion mostrando "antes -> despues" y
// se lista quien cambio que. Los cambios rigen desde que se guardan; los plazos fijos ya constituidos
// conservan la tasa con la que se hicieron.
function AdminConfiguracion() {
    const [resultado, setResultado] = useState(null); // { recarga, datos, error }
    const [recarga, setRecarga] = useState(0);
    const [borrador, setBorrador] = useState({}); // clave -> texto editado (solo lo que se toco)
    const [confirmando, setConfirmando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    useEffect(() => {
        let cancelado = false;
        obtenerConfiguracion()
            .then((datos) => { if (!cancelado) setResultado({ recarga, datos, error: '' }); })
            .catch((error) => {
                if (cancelado) return;
                setResultado((previo) => ({
                    recarga,
                    datos: previo?.datos ?? null,
                    error: error.response?.data?.error || 'No se pudo cargar la configuración. Probá de nuevo en un momento.',
                }));
            });
        return () => { cancelado = true; };
    }, [recarga]);

    const datos = resultado?.datos ?? null;
    const cargando = resultado?.recarga !== recarga;
    const error = cargando ? '' : (resultado?.error ?? '');
    const items = datos?.items ?? [];
    const editable = Boolean(datos?.disponible);
    const porClave = Object.fromEntries(items.map((i) => [i.clave, i]));

    const textoActual = (item) => borrador[item.clave] ?? textoDeValor(item.valor);
    const errorDe = (item) => (borrador[item.clave] === undefined ? '' : validarValor(item, borrador[item.clave]));
    const pendientes = items.filter((i) => borrador[i.clave] !== undefined && esCambio(i, borrador[i.clave]));
    const hayErrores = pendientes.some((i) => errorDe(i) !== '');

    function editar(item, texto) {
        setMensaje(null);
        setConfirmando(false);
        setBorrador((previo) => ({ ...previo, [item.clave]: texto }));
    }

    function restablecer(item) {
        editar(item, textoDeValor(item.valorPorDefecto));
    }

    function descartar() {
        setBorrador({});
        setConfirmando(false);
        setMensaje(null);
    }

    async function guardar() {
        setGuardando(true);
        setMensaje(null);
        try {
            const cambios = Object.fromEntries(pendientes.map((i) => [i.clave, normalizarTexto(borrador[i.clave])]));
            const datosNuevos = await guardarConfiguracion(cambios);
            setResultado({ recarga, datos: datosNuevos, error: '' });
            setBorrador({});
            setMensaje({ tipo: 'exito', texto: pendientes.length === 1 ? 'Cambio guardado. Ya rige para todos los usuarios.' : `${pendientes.length} cambios guardados. Ya rigen para todos los usuarios.` });
        } catch (e) {
            setMensaje({ tipo: 'error', texto: e.response?.data?.error || 'No se pudieron guardar los cambios. Probá de nuevo.' });
        } finally {
            setGuardando(false);
            setConfirmando(false);
        }
    }

    return (
        <div className="admin-seccion">
            {mensaje && (
                <div className={`admin-mensaje ${mensaje.tipo}`} role="status">
                    {mensaje.texto}
                    <button className="admin-mensaje-cerrar" onClick={() => setMensaje(null)} aria-label="Cerrar el aviso">×</button>
                </div>
            )}

            {error && (
                <div className="admin-mensaje error" role="alert">
                    {error}
                    <button className="admin-mensaje-cerrar" onClick={() => setRecarga((n) => n + 1)} aria-label="Reintentar"><IconRefreshCw size={14} /></button>
                </div>
            )}

            {!datos && cargando && (
                <div className="admin-skeleton-lista">
                    {Array.from({ length: 4 }, (_, i) => <div key={i} className="admin-skeleton-fila alto" />)}
                </div>
            )}

            {datos && !editable && (
                <div className="config-aviso" role="alert">
                    <IconAlertTriangle size={18} />
                    <div>
                        <p><strong>La configuración todavía no está habilitada.</strong></p>
                        <p>Falta crear la tabla en la base de datos: hay que correr el archivo <code>sql/configuracion.sql</code> en Supabase.
                            Mientras tanto la aplicación usa estos valores (que son los de siempre) y no se puede guardar nada.</p>
                    </div>
                </div>
            )}

            {datos && GRUPOS.map((grupo) => (
                <section key={grupo.codigo} className="config-grupo">
                    <h3 className="config-grupo-titulo">{grupo.titulo}</h3>
                    <p className="config-grupo-desc">{grupo.descripcion}</p>
                    <div className="config-campos">
                        {items.filter((i) => i.grupo === grupo.codigo).map((item) => {
                            const texto = textoActual(item);
                            const mensajeError = errorDe(item);
                            const modificado = borrador[item.clave] !== undefined && esCambio(item, borrador[item.clave]);
                            const distintoDelDefecto = normalizarTexto(texto) !== textoDeValor(item.valorPorDefecto);
                            return (
                                <div key={item.clave} className={`config-campo ${modificado ? 'modificado' : ''} ${mensajeError ? 'con-error' : ''}`}>
                                    <label htmlFor={`config-${item.clave}`} className="config-etiqueta">{item.etiqueta}</label>
                                    <div className="config-entrada">
                                        {item.unidad === '$' && <span className="config-unidad">$</span>}
                                        <input
                                            id={`config-${item.clave}`}
                                            type="text"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            value={texto}
                                            onChange={(e) => editar(item, e.target.value)}
                                            disabled={!editable || guardando}
                                            aria-invalid={mensajeError ? 'true' : 'false'}
                                            aria-describedby={`config-ayuda-${item.clave}`}
                                            maxLength={15}
                                        />
                                        {item.unidad === '%' && <span className="config-unidad">%</span>}
                                    </div>
                                    <p className="config-ayuda" id={`config-ayuda-${item.clave}`}>
                                        {mensajeError
                                            ? <span className="config-error">{mensajeError}</span>
                                            : <>{item.descripcion}</>}
                                    </p>
                                    <p className="config-meta">
                                        <span>Por defecto: {formatearValor(item.unidad, item.valorPorDefecto)}</span>
                                        {!item.esPorDefecto && item.fechaModificacion && (
                                            <span title={formatFecha(item.fechaModificacion)}>
                                                Cambiado por {item.modificadoPor || 'un administrador'} · {formatFecha(item.fechaModificacion)}
                                            </span>
                                        )}
                                        {editable && distintoDelDefecto && !guardando && (
                                            <button className="config-restablecer" onClick={() => restablecer(item)}>Volver al valor por defecto</button>
                                        )}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}

            {editable && pendientes.length > 0 && (
                <div className="config-barra" role="region" aria-label="Cambios sin guardar">
                    {!confirmando ? (
                        <>
                            <span className="config-barra-texto">{pendientes.length === 1 ? '1 cambio sin guardar' : `${pendientes.length} cambios sin guardar`}</span>
                            <button className="config-btn-secundario" onClick={descartar}>Descartar</button>
                            <button className="config-btn-principal" onClick={() => setConfirmando(true)} disabled={hayErrores}>
                                {hayErrores ? 'Corregí los errores' : 'Revisar y guardar'}
                            </button>
                        </>
                    ) : (
                        <div className="config-confirmar">
                            <p className="config-confirmar-titulo">Vas a cambiar:</p>
                            <ul>
                                {pendientes.map((i) => (
                                    <li key={i.clave}>
                                        <strong>{i.etiqueta}</strong>: {formatearValor(i.unidad, i.valor)} → {formatearValor(i.unidad, normalizarTexto(borrador[i.clave]))}
                                    </li>
                                ))}
                            </ul>
                            <p className="config-confirmar-nota">Rige enseguida para todos los usuarios. Los plazos fijos ya constituidos conservan la tasa con la que se hicieron.</p>
                            <div className="config-confirmar-botones">
                                <button className="config-btn-secundario" onClick={() => setConfirmando(false)} disabled={guardando}>Seguir editando</button>
                                <button className="config-btn-principal" onClick={guardar} disabled={guardando}>
                                    {guardando ? 'Guardando...' : <><IconCheck size={15} /> Confirmar y guardar</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {datos && datos.historial.length > 0 && (
                <section className="config-grupo">
                    <h3 className="config-grupo-titulo">Últimos cambios</h3>
                    <ul className="config-historial">
                        {datos.historial.map((h, i) => {
                            const item = porClave[h.clave];
                            const unidad = item?.unidad ?? '';
                            return (
                                <li key={`${h.clave}-${h.fecha}-${i}`}>
                                    <p className="config-historial-titulo">{h.etiqueta}</p>
                                    <p className="config-historial-cambio">
                                        {h.valorAnterior != null ? `${formatearValor(unidad, h.valorAnterior)} → ` : ''}<strong>{formatearValor(unidad, h.valor)}</strong>
                                    </p>
                                    <p className="config-historial-meta">{h.adminNombre || 'Un administrador'} · {formatFecha(h.fecha)}</p>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </div>
    );
}

export default AdminConfiguracion;
