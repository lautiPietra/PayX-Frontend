import { useState } from 'react';
import { IconX, IconArrowLeft, IconCheck, IconWallet, IconChevronDown, IconCalendar, IconPercent } from './icons/Icons';
import './TransferModal.css';
import './PlazoFijoModal.css';

const PLAZOS = [
    { dias: 30, tna: 35 },
    { dias: 60, tna: 36.5 },
    { dias: 90, tna: 38 },
    { dias: 180, tna: 40 },
    { dias: 365, tna: 42 },
];

const MONTO_MINIMO = 1000;

function formatearMonto(valor) {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFecha(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Pantalla completa para constituir un plazo fijo. No hay backend de inversiones
// todavia, asi que el calculo de interes es solo una simulacion para mostrar el diseño.
function PlazoFijoModal({ abierto, onCerrar, saldoDisponible }) {
    const [paso, setPaso] = useState('form'); // 'form' | 'exito'
    const [monto, setMonto] = useState('');
    const [plazoDias, setPlazoDias] = useState(String(PLAZOS[0].dias));
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    if (!abierto) return null;

    const plazo = PLAZOS.find((p) => p.dias === Number(plazoDias)) || PLAZOS[0];
    const montoNumero = parseFloat(monto) || 0;
    const interesEstimado = montoNumero * (plazo.tna / 100) * (plazo.dias / 365);
    const totalAlVencimiento = montoNumero + interesEstimado;
    const fechaVencimiento = formatearFecha(plazo.dias);

    function resetearYCerrar() {
        onCerrar();
        setTimeout(() => {
            setPaso('form');
            setMonto('');
            setPlazoDias(String(PLAZOS[0].dias));
            setError('');
            setEnviando(false);
        }, 200);
    }

    function usarTodoElSaldo() {
        setMonto(String(saldoDisponible));
        setError('');
    }

    function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (montoNumero <= 0) {
            setError('Ingresá un monto válido.');
            return;
        }
        if (montoNumero < MONTO_MINIMO) {
            setError(`El monto mínimo para constituir un plazo fijo es $ ${formatearMonto(MONTO_MINIMO)}.`);
            return;
        }
        if (montoNumero > saldoDisponible) {
            setError('No tenés saldo suficiente para esta inversión.');
            return;
        }

        setEnviando(true);
        setTimeout(() => {
            setEnviando(false);
            setPaso('exito');
        }, 900);
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
                            <h1 className="transfer-page-titulo">Constituir un plazo fijo</h1>
                            <p className="transfer-page-subtitulo">Elegí cuánto querés invertir y por cuánto tiempo</p>

                            <div className="transfer-page-grid">

                                <form onSubmit={handleSubmit} className="transfer-form-col" noValidate>

                                    <div className="transfer-modal-saldo">
                                        <span className="transfer-modal-saldo-icono"><IconWallet size={16} /></span>
                                        <span>Saldo disponible</span>
                                        <strong>$ {formatearMonto(saldoDisponible)}</strong>
                                    </div>

                                    <div className="transfer-campo">
                                        <label>Monto a depositar</label>
                                        <div className="transfer-monto-group">
                                            <span className="transfer-monto-simbolo">$</span>
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
                                    </div>

                                    <div className="transfer-campo">
                                        <label>Plazo</label>
                                        <div className="transfer-select-wrapper">
                                            <select value={plazoDias} onChange={(e) => setPlazoDias(e.target.value)}>
                                                {PLAZOS.map((p) => (
                                                    <option key={p.dias} value={p.dias}>
                                                        {p.dias} días · TNA {p.tna}%
                                                    </option>
                                                ))}
                                            </select>
                                            <IconChevronDown className="transfer-select-icono" size={16} />
                                        </div>
                                    </div>

                                    <div className="plazo-fijo-info">
                                        <IconCalendar size={15} />
                                        <span>El dinero queda inmovilizado hasta el <strong>{fechaVencimiento}</strong>, fecha de vencimiento.</span>
                                    </div>

                                    {error && <div className="transfer-error">{error}</div>}

                                    <div className="transfer-modal-botones">
                                        <button type="button" className="transfer-btn-cancelar" onClick={resetearYCerrar}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="transfer-btn-continuar" disabled={enviando}>
                                            {enviando ? 'Procesando...' : (<><IconPercent size={15} /> Constituir plazo fijo</>)}
                                        </button>
                                    </div>
                                </form>

                                <div className="transfer-resumen-col">
                                    <div className="transfer-resumen-card">
                                        <p className="transfer-resumen-label">Vas a invertir</p>
                                        <p className="transfer-resumen-monto">$ {formatearMonto(montoNumero)}</p>

                                        <p className="transfer-resumen-detalle-motivo">{plazo.dias} días · TNA {plazo.tna}%</p>

                                        <div className="transfer-resumen-divisor" />

                                        <div className="transfer-resumen-fila">
                                            <span>Interés estimado</span>
                                            <span>+$ {formatearMonto(interesEstimado)}</span>
                                        </div>
                                        <div className="transfer-resumen-fila destacado">
                                            <span>Total al vencimiento</span>
                                            <span>$ {formatearMonto(totalAlVencimiento)}</span>
                                        </div>

                                        <div className="transfer-resumen-divisor" />

                                        <div className="transfer-resumen-fila">
                                            <span>Fecha de vencimiento</span>
                                            <span>{fechaVencimiento}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </>
                    )}

                    {paso === 'exito' && (
                        <div className="transfer-exito-page">
                            <div className="transfer-exito-icono">
                                <IconCheck size={30} />
                            </div>
                            <h1 className="transfer-page-titulo">¡Plazo fijo constituido!</h1>
                            <p className="transfer-exito-texto">
                                Invertiste <strong>$ {formatearMonto(montoNumero)}</strong> a <strong>{plazo.dias} días</strong> con una TNA del <strong>{plazo.tna}%</strong>
                            </p>
                            <p className="transfer-exito-concepto">Cobrás $ {formatearMonto(totalAlVencimiento)} el {fechaVencimiento}</p>
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

export default PlazoFijoModal;
