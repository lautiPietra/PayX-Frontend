import { useState } from 'react';
import { IconX, IconArrowLeft, IconCheck, IconWallet, IconChevronDown, IconCoins, IconRefreshCw } from './icons/Icons';
import './TransferModal.css';
import './CriptoModal.css';

// Datos de ejemplo: no hay backend de criptomonedas todavia, ni endpoint de cotizaciones
// ni de tenencias. Los precios y las tenencias son solo para mostrar el diseño.
const CRIPTOS = [
    { key: 'BTC', nombre: 'Bitcoin', precioCompra: 94800000, precioVenta: 93200000, tenencia: 0.00050000, decimales: 8 },
    { key: 'ETH', nombre: 'Ethereum', precioCompra: 3180000, precioVenta: 3110000, tenencia: 0.012000, decimales: 6 },
    { key: 'SOL', nombre: 'Solana', precioCompra: 212000, precioVenta: 205000, tenencia: 6.500, decimales: 3 },
];

function formatearNumero(valor, decimales) {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

// Pantalla completa para comprar o vender criptomonedas (BTC, ETH o SOL).
// "tipo" define si es compra (se paga en pesos) o venta (se entrega la cripto elegida).
// Es una simulacion, igual que el resto de las operaciones: no hay backend real todavia.
function CriptoModal({ abierto, onCerrar, tipo, saldoPesos }) {
    const [paso, setPaso] = useState('form'); // 'form' | 'exito'
    const [monedaKey, setMonedaKey] = useState('BTC');
    const [monto, setMonto] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    if (!abierto) return null;

    const esCompra = tipo === 'compra';
    const cripto = CRIPTOS.find((c) => c.key === monedaKey);
    const precio = esCompra ? cripto.precioCompra : cripto.precioVenta;

    const simboloEntrada = esCompra ? '$' : cripto.key;
    const simboloSalida = esCompra ? cripto.key : '$';
    const decimalesEntrada = esCompra ? 2 : cripto.decimales;
    const decimalesSalida = esCompra ? cripto.decimales : 2;
    const saldoDisponibleEntrada = esCompra ? saldoPesos : cripto.tenencia;

    const montoEntrada = parseFloat(monto) || 0;
    const montoSalida = esCompra ? montoEntrada / precio : montoEntrada * precio;
    const saldoRestante = saldoDisponibleEntrada - montoEntrada;

    function resetearYCerrar() {
        onCerrar();
        setTimeout(() => {
            setPaso('form');
            setMonedaKey('BTC');
            setMonto('');
            setError('');
            setEnviando(false);
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

    function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (montoEntrada <= 0) {
            setError('Ingresá un monto válido.');
            return;
        }
        if (montoEntrada > saldoDisponibleEntrada) {
            setError(esCompra
                ? 'No tenés saldo en pesos suficiente para esta compra.'
                : `No tenés suficiente ${cripto.key} para esta venta.`);
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
                                                {CRIPTOS.map((c) => (
                                                    <option key={c.key} value={c.key}>
                                                        {c.nombre} ({c.key}) · $ {formatearNumero(esCompra ? c.precioCompra : c.precioVenta, 0)}
                                                    </option>
                                                ))}
                                            </select>
                                            <IconChevronDown className="transfer-select-icono" size={16} />
                                        </div>
                                    </div>

                                    <div className="transfer-modal-saldo">
                                        <span className="transfer-modal-saldo-icono"><IconWallet size={16} /></span>
                                        <span>{esCompra ? 'Saldo disponible en pesos' : `Saldo disponible de ${cripto.key}`}</span>
                                        <strong>{simboloEntrada} {formatearNumero(saldoDisponibleEntrada, decimalesEntrada)}</strong>
                                    </div>

                                    <div className="transfer-campo">
                                        <label>{esCompra ? 'Monto en pesos a destinar' : `Monto de ${cripto.key} a vender`}</label>
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
                                        {montoEntrada > 0 && (
                                            <p className="transfer-equivalente">
                                                ≈ {simboloSalida} {formatearNumero(montoSalida, decimalesSalida)} al tipo de cambio actual
                                            </p>
                                        )}
                                    </div>

                                    <div className="cripto-info">
                                        <IconRefreshCw size={15} />
                                        <span>Cotización de {esCompra ? 'compra' : 'venta'} de {cripto.nombre}: <strong>$ {formatearNumero(precio, 0)}</strong>.</span>
                                    </div>

                                    {error && <div className="transfer-error">{error}</div>}

                                    <div className="transfer-modal-botones">
                                        <button type="button" className="transfer-btn-cancelar" onClick={resetearYCerrar}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="transfer-btn-continuar" disabled={enviando}>
                                            {enviando ? 'Procesando...' : (<><IconCoins size={15} /> {esCompra ? 'Comprar' : 'Vender'} {cripto.key}</>)}
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
                                            <span>Cotización {cripto.key}</span>
                                            <span>$ {formatearNumero(precio, 0)}</span>
                                        </div>
                                        <div className="transfer-resumen-fila">
                                            <span>{esCompra ? 'Saldo en pesos' : `Saldo en ${cripto.key}`}</span>
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

                    {paso === 'exito' && (
                        <div className="transfer-exito-page">
                            <div className="transfer-exito-icono">
                                <IconCheck size={30} />
                            </div>
                            <h1 className="transfer-page-titulo">{esCompra ? '¡Compra realizada!' : '¡Venta realizada!'}</h1>
                            <p className="transfer-exito-texto">
                                {esCompra ? (
                                    <>Compraste <strong>{simboloSalida} {formatearNumero(montoSalida, decimalesSalida)}</strong> pagando <strong>{simboloEntrada} {formatearNumero(montoEntrada, decimalesEntrada)}</strong></>
                                ) : (
                                    <>Vendiste <strong>{simboloEntrada} {formatearNumero(montoEntrada, decimalesEntrada)}</strong> y recibiste <strong>{simboloSalida} {formatearNumero(montoSalida, decimalesSalida)}</strong></>
                                )}
                            </p>
                            <p className="transfer-exito-concepto">Cotización $ {formatearNumero(precio, 0)} por {cripto.key}</p>
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
