import { useState, useEffect, createElement } from 'react';
import { IconX, IconArrowLeft, IconCheck, IconWallet } from './icons/Icons';
import { TEMA_POR_SERVICIO, TEMA_DEFAULT } from '../utils/serviciosTemas';
import { pagarFactura } from '../services/facturaService';
import './TransferModal.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Confirmacion antes de pagar una factura (monto fijo, no hay nada que
// escribir): muestra el servicio y el saldo disponible, y al confirmar paga.
function FacturaPagoModal({ abierto, onCerrar, servicio, saldoDisponible, onExito }) {
    const [paso, setPaso] = useState('confirmar'); // 'confirmar' | 'exito'
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (!abierto) return;
        setPaso('confirmar');
        setError('');
    }, [abierto, servicio]);

    if (!abierto || !servicio) return null;

    const tema = TEMA_POR_SERVICIO[servicio.servicioCodigo] || TEMA_DEFAULT;
    const saldoInsuficiente = Number(servicio.monto) > saldoDisponible;

    function cerrar() {
        onCerrar();
    }

    async function confirmarPago() {
        setError('');
        setEnviando(true);
        try {
            const resultado = await pagarFactura(servicio.facturaId);
            onExito?.(resultado);
            setPaso('exito');
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo pagar la factura. Intentá de nuevo.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="transfer-page-overlay">
            <div className="transfer-page">

                <div className="transfer-page-header">
                    <button className="transfer-page-volver" onClick={cerrar}>
                        <IconArrowLeft size={18} /> Volver
                    </button>
                    <button className="transfer-page-cerrar" onClick={cerrar} aria-label="Cerrar">
                        <IconX size={20} />
                    </button>
                </div>

                <div className="transfer-page-contenido">

                    {paso === 'confirmar' && (
                        <div className="transfer-confirmar-page">
                            <div className="transfer-confirmar-icono" style={{ backgroundColor: `${tema.color}22`, color: tema.color }}>
                                {createElement(tema.Icon, { size: 26 })}
                            </div>
                            <h1 className="transfer-page-titulo">Pagar {servicio.nombre}</h1>
                            <p className="transfer-page-subtitulo">{servicio.proveedor}</p>

                            <p className="transfer-confirmar-monto">$ {formatearMonto(servicio.monto)}</p>

                            <div className="transfer-modal-saldo" style={{ marginTop: 20 }}>
                                <span className="transfer-modal-saldo-icono"><IconWallet size={16} /></span>
                                <span>Saldo disponible</span>
                                <strong>$ {formatearMonto(saldoDisponible)}</strong>
                            </div>

                            {saldoInsuficiente && (
                                <div className="transfer-error" style={{ marginTop: 16 }}>
                                    No tenés saldo suficiente para pagar esta factura.
                                </div>
                            )}
                            {error && <div className="transfer-error" style={{ marginTop: 16 }}>{error}</div>}

                            <div className="transfer-modal-botones">
                                <button type="button" className="transfer-btn-cancelar" onClick={cerrar} disabled={enviando}>
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="transfer-btn-continuar"
                                    onClick={confirmarPago}
                                    disabled={enviando || saldoInsuficiente}
                                >
                                    {enviando ? 'Pagando...' : 'Confirmar pago'}
                                </button>
                            </div>
                        </div>
                    )}

                    {paso === 'exito' && (
                        <div className="transfer-exito-page">
                            <div className="transfer-exito-icono">
                                <IconCheck size={30} />
                            </div>
                            <h1 className="transfer-page-titulo">¡Listo!</h1>
                            <p className="transfer-exito-texto">
                                Pagaste <strong>$ {formatearMonto(servicio.monto)}</strong> de <strong>{servicio.nombre}</strong>
                            </p>
                            <button className="transfer-btn-continuar ancho-completo" onClick={cerrar}>
                                Listo
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default FacturaPagoModal;
