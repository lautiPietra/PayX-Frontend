import { useState, useEffect } from 'react';
import { IconX, IconArrowLeft, IconCheck, IconWallet, IconChevronDown, IconCalendar, IconPercent, IconFileText } from './icons/Icons';
import { obtenerTasasPlazoFijo, crearPlazoFijo } from '../services/plazoFijoService';
import './TransferModal.css';
import './PlazoFijoModal.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// El backend manda fechas puras "yyyy-MM-dd" (sin hora): parsearlas con
// `new Date(str)` las interpreta como medianoche UTC, y en un huso horario
// negativo (Argentina, UTC-3) `toLocaleDateString` puede mostrar un día antes
// del que corresponde. Se arma la fecha en horario local a mano para evitarlo.
function crearFechaLocal(fechaIso) {
    const soloFecha = fechaIso.split('T')[0];
    const [anio, mes, dia] = soloFecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
}

function formatearFecha(fecha) {
    const d = fecha instanceof Date ? fecha : crearFechaLocal(fecha);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fechaVencimientoEstimada(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha;
}

// Pantalla completa para constituir un plazo fijo. Las tasas y el monto minimo
// vienen del backend (no se hardcodean aca): es la unica fuente de verdad para el
// calculo de interes real que se acredita al vencimiento. "onVerMisPlazosFijos"
// abre el modal con el listado de plazos fijos ya constituidos.
function PlazoFijoModal({ abierto, onCerrar, saldoDisponible, onExito, onVerMisPlazosFijos }) {
    const [paso, setPaso] = useState('form'); // 'form' | 'exito'
    const [tasas, setTasas] = useState([]);
    const [montoMinimo, setMontoMinimo] = useState(0);
    const [monto, setMonto] = useState('');
    const [plazoDias, setPlazoDias] = useState('');
    const [error, setError] = useState('');
    const [cargandoTasas, setCargandoTasas] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        if (!abierto) return;
        setCargandoTasas(true);
        obtenerTasasPlazoFijo()
            .then((data) => {
                setTasas(data.tasas);
                setMontoMinimo(Number(data.montoMinimo));
                if (data.tasas.length > 0) {
                    setPlazoDias((actual) => actual || String(data.tasas[0].dias));
                }
            })
            .catch(() => setError('No pudimos cargar las tasas disponibles. Probá de nuevo en un momento.'))
            .finally(() => setCargandoTasas(false));
    }, [abierto]);

    if (!abierto) return null;

    const plazo = tasas.find((p) => p.dias === Number(plazoDias));
    const montoNumero = parseFloat(monto) || 0;
    const interesEstimado = plazo ? montoNumero * (Number(plazo.tna) / 100) * (plazo.dias / 365) : 0;
    const totalAlVencimiento = montoNumero + interesEstimado;
    const fechaVencimiento = plazo ? formatearFecha(fechaVencimientoEstimada(plazo.dias)) : '';

    function resetearYCerrar() {
        onCerrar();
        setTimeout(() => {
            setPaso('form');
            setMonto('');
            setPlazoDias('');
            setError('');
            setEnviando(false);
            setResultado(null);
        }, 200);
    }

    function usarTodoElSaldo() {
        setMonto(String(saldoDisponible));
        setError('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!plazo) {
            setError('Elegí un plazo válido.');
            return;
        }
        if (montoNumero <= 0) {
            setError('Ingresá un monto válido.');
            return;
        }
        if (montoNumero < montoMinimo) {
            setError(`El monto mínimo para constituir un plazo fijo es $ ${formatearMonto(montoMinimo)}.`);
            return;
        }
        if (montoNumero > saldoDisponible) {
            setError('No tenés saldo suficiente para esta inversión.');
            return;
        }

        setEnviando(true);
        try {
            const creado = await crearPlazoFijo({ monto: montoNumero, plazoDias: plazo.dias });
            setResultado(creado);
            setPaso('exito');
            onExito?.();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo constituir el plazo fijo. Intenta de nuevo.');
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
                            <div className="plazo-fijo-titulo-fila">
                                <div>
                                    <h1 className="transfer-page-titulo">Constituir un plazo fijo</h1>
                                    <p className="transfer-page-subtitulo">Elegí cuánto querés invertir y por cuánto tiempo</p>
                                </div>
                                {onVerMisPlazosFijos && (
                                    <button type="button" className="plazo-fijo-link-mis" onClick={onVerMisPlazosFijos}>
                                        <IconFileText size={14} /> Ver mis plazos fijos
                                    </button>
                                )}
                            </div>

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
                                            <select
                                                value={plazoDias}
                                                onChange={(e) => setPlazoDias(e.target.value)}
                                                disabled={cargandoTasas || tasas.length === 0}
                                            >
                                                {tasas.length === 0 && <option value="">Cargando plazos...</option>}
                                                {tasas.map((p) => (
                                                    <option key={p.dias} value={p.dias}>
                                                        {p.dias} días · TNA {p.tna}%
                                                    </option>
                                                ))}
                                            </select>
                                            <IconChevronDown className="transfer-select-icono" size={16} />
                                        </div>
                                    </div>

                                    {plazo && (
                                        <div className="plazo-fijo-info">
                                            <IconCalendar size={15} />
                                            <span>El dinero queda inmovilizado hasta el <strong>{fechaVencimiento}</strong>. Ese día se acredita solo, junto con el interés.</span>
                                        </div>
                                    )}

                                    {error && <div className="transfer-error">{error}</div>}

                                    <div className="transfer-modal-botones">
                                        <button type="button" className="transfer-btn-cancelar" onClick={resetearYCerrar}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="transfer-btn-continuar" disabled={enviando || cargandoTasas || !plazo}>
                                            {enviando ? 'Procesando...' : (<><IconPercent size={15} /> Constituir plazo fijo</>)}
                                        </button>
                                    </div>
                                </form>

                                <div className="transfer-resumen-col">
                                    <div className="transfer-resumen-card">
                                        <p className="transfer-resumen-label">Vas a invertir</p>
                                        <p className="transfer-resumen-monto">$ {formatearMonto(montoNumero)}</p>

                                        {plazo && <p className="transfer-resumen-detalle-motivo">{plazo.dias} días · TNA {plazo.tna}%</p>}

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

                    {paso === 'exito' && resultado && (
                        <div className="transfer-exito-page">
                            <div className="transfer-exito-icono">
                                <IconCheck size={30} />
                            </div>
                            <h1 className="transfer-page-titulo">¡Plazo fijo constituido!</h1>
                            <p className="transfer-exito-texto">
                                Invertiste <strong>$ {formatearMonto(resultado.monto)}</strong> a <strong>{resultado.plazoDias} días</strong> con una TNA del <strong>{Number(resultado.tna)}%</strong>
                            </p>
                            <p className="transfer-exito-concepto">
                                Cobrás $ {formatearMonto(resultado.montoTotal)} el {formatearFecha(resultado.fechaVencimiento)}, sin que tengas que hacer nada
                            </p>
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
