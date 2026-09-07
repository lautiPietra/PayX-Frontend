import { useState } from 'react';
import { IconX, IconArrowLeft, IconSend, IconCheck, IconWallet, IconChevronDown, IconClock, IconAlertTriangle } from './icons/Icons';
import { crearTransferencia } from '../services/transferenciaService';
import './TransferModal.css';

const MOTIVOS = [
    'Alquiler',
    'Servicios (luz, agua, gas, internet)',
    'Comida y supermercado',
    'Transporte',
    'Salud',
    'Educación',
    'Entretenimiento',
    'Préstamo o devolución',
    'Regalo',
    'Otro',
];

function formatearMonto(valor) {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Pantalla completa de transferencia. "config" define si es en pesos o en dolares
// (simbolo, saldo disponible, moneda para el backend, y si corresponde mostrar
// el equivalente en pesos). "onExito" se llama despues de crear la transferencia
// para que la pantalla que abrio el modal pueda refrescar saldo y actividad.
function TransferModal({ abierto, onCerrar, config, onExito }) {
    const [paso, setPaso] = useState('form'); // 'form' | 'exito'
    const [destinatario, setDestinatario] = useState('');
    const [monto, setMonto] = useState('');
    const [motivo, setMotivo] = useState('');
    const [tipo, setTipo] = useState('DIRECTA'); // 'DIRECTA' | 'PENDIENTE'
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null);

    if (!abierto) return null;

    const montoNumero = parseFloat(monto) || 0;
    const saldoRestante = config.saldo - montoNumero;
    const equivalentePesos = config.mostrarEquivalente ? montoNumero * config.cotizacion : null;

    function resetearYCerrar() {
        onCerrar();
        setTimeout(() => {
            setPaso('form');
            setDestinatario('');
            setMonto('');
            setMotivo('');
            setTipo('DIRECTA');
            setError('');
            setEnviando(false);
            setResultado(null);
        }, 200);
    }

    function usarTodoElSaldo() {
        setMonto(String(config.saldo));
        setError('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!destinatario.trim()) {
            setError('Ingresá a quién le querés transferir.');
            return;
        }
        if (montoNumero <= 0) {
            setError('Ingresá un monto válido.');
            return;
        }
        if (montoNumero > config.saldo) {
            setError('No tenés saldo suficiente para esta transferencia.');
            return;
        }

        setEnviando(true);
        try {
            const creada = await crearTransferencia({
                destinatario: destinatario.trim(),
                moneda: config.moneda,
                monto: montoNumero,
                concepto: motivo || undefined,
                tipo,
            });
            setResultado(creada);
            setPaso('exito');
            onExito?.();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo realizar la transferencia. Intenta de nuevo.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="transfer-page-overlay">
            <div className="transfer-page">

                <div className="transfer-page-header">
                    <button className="transfer-page-volver" onClick={resetearYCerrar}>
                        <IconArrowLeft size={18} /> Volver
                    </button>
                    <button className="transfer-page-cerrar" onClick={resetearYCerrar} aria-label="Cerrar">
                        <IconX size={20} />
                    </button>
                </div>

                <div className="transfer-page-contenido">

                    {paso === 'form' && (
                        <>
                            <h1 className="transfer-page-titulo">{config.titulo}</h1>
                            <p className="transfer-page-subtitulo">Completá los datos de la transferencia</p>

                            <div className="transfer-page-grid">

                                <form onSubmit={handleSubmit} className="transfer-form-col" noValidate>

                                    <div className="transfer-modal-saldo">
                                        <span className="transfer-modal-saldo-icono"><IconWallet size={16} /></span>
                                        <span>Saldo disponible</span>
                                        <strong>{config.simbolo} {formatearMonto(config.saldo)}</strong>
                                    </div>

                                    <div className="transfer-campo">
                                        <label>¿A quién le transferís?</label>
                                        <input
                                            type="text"
                                            placeholder={config.placeholderDestinatario}
                                            value={destinatario}
                                            onChange={(e) => setDestinatario(e.target.value)}
                                        />
                                    </div>

                                    <div className="transfer-campo">
                                        <label>Monto a transferir</label>
                                        <div className="transfer-monto-group">
                                            <span className="transfer-monto-simbolo">{config.simbolo}</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="0.01"
                                                placeholder="0,00"
                                                value={monto}
                                                onChange={(e) => setMonto(e.target.value)}
                                            />
                                            <button type="button" className="transfer-usar-todo" onClick={usarTodoElSaldo}>
                                                Usar todo
                                            </button>
                                        </div>
                                        {config.mostrarEquivalente && montoNumero > 0 && (
                                            <p className="transfer-equivalente">
                                                ≈ $ {formatearMonto(equivalentePesos)} al tipo de cambio actual (${formatearMonto(config.cotizacion)})
                                            </p>
                                        )}
                                    </div>

                                    <div className="transfer-campo">
                                        <label>Motivo <span className="transfer-opcional">(opcional)</span></label>
                                        <div className="transfer-select-wrapper">
                                            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                                                <option value="">Seleccioná un motivo</option>
                                                {MOTIVOS.map((m) => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                            <IconChevronDown className="transfer-select-icono" size={16} />
                                        </div>
                                    </div>

                                    <div className="transfer-campo">
                                        <label>¿Cómo querés enviarla?</label>
                                        <div className="transfer-tipo-opciones">
                                            <button
                                                type="button"
                                                className={`transfer-tipo-opcion ${tipo === 'DIRECTA' ? 'activa' : ''}`}
                                                onClick={() => setTipo('DIRECTA')}
                                            >
                                                <IconSend size={16} />
                                                <div>
                                                    <strong>Transferir ahora</strong>
                                                    <span>Se envía al instante y no se puede deshacer</span>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                className={`transfer-tipo-opcion ${tipo === 'PENDIENTE' ? 'activa' : ''}`}
                                                onClick={() => setTipo('PENDIENTE')}
                                            >
                                                <IconClock size={16} />
                                                <div>
                                                    <strong>Dejar pendiente</strong>
                                                    <span>No se mueve la plata hasta que vos la confirmes. Podés cancelarla mientras esté pendiente</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {error && <div className="transfer-error">{error}</div>}

                                    <div className="transfer-modal-botones">
                                        <button type="button" className="transfer-btn-cancelar" onClick={resetearYCerrar}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="transfer-btn-continuar" disabled={enviando}>
                                            {enviando ? 'Procesando...' : (
                                                tipo === 'DIRECTA'
                                                    ? <><IconSend size={15} /> Transferir</>
                                                    : <><IconClock size={15} /> Dejar pendiente</>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                <div className="transfer-resumen-col">
                                    <div className="transfer-resumen-card">
                                        <p className="transfer-resumen-label">Vas a transferir</p>
                                        <p className="transfer-resumen-monto">{config.simbolo} {formatearMonto(montoNumero)}</p>

                                        {destinatario && <p className="transfer-resumen-detalle">a <strong>{destinatario}</strong></p>}
                                        {motivo && <p className="transfer-resumen-detalle-motivo">{motivo}</p>}

                                        <div className="transfer-resumen-divisor" />

                                        <div className="transfer-resumen-fila">
                                            <span>Saldo actual</span>
                                            <span>{config.simbolo} {formatearMonto(config.saldo)}</span>
                                        </div>
                                        <div className={`transfer-resumen-fila destacado ${saldoRestante < 0 ? 'negativo' : ''}`}>
                                            <span>Saldo luego de transferir</span>
                                            <span>{config.simbolo} {formatearMonto(tipo === 'DIRECTA' ? saldoRestante : config.saldo)}</span>
                                        </div>

                                        {tipo === 'PENDIENTE' && (
                                            <div className="transfer-resumen-aviso-pendiente">
                                                <IconAlertTriangle size={14} />
                                                <span>No se descuenta nada hasta que confirmes la transferencia</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </>
                    )}

                    {paso === 'exito' && (
                        <div className="transfer-exito-page">
                            <div className={`transfer-exito-icono ${tipo === 'PENDIENTE' ? 'pendiente' : ''}`}>
                                {tipo === 'DIRECTA' ? <IconCheck size={30} /> : <IconClock size={30} />}
                            </div>
                            <h1 className="transfer-page-titulo">
                                {tipo === 'DIRECTA' ? '¡Transferencia realizada!' : 'Transferencia pendiente creada'}
                            </h1>
                            <p className="transfer-exito-texto">
                                {tipo === 'DIRECTA' ? (
                                    <>Le transferiste <strong>{config.simbolo} {formatearMonto(montoNumero)}</strong> a <strong>{resultado?.contraparteNombre || destinatario}</strong></>
                                ) : (
                                    <>
                                        Dejaste pendiente una transferencia de <strong>{config.simbolo} {formatearMonto(montoNumero)}</strong> a <strong>{resultado?.contraparteNombre || destinatario}</strong>.
                                        No se descontó nada todavía: podés confirmarla o cancelarla cuando quieras desde "Consultar todas".
                                    </>
                                )}
                            </p>
                            {motivo && <p className="transfer-exito-concepto">{motivo}</p>}
                            <button className="transfer-btn-continuar ancho-completo" onClick={resetearYCerrar}>
                                Listo
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default TransferModal;
