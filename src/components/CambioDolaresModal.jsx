import { useState } from 'react';
import { IconX, IconArrowLeft, IconCheck, IconWallet, IconRefreshCw } from './icons/Icons';
import './TransferModal.css';
import './CambioDolaresModal.css';

function formatearMonto(valor) {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Pantalla completa para comprar o vender dolares. "config" define si es compra o venta,
// los simbolos de cada lado de la operacion, el saldo disponible (en la moneda que se
// entrega) y la cotizacion aplicada. No hay backend de cambio de divisas todavia:
// la operacion es una simulacion, igual que las transferencias y el plazo fijo.
function CambioDolaresModal({ abierto, onCerrar, config }) {
    const [paso, setPaso] = useState('form'); // 'form' | 'exito'
    const [monto, setMonto] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    if (!abierto) return null;

    const esCompra = config.tipo === 'compra';
    const IconOperacion = config.IconBoton;
    const montoEntrada = parseFloat(monto) || 0;
    const montoSalida = esCompra ? montoEntrada / config.cotizacion : montoEntrada * config.cotizacion;
    const saldoRestante = config.saldoDisponible - montoEntrada;

    function resetearYCerrar() {
        onCerrar();
        setTimeout(() => {
            setPaso('form');
            setMonto('');
            setError('');
            setEnviando(false);
        }, 200);
    }

    function usarTodoElSaldo() {
        setMonto(String(config.saldoDisponible));
        setError('');
    }

    function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (montoEntrada <= 0) {
            setError('Ingresá un monto válido.');
            return;
        }
        if (montoEntrada > config.saldoDisponible) {
            setError(esCompra
                ? 'No tenés saldo en pesos suficiente para esta compra.'
                : 'No tenés dólares suficientes para esta venta.');
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
                            <h1 className="transfer-page-titulo">{config.titulo}</h1>
                            <p className="transfer-page-subtitulo">{config.subtitulo}</p>

                            <div className="transfer-page-grid">

                                <form onSubmit={handleSubmit} className="transfer-form-col" noValidate>

                                    <div className="transfer-modal-saldo">
                                        <span className="transfer-modal-saldo-icono"><IconWallet size={16} /></span>
                                        <span>{config.labelSaldo}</span>
                                        <strong>{config.simboloEntrada} {formatearMonto(config.saldoDisponible)}</strong>
                                    </div>

                                    <div className="transfer-campo">
                                        <label>{config.labelInput}</label>
                                        <div className="transfer-monto-group">
                                            <span className="transfer-monto-simbolo">{config.simboloEntrada}</span>
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
                                        {montoEntrada > 0 && (
                                            <p className="transfer-equivalente">
                                                ≈ {config.simboloSalida} {formatearMonto(montoSalida)} al tipo de cambio actual
                                            </p>
                                        )}
                                    </div>

                                    <div className="cambio-dolares-info">
                                        <IconRefreshCw size={15} />
                                        <span>Cotización de {esCompra ? 'compra' : 'venta'}: <strong>$ {formatearMonto(config.cotizacion)}</strong> por dólar.</span>
                                    </div>

                                    {error && <div className="transfer-error">{error}</div>}

                                    <div className="transfer-modal-botones">
                                        <button type="button" className="transfer-btn-cancelar" onClick={resetearYCerrar}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="transfer-btn-continuar" disabled={enviando}>
                                            {enviando ? 'Procesando...' : (<><IconOperacion size={15} /> {config.tituloBoton}</>)}
                                        </button>
                                    </div>
                                </form>

                                <div className="transfer-resumen-col">
                                    <div className="transfer-resumen-card">
                                        <p className="transfer-resumen-label">{config.labelResumenEntrada}</p>
                                        <p className="transfer-resumen-monto">{config.simboloEntrada} {formatearMonto(montoEntrada)}</p>

                                        <p className="transfer-resumen-detalle-motivo">
                                            {config.labelResumenSalida} {config.simboloSalida} {formatearMonto(montoSalida)}
                                        </p>

                                        <div className="transfer-resumen-divisor" />

                                        <div className="transfer-resumen-fila">
                                            <span>Cotización</span>
                                            <span>$ {formatearMonto(config.cotizacion)}</span>
                                        </div>
                                        <div className="transfer-resumen-fila">
                                            <span>{config.labelSaldo}</span>
                                            <span>{config.simboloEntrada} {formatearMonto(config.saldoDisponible)}</span>
                                        </div>
                                        <div className={`transfer-resumen-fila destacado ${saldoRestante < 0 ? 'negativo' : ''}`}>
                                            <span>Saldo luego de la operación</span>
                                            <span>{config.simboloEntrada} {formatearMonto(saldoRestante)}</span>
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
                            <h1 className="transfer-page-titulo">{config.tituloExito}</h1>
                            <p className="transfer-exito-texto">
                                {esCompra ? (
                                    <>Compraste <strong>{config.simboloSalida} {formatearMonto(montoSalida)}</strong> pagando <strong>{config.simboloEntrada} {formatearMonto(montoEntrada)}</strong></>
                                ) : (
                                    <>Vendiste <strong>{config.simboloEntrada} {formatearMonto(montoEntrada)}</strong> y recibiste <strong>{config.simboloSalida} {formatearMonto(montoSalida)}</strong></>
                                )}
                            </p>
                            <p className="transfer-exito-concepto">Cotización $ {formatearMonto(config.cotizacion)} por dólar</p>
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

export default CambioDolaresModal;
