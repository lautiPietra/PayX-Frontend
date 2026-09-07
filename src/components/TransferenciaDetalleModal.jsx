import { useState } from 'react';
import { IconX, IconEdit, IconCheck, IconAlertTriangle } from './icons/Icons';
import { actualizarConceptoTransferencia, confirmarTransferencia, cancelarTransferencia } from '../services/transferenciaService';
import './TransferenciaDetalleModal.css';

const SIMBOLOS = { PESOS: '$', USD: 'US$' };

const ESTADO_LABEL = {
    PENDIENTE: 'Pendiente',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',
};

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFecha(fechaIso) {
    return new Date(fechaIso).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// Modal de detalle de una transferencia. Si la envio el usuario logueado (esEmisor),
// puede cambiar el concepto en cualquier momento, y si esta PENDIENTE puede
// confirmarla (recien ahi se mueve la plata) o cancelarla (nunca se movio nada).
function TransferenciaDetalleModal({ transferencia, onCerrar, onActualizada }) {
    const [editando, setEditando] = useState(false);
    const [concepto, setConcepto] = useState(transferencia?.concepto || '');
    const [guardando, setGuardando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');

    if (!transferencia) return null;

    const esEnviada = transferencia.direccion === 'ENVIADA';
    const simbolo = SIMBOLOS[transferencia.moneda] || '$';

    async function guardarConcepto() {
        setGuardando(true);
        setError('');
        try {
            const actualizada = await actualizarConceptoTransferencia(transferencia.id, concepto);
            setEditando(false);
            onActualizada(actualizada);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo actualizar el detalle');
        } finally {
            setGuardando(false);
        }
    }

    async function handleConfirmar() {
        setProcesando(true);
        setError('');
        try {
            const actualizada = await confirmarTransferencia(transferencia.id);
            onActualizada(actualizada);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo confirmar la transferencia');
        } finally {
            setProcesando(false);
        }
    }

    async function handleCancelar() {
        setProcesando(true);
        setError('');
        try {
            const actualizada = await cancelarTransferencia(transferencia.id);
            onActualizada(actualizada);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo cancelar la transferencia');
        } finally {
            setProcesando(false);
        }
    }

    return (
        <div className="detalle-overlay" onClick={onCerrar}>
            <div className="detalle-modal" onClick={(e) => e.stopPropagation()}>
                <button className="detalle-cerrar" onClick={onCerrar} aria-label="Cerrar">
                    <IconX size={18} />
                </button>

                <div className={`detalle-monto ${esEnviada ? 'negativo' : 'positivo'}`}>
                    {esEnviada ? '-' : '+'}{simbolo} {formatearMonto(transferencia.monto)}
                </div>
                <p className="detalle-titulo">{esEnviada ? 'Transferencia enviada' : 'Transferencia recibida'}</p>

                <span className={`detalle-badge-estado ${transferencia.estado.toLowerCase()}`}>
                    ● {ESTADO_LABEL[transferencia.estado]}
                </span>

                <div className="detalle-filas">
                    <div className="detalle-fila">
                        <span>{esEnviada ? 'Para' : 'De'}</span>
                        <span>{transferencia.contraparteNombre} ({transferencia.contraparteAlias})</span>
                    </div>
                    <div className="detalle-fila">
                        <span>Fecha</span>
                        <span>{formatearFecha(transferencia.fecha)}</span>
                    </div>
                    {transferencia.fechaConfirmacion && (
                        <div className="detalle-fila">
                            <span>Confirmada</span>
                            <span>{formatearFecha(transferencia.fechaConfirmacion)}</span>
                        </div>
                    )}
                </div>

                <div className="detalle-concepto-bloque">
                    <div className="detalle-concepto-header">
                        <span>Concepto</span>
                        {esEnviada && !editando && (
                            <button className="detalle-btn-editar" onClick={() => setEditando(true)}>
                                <IconEdit size={13} /> Cambiar
                            </button>
                        )}
                    </div>

                    {editando ? (
                        <div className="detalle-concepto-edit">
                            <input
                                type="text"
                                value={concepto}
                                onChange={(e) => setConcepto(e.target.value)}
                                maxLength={200}
                                placeholder="Sin concepto"
                                autoFocus
                            />
                            <div className="detalle-concepto-botones">
                                <button
                                    className="detalle-btn-cancelar-mini"
                                    onClick={() => { setEditando(false); setConcepto(transferencia.concepto || ''); }}
                                    disabled={guardando}
                                >
                                    Cancelar
                                </button>
                                <button className="detalle-btn-guardar-mini" onClick={guardarConcepto} disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="detalle-concepto-texto">{transferencia.concepto || 'Sin concepto'}</p>
                    )}
                </div>

                {error && (
                    <div className="detalle-error"><IconAlertTriangle size={14} /> {error}</div>
                )}

                {transferencia.estado === 'PENDIENTE' && esEnviada && (
                    <div className="detalle-pendiente-aviso">
                        <p>Esta transferencia todavía no se confirmó: la plata no se movió de tu cuenta.</p>
                        <div className="detalle-pendiente-botones">
                            <button className="detalle-btn-cancelar" onClick={handleCancelar} disabled={procesando}>
                                Cancelar transferencia
                            </button>
                            <button className="detalle-btn-confirmar" onClick={handleConfirmar} disabled={procesando}>
                                {procesando ? 'Procesando...' : (<><IconCheck size={14} /> Confirmar ahora</>)}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TransferenciaDetalleModal;
