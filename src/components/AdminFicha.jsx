import { useState, useEffect, useMemo, useRef } from 'react';
import { obtenerFicha, cambiarRol, darDeBaja, reactivarUsuario } from '../services/adminService';
import { idUsuarioActual } from '../services/authService';
import { formatearMontoConMoneda } from '../utils/formatoMoneda';
import { textoMonto } from '../utils/transaccionesAdmin';
import { vencimientoTarjeta, progresoCaja, antiguedad, etiquetaAccion, NOMBRE_MONEDA, formatearCantidad } from '../utils/fichaUsuario';
import AdminAvatar from './AdminAvatar';
import AdminAlertaItem from './AdminAlertaItem';
import { BadgeTipo, BadgeEstado } from './AdminTransaccionBadges';
import { IconX, IconCopy, IconCheck, IconCreditCard, IconPiggyBank, IconTrendingUp, IconRefreshCw } from './icons/Icons';
import './AdminFicha.css';

const ETIQUETA_ROL = { USUARIO: 'Usuario', ADMIN: 'Admin', SOPORTE: 'Soporte' };
const DURACION_COPIADO_MS = 1600;

function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatDia(fecha) {
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Que se ve en una fila de "ultimas transacciones": para una transferencia, hacia quien iba o de quien
// venia (segun si este usuario fue el que envio); para el resto, el detalle que ya arma el backend.
function descripcionDeFila(t, usuarioId) {
    if (t.contraparte) {
        const envio = t.usuario?.id === usuarioId;
        const otro = envio ? t.contraparte : t.usuario;
        return `${envio ? 'Envió a' : 'Recibió de'} ${otro?.nombreCompleto ?? 'un usuario desconocido'}`;
    }
    return t.detalle || '';
}

// Ficha de un usuario del panel de admin: un panel lateral con todo lo que hace falta saber de esa
// persona (quien es, cuanta plata tiene, que productos usa, que hizo, si dispara alertas y que se
// hizo sobre su cuenta) y las acciones sobre ella. Se pide en un solo pedido al backend.
//
// onCambio se llama despues de una accion exitosa para que el panel refresque sus listas;
// onVerMovimientos lleva al monitor de transacciones filtrado por este usuario.
function AdminFicha({ usuarioId, onCerrar, onCambio, onVerMovimientos }) {
    const [resultado, setResultado] = useState(null); // { consulta, datos, error }
    const [recarga, setRecarga] = useState(0);
    const [enCurso, setEnCurso] = useState(false);
    const [confirmandoBaja, setConfirmandoBaja] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [copiado, setCopiado] = useState('');
    const panelRef = useRef(null);
    const temporizadorCopiado = useRef(null);

    const consulta = useMemo(() => ({ usuarioId, recarga }), [usuarioId, recarga]);

    useEffect(() => {
        let cancelado = false;
        obtenerFicha(consulta.usuarioId)
            .then((datos) => { if (!cancelado) setResultado({ consulta, datos, error: '' }); })
            .catch((error) => {
                if (cancelado) return;
                setResultado((previo) => ({
                    consulta,
                    datos: previo?.datos ?? null,
                    error: error.response?.data?.error || 'No se pudo cargar la ficha. Probá de nuevo en un momento.',
                }));
            });
        return () => { cancelado = true; };
    }, [consulta]);

    // El panel le pasa una funcion nueva en cada render: se guarda la ultima en una ref para que el
    // efecto de abajo corra una sola vez (si no, cada render le volveria a robar el foco al panel).
    const onCerrarRef = useRef(onCerrar);
    useEffect(() => { onCerrarRef.current = onCerrar; });

    // Bloquea el scroll de la pagina de atras, cierra con Escape y devuelve el foco a lo que lo tenia.
    useEffect(() => {
        const previoOverflow = document.body.style.overflow;
        const elementoPrevio = document.activeElement;
        document.body.style.overflow = 'hidden';
        panelRef.current?.focus();

        const alTeclear = (e) => { if (e.key === 'Escape') onCerrarRef.current(); };
        document.addEventListener('keydown', alTeclear);
        return () => {
            document.body.style.overflow = previoOverflow;
            document.removeEventListener('keydown', alTeclear);
            if (elementoPrevio instanceof HTMLElement) elementoPrevio.focus();
        };
    }, []);

    useEffect(() => () => clearTimeout(temporizadorCopiado.current), []);

    const datos = resultado?.datos ?? null;
    const cargando = resultado?.consulta !== consulta;
    const error = cargando ? '' : (resultado?.error ?? '');
    const usuario = datos?.usuario ?? null;
    const esCuentaPropia = usuario !== null && usuario.id === idUsuarioActual();

    // Con el foco dentro del panel: Tab no se escapa a la pagina de atras.
    function atraparTab(e) {
        if (e.key !== 'Tab') return;
        const enfocables = [...panelRef.current.querySelectorAll('button:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
        if (enfocables.length === 0) return;
        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];
        if (e.shiftKey && (document.activeElement === primero || document.activeElement === panelRef.current)) {
            e.preventDefault();
            ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault();
            primero.focus();
        }
    }

    async function ejecutar(accion, textoExito, textoError) {
        setMensaje(null);
        setEnCurso(true);
        try {
            await accion();
            setMensaje({ tipo: 'exito', texto: textoExito });
            setRecarga((n) => n + 1);
            onCambio();
        } catch (e) {
            setMensaje({ tipo: 'error', texto: e.response?.data?.error || textoError });
        } finally {
            setEnCurso(false);
            setConfirmandoBaja(false);
        }
    }

    async function copiar(texto, clave) {
        try {
            await navigator.clipboard.writeText(texto);
            setCopiado(clave);
            clearTimeout(temporizadorCopiado.current);
            temporizadorCopiado.current = setTimeout(() => setCopiado(''), DURACION_COPIADO_MS);
        } catch {
            // sin permiso para el portapapeles: no hay nada que mostrar
        }
    }

    const cuenta = datos?.cuenta ?? null;
    const alertas = datos?.alertas ?? null;
    const totalAlertas = alertas ? alertas.resumen.alta + alertas.resumen.media + alertas.resumen.baja : 0;
    // "Ahora" se toma del servidor (el fin de la ventana que analizo), no del reloj de esta
    // computadora: asi "hace 2 h" es consistente aunque el reloj local este desfasado.
    const ahoraMs = alertas ? new Date(alertas.desde).getTime() + alertas.horas * 3600 * 1000 : 0;

    return (
        <div className="ficha-overlay" onClick={onCerrar}>
            <aside
                className="ficha-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={usuario ? 'ficha-titulo' : undefined}
                aria-label={usuario ? undefined : 'Ficha de usuario'}
                tabIndex={-1}
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={atraparTab}
            >
                <button className="ficha-cerrar" onClick={onCerrar} aria-label="Cerrar la ficha">
                    <IconX size={18} />
                </button>

                {!datos && cargando && (
                    <div className="ficha-esqueleto" aria-busy="true" aria-label="Cargando la ficha">
                        <div className="ficha-esqueleto-cabecera">
                            <div className="ficha-esqueleto-avatar" />
                            <div className="ficha-esqueleto-lineas">
                                <div /><div /><div />
                            </div>
                        </div>
                        {Array.from({ length: 4 }, (_, i) => <div key={i} className="ficha-esqueleto-bloque" />)}
                    </div>
                )}

                {error && (
                    <div className="ficha-error" role="alert">
                        <p>{error}</p>
                        <button onClick={() => setRecarga((n) => n + 1)}><IconRefreshCw size={14} /> Reintentar</button>
                    </div>
                )}

                {usuario && (
                    <div className={`ficha-contenido ${cargando ? 'cargando' : ''}`}>
                        {/* ===== Cabecera ===== */}
                        <header className="ficha-cabecera">
                            <div className="ficha-avatar">
                                <AdminAvatar key={usuario.fotoPerfilUrl || 'sin-foto'} usuario={usuario} />
                            </div>
                            <div className="ficha-identidad">
                                <h2 id="ficha-titulo" className="ficha-nombre">{usuario.nombreCompleto}</h2>
                                <p className="ficha-username">@{usuario.nombreUsuario}</p>
                                <p className="ficha-email">{usuario.email}</p>
                            </div>
                        </header>

                        <div className="ficha-chips">
                            <span className={`ficha-chip rol-${usuario.rol.toLowerCase()}`}>{ETIQUETA_ROL[usuario.rol] || usuario.rol}</span>
                            <span className={`ficha-chip ${usuario.activo ? 'activo' : 'inactivo'}`}>{usuario.activo ? 'Activo' : 'Dado de baja'}</span>
                            <span className={`ficha-chip ${usuario.emailVerificado ? 'verificado' : 'sin-verificar'}`}>
                                {usuario.emailVerificado ? 'Email verificado' : 'Email sin verificar'}
                            </span>
                        </div>

                        <dl className="ficha-datos">
                            <div>
                                <dt>Registro</dt>
                                <dd>
                                    {usuario.fechaRegistro ? formatDia(usuario.fechaRegistro) : '—'}
                                    {usuario.fechaRegistro && <span className="ficha-dato-sub"> · {antiguedad(usuario.fechaRegistro, ahoraMs)}</span>}
                                </dd>
                            </div>
                            <div><dt>DNI</dt><dd>{usuario.dni || '—'}</dd></div>
                            <div><dt>Teléfono</dt><dd>{usuario.telefono || '—'}</dd></div>
                        </dl>

                        {/* ===== Acciones ===== */}
                        <section className="ficha-seccion">
                            <h3 className="ficha-seccion-titulo">Acciones</h3>
                            {esCuentaPropia ? (
                                <p className="ficha-nota">Esta es tu cuenta: no podés cambiarte el rol ni darte de baja.</p>
                            ) : (
                                <div className="ficha-acciones">
                                    <label className="ficha-rol-selector">
                                        <span>Rol</span>
                                        <select
                                            value={usuario.rol}
                                            onChange={(e) => ejecutar(() => cambiarRol(usuario.id, e.target.value), 'Rol actualizado correctamente', 'Error al cambiar el rol')}
                                            disabled={enCurso}
                                            className={`admin-select-rol ${usuario.rol.toLowerCase()}`}
                                        >
                                            <option value="USUARIO">Usuario</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="SOPORTE">Soporte</option>
                                        </select>
                                    </label>

                                    {usuario.activo && !confirmandoBaja && (
                                        <button className="admin-btn-baja" onClick={() => setConfirmandoBaja(true)} disabled={enCurso}>
                                            Dar de baja
                                        </button>
                                    )}
                                    {usuario.activo && confirmandoBaja && (
                                        <span className="ficha-confirmar">
                                            <span>¿Dar de baja a {usuario.nombreCompleto}? No va a poder iniciar sesión.</span>
                                            <button className="ficha-confirmar-si" onClick={() => ejecutar(() => darDeBaja(usuario.id), 'Usuario dado de baja correctamente', 'Error al dar de baja')} disabled={enCurso}>
                                                Sí, dar de baja
                                            </button>
                                            <button className="ficha-confirmar-no" onClick={() => setConfirmandoBaja(false)} disabled={enCurso}>Cancelar</button>
                                        </span>
                                    )}
                                    {!usuario.activo && (
                                        <button className="admin-btn-reactivar" onClick={() => ejecutar(() => reactivarUsuario(usuario.id), 'Usuario reactivado correctamente', 'Error al reactivar')} disabled={enCurso}>
                                            Reactivar
                                        </button>
                                    )}
                                </div>
                            )}
                            {mensaje && (
                                <p className={`ficha-mensaje ${mensaje.tipo}`} role="status">{mensaje.texto}</p>
                            )}
                        </section>

                        {/* ===== Saldos ===== */}
                        <section className="ficha-seccion">
                            <h3 className="ficha-seccion-titulo">Cuenta y saldos</h3>
                            {cuenta ? (
                                <>
                                    <div className="ficha-saldos">
                                        {cuenta.saldos.map((s) => (
                                            <div key={s.moneda} className={`ficha-saldo ${Number(s.monto) < 0 ? 'negativo' : ''}`}>
                                                <span className="ficha-saldo-moneda">{NOMBRE_MONEDA[s.moneda] || s.moneda}</span>
                                                <strong>{formatearMontoConMoneda(s.monto, s.moneda)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                    <dl className="ficha-identificadores">
                                        <div>
                                            <dt>CVU</dt>
                                            <dd>
                                                <span>{cuenta.cvu}</span>
                                                <button onClick={() => copiar(cuenta.cvu, 'cvu')} aria-label="Copiar el CVU">
                                                    {copiado === 'cvu' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                </button>
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>Alias</dt>
                                            <dd>
                                                <span>{cuenta.alias}</span>
                                                <button onClick={() => copiar(cuenta.alias, 'alias')} aria-label="Copiar el alias">
                                                    {copiado === 'alias' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                </button>
                                            </dd>
                                        </div>
                                    </dl>
                                </>
                            ) : (
                                <p className="ficha-vacio">Todavía no tiene una cuenta.</p>
                            )}
                        </section>

                        {/* ===== Productos ===== */}
                        <section className="ficha-seccion">
                            <h3 className="ficha-seccion-titulo">Productos</h3>
                            <div className="ficha-productos">
                                <div className="ficha-producto">
                                    <span className="ficha-producto-icono"><IconCreditCard size={18} /></span>
                                    <div>
                                        <p className="ficha-producto-nombre">Tarjeta virtual</p>
                                        {datos.tarjeta ? (
                                            <>
                                                <strong>•••• {datos.tarjeta.terminacion}</strong>
                                                <small>Vence {vencimientoTarjeta(datos.tarjeta.vencimiento)}</small>
                                            </>
                                        ) : <small>Todavía no tiene</small>}
                                    </div>
                                </div>
                                <div className="ficha-producto">
                                    <span className="ficha-producto-icono"><IconPiggyBank size={18} /></span>
                                    <div>
                                        <p className="ficha-producto-nombre">Cajas de ahorro</p>
                                        {datos.cajasAhorro.lista.length > 0 ? (
                                            <>
                                                <strong>{formatearMontoConMoneda(datos.cajasAhorro.total, 'PESOS')}</strong>
                                                <small>{datos.cajasAhorro.lista.length} {datos.cajasAhorro.lista.length === 1 ? 'caja' : 'cajas'}</small>
                                            </>
                                        ) : <small>No tiene cajas</small>}
                                    </div>
                                </div>
                                <div className="ficha-producto">
                                    <span className="ficha-producto-icono"><IconTrendingUp size={18} /></span>
                                    <div>
                                        <p className="ficha-producto-nombre">Plazos fijos</p>
                                        {datos.plazosFijos.total > 0 ? (
                                            <>
                                                <strong>{formatearMontoConMoneda(datos.plazosFijos.montoActivo, 'PESOS')}</strong>
                                                <small>{datos.plazosFijos.activos} {datos.plazosFijos.activos === 1 ? 'activo' : 'activos'} de {datos.plazosFijos.total}</small>
                                            </>
                                        ) : <small>No tiene</small>}
                                    </div>
                                </div>
                            </div>

                            {datos.cajasAhorro.lista.length > 0 && (
                                <ul className="ficha-cajas">
                                    {datos.cajasAhorro.lista.map((c) => {
                                        const progreso = progresoCaja(c.saldo, c.montoObjetivo);
                                        return (
                                            <li key={c.id}>
                                                <div className="ficha-caja-fila">
                                                    <span>{c.nombre}</span>
                                                    <strong>{formatearMontoConMoneda(c.saldo, 'PESOS')}</strong>
                                                </div>
                                                {progreso !== null && (
                                                    <div className="ficha-progreso" title={`${Math.round(progreso)}% de ${formatearMontoConMoneda(c.montoObjetivo, 'PESOS')}`}>
                                                        <div style={{ width: `${progreso}%` }} />
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>

                        {/* ===== Actividad ===== */}
                        <section className="ficha-seccion">
                            <h3 className="ficha-seccion-titulo">Actividad</h3>
                            <div className="ficha-stats">
                                <div><strong>{formatearCantidad(datos.actividad.transferenciasEnviadas)}</strong><span>Transferencias enviadas</span></div>
                                <div><strong>{formatearCantidad(datos.actividad.transferenciasRecibidas)}</strong><span>Transferencias recibidas</span></div>
                                <div><strong>{formatearMontoConMoneda(datos.actividad.pesosEnviados, 'PESOS')}</strong><span>Pesos enviados</span></div>
                                <div><strong>{formatearCantidad(datos.actividad.cambios)}</strong><span>Cambios de moneda</span></div>
                                <div><strong>{formatearCantidad(datos.actividad.serviciosPagados)}</strong><span>Servicios pagados</span></div>
                            </div>
                            <p className="ficha-nota">Solo cuentan las transferencias completadas.</p>
                        </section>

                        {/* ===== Alertas ===== */}
                        <section className="ficha-seccion">
                            <h3 className="ficha-seccion-titulo">
                                Alertas de los últimos {alertas.horas / 24} días
                                {totalAlertas > 0 && (
                                    <span className={`ficha-contador ${alertas.resumen.alta > 0 ? 'alta' : 'media'}`}>{totalAlertas}</span>
                                )}
                            </h3>
                            {alertas.alertas.length === 0 ? (
                                <p className="ficha-vacio ok"><IconCheck size={16} /> Sin actividad sospechosa.</p>
                            ) : (
                                <div className="ficha-alertas">
                                    {alertas.alertas.map((a) => <AdminAlertaItem key={a.id} alerta={a} ahoraMs={ahoraMs} />)}
                                </div>
                            )}
                            {totalAlertas > alertas.alertas.length && (
                                <p className="ficha-nota">Se muestran las {alertas.alertas.length} más graves de {totalAlertas.toLocaleString('es-AR')}.</p>
                            )}
                            {alertas.truncado && (
                                <p className="ficha-nota">Hubo tanta actividad que solo se analizaron las transferencias más recientes.</p>
                            )}
                        </section>

                        {/* ===== Ultimas transacciones ===== */}
                        <section className="ficha-seccion">
                            <div className="ficha-seccion-cabecera">
                                <h3 className="ficha-seccion-titulo">Últimas transacciones</h3>
                                {datos.ultimasTransacciones.length > 0 && (
                                    <button className="ficha-enlace" onClick={() => onVerMovimientos(usuario)}>Ver todas</button>
                                )}
                            </div>
                            {datos.ultimasTransacciones.length === 0 ? (
                                <p className="ficha-vacio">Todavía no hizo ninguna transacción.</p>
                            ) : (
                                <ul className="ficha-tx">
                                    {datos.ultimasTransacciones.map((t) => (
                                        <li key={`${t.tipo}-${t.id}`}>
                                            <div className="ficha-tx-badges"><BadgeTipo tipo={t.tipo} /><BadgeEstado estado={t.estado} /></div>
                                            <p className="ficha-tx-monto">{textoMonto(t)}</p>
                                            <p className="ficha-tx-detalle">{descripcionDeFila(t, usuario.id)}</p>
                                            <p className="ficha-tx-fecha">{formatFecha(t.fecha)}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* ===== Historial de acciones de administradores ===== */}
                        <section className="ficha-seccion">
                            <h3 className="ficha-seccion-titulo">Acciones de administradores sobre este usuario</h3>
                            {datos.historialAdmin.length === 0 ? (
                                <p className="ficha-vacio">Nadie hizo cambios sobre esta cuenta.</p>
                            ) : (
                                <ul className="ficha-historial">
                                    {datos.historialAdmin.map((h) => (
                                        <li key={h.id}>
                                            <p className="ficha-historial-accion">{etiquetaAccion(h.accion)}</p>
                                            <p className="ficha-historial-detalle">{h.detalle}</p>
                                            <p className="ficha-historial-meta">Por {h.adminEmail} · {formatFecha(h.fecha)}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                )}
            </aside>
        </div>
    );
}

export default AdminFicha;
