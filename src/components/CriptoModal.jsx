import { useState, useEffect } from 'react';
import { IconX, IconArrowLeft, IconCheck, IconWallet, IconChevronDown, IconCoins, IconRefreshCw } from './icons/Icons';
import { obtenerCotizacionesCripto } from '../services/cotizacionCriptoService';
import { crearOperacionCripto } from '../services/criptoService';
import CriptoTicker from './CriptoTicker';
import './TransferModal.css';
import './CriptoModal.css';

const CRIPTOS_DISPONIBLES = ['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP'];
const NOMBRES = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', USDT: 'Tether', BNB: 'BNB', XRP: 'XRP' };
const SALDO_KEY = { BTC: 'saldoBtc', ETH: 'saldoEth', SOL: 'saldoSolana', USDT: 'saldoUsdt', BNB: 'saldoBnb', XRP: 'saldoXrp' };

function formatearNumero(valor, decimales) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

function saldoCriptoDe(perfil, simbolo) {
    return Number(perfil?.[SALDO_KEY[simbolo]] ?? 0);
}

// Pantalla completa para comprar o vender criptomonedas (BTC, ETH o SOL) contra el
// backend real: pide la cotizacion en vivo al abrirse y la refresca cada 3s
// mientras esta abierto (para que el ticker se sienta en vivo, bien por debajo del
// limite de 30/min del endpoint), y opera siempre con ese mismo precio de mercado
// -no hay un precio de compra y otro de venta como en el dolar oficial-.
function CriptoModal({ abierto, onCerrar, tipo, perfil, onExito }) {
    const [paso, setPaso] = useState('form'); // 'form' | 'exito'
    const [cotizaciones, setCotizaciones] = useState([]);
    const [cargandoCotizacion, setCargandoCotizacion] = useState(false);
    const [monedaKey, setMonedaKey] = useState('BTC');
    const [monto, setMonto] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null);

    const esCompra = tipo === 'compra';

    useEffect(() => {
        if (!abierto) return;
        setCargandoCotizacion(true);
        obtenerCotizacionesCripto()
            .then(setCotizaciones)
            .catch(() => setError('No pudimos obtener la cotización de las criptomonedas. Probá de nuevo en un momento.'))
            .finally(() => setCargandoCotizacion(false));
    }, [abierto]);

    useEffect(() => {
        if (!abierto) return;
        const intervalo = setInterval(() => {
            obtenerCotizacionesCripto().then(setCotizaciones).catch(() => {});
        }, 3000);
        return () => clearInterval(intervalo);
    }, [abierto]);

    if (!abierto) return null;

    const cotizacionElegida = cotizaciones.find((c) => c.simbolo === monedaKey);
    const precio = cotizacionElegida ? Number(cotizacionElegida.precio) : null;

    const simboloEntrada = esCompra ? '$' : monedaKey;
    const simboloSalida = esCompra ? monedaKey : '$';
    const decimalesEntrada = esCompra ? 2 : 8;
    const decimalesSalida = esCompra ? 8 : 2;
    const saldoDisponibleEntrada = esCompra ? Number(perfil?.saldoPesos ?? 0) : saldoCriptoDe(perfil, monedaKey);

    const montoEntrada = parseFloat(monto) || 0;
    const montoSalida = precio ? (esCompra ? montoEntrada / precio : montoEntrada * precio) : 0;
    const saldoRestante = saldoDisponibleEntrada - montoEntrada;

    function resetearYCerrar() {
        onCerrar();
        setTimeout(() => {
            setPaso('form');
            setMonedaKey('BTC');
            setMonto('');
            setError('');
            setEnviando(false);
            setResultado(null);
        }, 200);
    }

    function cambiarMoneda(key) {
        setMonedaKey(key);
        setMonto('');
        setError('');
    }

    function usarTodoElSaldo() {
        setMonto(String(saldoDisponibleEntrada));
        setError('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!precio) {
            setError('Todavía no tenemos la cotización disponible.');
            return;
        }
        if (montoEntrada <= 0) {
            setError('Ingresá un monto válido.');
            return;
        }
        if (montoEntrada > saldoDisponibleEntrada) {
            setError(esCompra
                ? 'No tenés saldo en pesos suficiente para esta compra.'
                : `No tenés suficiente ${monedaKey} para esta venta.`);
            return;
        }

        setEnviando(true);
        try {
            const creado = await crearOperacionCripto({
                tipo: esCompra ? 'COMPRA' : 'VENTA',
                simbolo: monedaKey,
                monto: montoEntrada,
            });
            setResultado(creado);
            setPaso('exito');
            onExito?.();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo realizar la operación. Intenta de nuevo.');
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
                            <CriptoTicker cotizaciones={cotizaciones} />

                            <h1 className="transfer-page-titulo">{esCompra ? 'Comprar criptomonedas' : 'Vender criptomonedas'}</h1>
                            <p className="transfer-page-subtitulo">
                                {esCompra ? 'Elegí qué criptomoneda comprar y cuánto querés invertir' : 'Elegí qué criptomoneda vender y cuánto querés recibir'}
                            </p>

                            <div className="transfer-page-grid">

                                <form onSubmit={handleSubmit} className="transfer-form-col" noValidate>

                                    <div className="transfer-campo">
                                        <label>Criptomoneda</label>
                                        <div className="transfer-select-wrapper">
                                            <select value={monedaKey} onChange={(e) => cambiarMoneda(e.target.value)}>
                                                {CRIPTOS_DISPONIBLES.map((key) => {
                                                    const c = cotizaciones.find((x) => x.simbolo === key);
                                                    return (
                                                        <option key={key} value={key}>
                                                            {NOMBRES[key]} ({key}){c ? ` · $ ${formatearNumero(c.precio, 0)}` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <IconChevronDown className="transfer-select-icono" size={16} />
                                        </div>
                                    </div>

                                    <div className="transfer-modal-saldo">
                                        <span className="transfer-modal-saldo-icono"><IconWallet size={16} /></span>
                                        <span>{esCompra ? 'Saldo disponible en pesos' : `Saldo disponible de ${monedaKey}`}</span>
                                        <strong>{simboloEntrada} {formatearNumero(saldoDisponibleEntrada, decimalesEntrada)}</strong>
                                    </div>

                                    <div className="transfer-campo">
                                        <label>{esCompra ? 'Monto en pesos a destinar' : `Monto de ${monedaKey} a vender`}</label>
                                        <div className="transfer-monto-group">
                                            <span className="transfer-monto-simbolo">{simboloEntrada}</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="any"
                                                placeholder="0"
                                                value={monto}
                                                onChange={(e) => setMonto(e.target.value)}
                                            />
                                            <button type="button" className="transfer-usar-todo" onClick={usarTodoElSaldo}>
                                                Usar todo
                                            </button>
                                        </div>
                                        {montoEntrada > 0 && precio && (
                                            <p className="transfer-equivalente">
                                                ≈ {simboloSalida} {formatearNumero(montoSalida, decimalesSalida)} al precio actual
                                            </p>
                                        )}
                                    </div>

                                    <div className="cripto-info">
                                        <IconRefreshCw size={15} />
                                        {precio ? (
                                            <span>
                                                Precio actual de {NOMBRES[monedaKey]}: <strong>$ {formatearNumero(precio, 0)}</strong>
                                                {cotizacionElegida?.desactualizada && ' · sin poder actualizar en este momento'}
                                            </span>
                                        ) : (
                                            <span>{cargandoCotizacion ? 'Buscando la cotización actual...' : 'No pudimos obtener la cotización.'}</span>
                                        )}
                                    </div>

                                    {error && <div className="transfer-error">{error}</div>}

                                    <div className="transfer-modal-botones">
                                        <button type="button" className="transfer-btn-cancelar" onClick={resetearYCerrar}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="transfer-btn-continuar" disabled={enviando || !precio}>
                                            {enviando ? 'Procesando...' : (<><IconCoins size={15} /> {esCompra ? 'Comprar' : 'Vender'} {monedaKey}</>)}
                                        </button>
                                    </div>
                                </form>

                                <div className="transfer-resumen-col">
                                    <div className="transfer-resumen-card">
                                        <p className="transfer-resumen-label">{esCompra ? 'Vas a pagar' : 'Vas a vender'}</p>
                                        <p className="transfer-resumen-monto">{simboloEntrada} {formatearNumero(montoEntrada, decimalesEntrada)}</p>

                                        <p className="transfer-resumen-detalle-motivo">
                                            Recibís {simboloSalida} {formatearNumero(montoSalida, decimalesSalida)}
                                        </p>

                                        <div className="transfer-resumen-divisor" />

                                        <div className="transfer-resumen-fila">
                                            <span>Precio {monedaKey}</span>
                                            <span>{precio ? `$ ${formatearNumero(precio, 0)}` : '-'}</span>
                                        </div>
                                        <div className="transfer-resumen-fila">
                                            <span>{esCompra ? 'Saldo en pesos' : `Saldo en ${monedaKey}`}</span>
                                            <span>{simboloEntrada} {formatearNumero(saldoDisponibleEntrada, decimalesEntrada)}</span>
                                        </div>
                                        <div className={`transfer-resumen-fila destacado ${saldoRestante < 0 ? 'negativo' : ''}`}>
                                            <span>Saldo luego de la operación</span>
                                            <span>{simboloEntrada} {formatearNumero(saldoRestante, decimalesEntrada)}</span>
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
                            <h1 className="transfer-page-titulo">{esCompra ? '¡Compra realizada!' : '¡Venta realizada!'}</h1>
                            <p className="transfer-exito-texto">
                                {esCompra ? (
                                    <>Compraste <strong>{resultado.simbolo} {formatearNumero(resultado.montoCripto, 8)}</strong> pagando <strong>$ {formatearNumero(resultado.montoPesos, 2)}</strong></>
                                ) : (
                                    <>Vendiste <strong>{formatearNumero(resultado.montoCripto, 8)} {resultado.simbolo}</strong> y recibiste <strong>$ {formatearNumero(resultado.montoPesos, 2)}</strong></>
                                )}
                            </p>
                            <p className="transfer-exito-concepto">Precio $ {formatearNumero(resultado.cotizacion, 0)} por {resultado.simbolo}</p>
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

export default CriptoModal;
