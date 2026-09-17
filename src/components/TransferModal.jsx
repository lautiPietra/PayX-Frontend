import { useState } from 'react';
import { IconX, IconArrowLeft, IconSend, IconCheck, IconWallet, IconChevronDown, IconClock, IconAlertTriangle } from './icons/Icons';
import { crearTransferencia, resolverDestinatario } from '../services/transferenciaService';
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

const CRIPTOS_TRANSFERIBLES = ['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP'];

function formatearMonto(valor, decimales = 2) {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

// Pantalla completa de transferencia. "config" define si es en pesos, en dolares o
// en cripto. Para pesos/dolares trae simbolo/saldo/moneda fijos; para cripto
// (config.esCripto) trae "saldosPorCripto" (uno por moneda) y el usuario elige
// cual transferir con un select propio, igual que ya se elige en el modal de
// comprar/vender cripto. "onExito" se llama despues de crear la transferencia
// para que la pantalla que abrio el modal pueda refrescar saldo y actividad.
// "contactos" son los alias a los que ya se les transfirio antes (mas reciente
// primero), para sugerirlos mientras se escribe el destinatario.
function TransferModal({ abierto, onCerrar, config, onExito, contactos = [] }) {
    const [paso, setPaso] = useState('form'); // 'form' | 'confirmar' | 'exito'
    const [destinatario, setDestinatario] = useState('');
    const [criptoSeleccionada, setCriptoSeleccionada] = useState('BTC');
    const [monto, setMonto] = useState('');
    const [motivo, setMotivo] = useState('');
    const [tipo, setTipo] = useState('DIRECTA'); // 'DIRECTA' | 'PENDIENTE'
    const [error, setError] = useState('');
    const [resolviendo, setResolviendo] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [destinatarioInfo, setDestinatarioInfo] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);

    if (!abierto) return null;

    const esCripto = Boolean(config.esCripto);
    const moneda = esCripto ? criptoSeleccionada : config.moneda;
    const simbolo = esCripto ? criptoSeleccionada : config.simbolo;
    const decimales = esCripto ? 8 : 2;
    const saldoDisponible = esCripto ? Number(config.saldosPorCripto?.[criptoSeleccionada] ?? 0) : config.saldo;

    // Mientras el campo esta vacio se sugieren los contactos mas recientes;
    // en cuanto se escribe algo, se filtra por alias que empiecen con eso.
    const textoBusqueda = destinatario.trim().toLowerCase();
    const sugerencias = (textoBusqueda
        ? contactos.filter((c) => c.alias.toLowerCase().startsWith(textoBusqueda))
        : contactos
    ).slice(0, 5);

    function elegirSugerencia(alias) {
        setDestinatario(alias);
        setSugerenciasAbiertas(false);
    }

    const montoNumero = parseFloat(monto) || 0;
    const saldoRestante = saldoDisponible - montoNumero;
    const equivalentePesos = config.mostrarEquivalente ? montoNumero * config.cotizacion : null;

    function resetearYCerrar() {
        onCerrar();
        setTimeout(() => {
            setPaso('form');
            setDestinatario('');
            setCriptoSeleccionada('BTC');
            setMonto('');
            setMotivo('');
            setTipo('DIRECTA');
            setError('');
            setResolviendo(false);
            setEnviando(false);
            setDestinatarioInfo(null);
            setResultado(null);
            setSugerenciasAbiertas(false);
        }, 200);
    }

    function cambiarCripto(key) {
        setCriptoSeleccionada(key);
        setMonto('');
        setError('');
    }

    function usarTodoElSaldo() {
        setMonto(String(saldoDisponible));
        setError('');
    }

    // Valida los datos del formulario y busca a quien corresponde el destinatario
    // ingresado, para mostrarlo en la pantalla de confirmacion antes de mover nada.
    async function handleContinuar(e) {
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
        if (montoNumero > saldoDisponible) {
            setError('No tenés saldo suficiente para esta transferencia.');
            return;
        }

        setResolviendo(true);
        try {
            const info = await resolverDestinatario(destinatario.trim());
            setDestinatarioInfo(info);
            setPaso('confirmar');
        } catch (err) {
            setError(err.response?.data?.error || 'No pudimos encontrar ese destinatario.');
        } finally {
            setResolviendo(false);
        }
    }

    // Recien aca se crea la transferencia de verdad, despues de que el usuario
    // vio a quien le transfiere y confirmo.
    async function handleConfirmar() {
        setError('');
        setEnviando(true);
        try {
            const creada = await crearTransferencia({
                destinatario: destinatario.trim(),
                moneda,
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

                                <form onSubmit={handleContinuar} className="transfer-form-col" noValidate>

                                    {esCripto && (
                                        <div className="transfer-campo">
                                            <label>Criptomoneda</label>
                                            <div className="transfer-select-wrapper">
                                                <select value={criptoSeleccionada} onChange={(e) => cambiarCripto(e.target.value)}>
                                                    {CRIPTOS_TRANSFERIBLES.map((key) => (
                                                        <option key={key} value={key}>{key}</option>
                                                    ))}
                                                </select>
                                                <IconChevronDown className="transfer-select-icono" size={16} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="transfer-modal-saldo">
                                        <span className="transfer-modal-saldo-icono"><IconWallet size={16} /></span>
                                        <span>{esCripto ? `Saldo disponible de ${simbolo}` : 'Saldo disponible'}</span>
                                        <strong>{simbolo} {formatearMonto(saldoDisponible, decimales)}</strong>
                                    </div>

                                    <div className="transfer-campo">
                                        <label>¿A quién le transferís?</label>
                                        <div className="transfer-destinatario-wrapper">
                                            <input
                                                type="text"
                                                placeholder={config.placeholderDestinatario}
                                                value={destinatario}
                                                onChange={(e) => setDestinatario(e.target.value)}
                                                onFocus={() => setSugerenciasAbiertas(true)}
                                                onBlur={() => setTimeout(() => setSugerenciasAbiertas(false), 150)}
                                                autoComplete="off"
                                            />
                                            {sugerenciasAbiertas && sugerencias.length > 0 && (
                                                <ul className="transfer-sugerencias">
                                                    {sugerencias.map((c) => (
                                                        <li key={c.alias}>
                                                            <button
                                                                type="button"
                                                                className="transfer-sugerencia-item"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => elegirSugerencia(c.alias)}
                                                            >
                                                                <span className="transfer-sugerencia-alias">{c.alias}</span>
                                                                <span className="transfer-sugerencia-nombre">{c.nombre}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    <div className="transfer-campo">
                                        <label>Monto a transferir</label>
                                        <div className="transfer-monto-group">
                                            <span className="transfer-monto-simbolo">{simbolo}</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step={esCripto ? 'any' : '0.01'}
                                                placeholder={esCripto ? '0' : '0,00'}
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
                                        <button type="submit" className="transfer-btn-continuar" disabled={resolviendo}>
                                            {resolviendo ? 'Buscando destinatario...' : <>Continuar</>}
                                        </button>
                                    </div>
                                </form>

                                <div className="transfer-resumen-col">
                                    <div className="transfer-resumen-card">
                                        <p className="transfer-resumen-label">Vas a transferir</p>
                                        <p className="transfer-resumen-monto">{simbolo} {formatearMonto(montoNumero, decimales)}</p>

                                        {destinatario && <p className="transfer-resumen-detalle">a <strong>{destinatario}</strong></p>}
                                        {motivo && <p className="transfer-resumen-detalle-motivo">{motivo}</p>}

                                        <div className="transfer-resumen-divisor" />

                                        <div className="transfer-resumen-fila">
                                            <span>Saldo actual</span>
                                            <span>{simbolo} {formatearMonto(saldoDisponible, decimales)}</span>
                                        </div>
                                        <div className={`transfer-resumen-fila destacado ${saldoRestante < 0 ? 'negativo' : ''}`}>
                                            <span>Saldo luego de transferir</span>
                                            <span>{simbolo} {formatearMonto(tipo === 'DIRECTA' ? saldoRestante : saldoDisponible, decimales)}</span>
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

                    {paso === 'confirmar' && (
                        <div className="transfer-confirmar-page">
                            <div className="transfer-confirmar-icono">
                                <IconAlertTriangle size={26} />
                            </div>
                            <h1 className="transfer-page-titulo">Confirmá la transferencia</h1>
                            <p className="transfer-page-subtitulo">Revisá que los datos sean correctos antes de continuar</p>

                            <div className="transfer-confirmar-card">
                                <p className="transfer-confirmar-monto">{simbolo} {formatearMonto(montoNumero, decimales)}</p>
                                {config.mostrarEquivalente && montoNumero > 0 && (
                                    <p className="transfer-equivalente centrado">
                                        ≈ $ {formatearMonto(equivalentePesos)} al tipo de cambio actual
                                    </p>
                                )}

                                <div className="transfer-confirmar-divisor" />

                                <div className="transfer-confirmar-fila">
                                    <span>Le vas a transferir a</span>
                                    <strong>{destinatarioInfo?.nombreCompleto}</strong>
                                </div>
                                <div className="transfer-confirmar-fila">
                                    <span>Alias</span>
                                    <strong>{destinatarioInfo?.alias}</strong>
                                </div>
                                <div className="transfer-confirmar-fila">
                                    <span>CVU</span>
                                    <strong className="mono">{destinatarioInfo?.cvu}</strong>
                                </div>
                                {motivo && (
                                    <div className="transfer-confirmar-fila">
                                        <span>Motivo</span>
                                        <strong>{motivo}</strong>
                                    </div>
                                )}
                                <div className="transfer-confirmar-fila">
                                    <span>Tipo de envío</span>
                                    <strong>{tipo === 'DIRECTA' ? 'Directa (inmediata)' : 'Pendiente (a confirmar después)'}</strong>
                                </div>
                            </div>

                            {tipo === 'PENDIENTE' && (
                                <div className="transfer-resumen-aviso-pendiente centrado">
                                    <IconAlertTriangle size={14} />
                                    <span>No se descuenta nada hasta que confirmes la transferencia</span>
                                </div>
                            )}

                            {error && <div className="transfer-error">{error}</div>}

                            <div className="transfer-modal-botones">
                                <button type="button" className="transfer-btn-cancelar" onClick={() => setPaso('form')} disabled={enviando}>
                                    <IconArrowLeft size={15} /> Editar
                                </button>
                                <button type="button" className="transfer-btn-continuar" onClick={handleConfirmar} disabled={enviando}>
                                    {enviando ? 'Procesando...' : (
                                        tipo === 'DIRECTA'
                                            ? <><IconSend size={15} /> Confirmar transferencia</>
                                            : <><IconClock size={15} /> Confirmar y dejar pendiente</>
                                    )}
                                </button>
                            </div>
                        </div>
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
                                    <>Le transferiste <strong>{simbolo} {formatearMonto(montoNumero, decimales)}</strong> a <strong>{resultado?.contraparteNombre || destinatarioInfo?.nombreCompleto || destinatario}</strong></>
                                ) : (
                                    <>
                                        Dejaste pendiente una transferencia de <strong>{simbolo} {formatearMonto(montoNumero, decimales)}</strong> a <strong>{resultado?.contraparteNombre || destinatarioInfo?.nombreCompleto || destinatario}</strong>.
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
