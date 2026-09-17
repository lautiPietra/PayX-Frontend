import { useState, useEffect } from 'react';
import { IconX, IconArrowLeft, IconCheck, IconWallet, IconRefreshCw } from './icons/Icons';
import { obtenerCotizacionDolar } from '../services/cotizacionService';
import { crearCambioDolares } from '../services/cambioDolaresService';
import CotizacionTicker from './CotizacionTicker';
import './TransferModal.css';
import './CambioDolaresModal.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Pantalla completa para comprar o vender dolares. "config" define si es compra o
// venta, los simbolos de cada lado de la operacion, el saldo disponible (en la
// moneda que se entrega) y los textos. La cotizacion ya NO se recibe por config:
// se pide al backend (cotizacion oficial real, cacheada ahi) al abrir el modal y
// se refresca cada 3s mientras este abierto -para que el ticker se sienta en vivo
// y no se opere con un precio viejo si el usuario lo deja abierto un rato largo-,
// bien por debajo del limite de 30/min del endpoint (el resto del trafico normal,
// como el polling de Home, deja margen de sobra).
function CambioDolaresModal({ abierto, onCerrar, config, onExito }) {
    const [paso, setPaso] = useState('form'); // 'form' | 'exito'
    const [cotizacion, setCotizacion] = useState(null);
    const [cargandoCotizacion, setCargandoCotizacion] = useState(false);
    const [monto, setMonto] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null);

    const esCompra = config.tipo === 'compra';
    const IconOperacion = config.IconBoton;

    useEffect(() => {
        if (!abierto) return;
        setCargandoCotizacion(true);
        obtenerCotizacionDolar()
            .then(setCotizacion)
            .catch(() => setError('No pudimos obtener la cotización del dólar. Probá de nuevo en un momento.'))
            .finally(() => setCargandoCotizacion(false));
    }, [abierto]);

    useEffect(() => {
        if (!abierto) return;
        const intervalo = setInterval(() => {
            obtenerCotizacionDolar().then(setCotizacion).catch(() => {});
        }, 3000);
        return () => clearInterval(intervalo);
    }, [abierto]);

    if (!abierto) return null;

    const precioAplicado = cotizacion ? Number(esCompra ? cotizacion.venta : cotizacion.compra) : null;
    const montoEntrada = parseFloat(monto) || 0;
    const montoSalida = precioAplicado ? (esCompra ? montoEntrada / precioAplicado : montoEntrada * precioAplicado) : 0;
    const saldoRestante = config.saldoDisponible - montoEntrada;

    function resetearYCerrar() {
        onCerrar();
        setTimeout(() => {
            setPaso('form');
            setMonto('');
            setError('');
            setEnviando(false);
            setResultado(null);
        }, 200);
    }

    function usarTodoElSaldo() {
        setMonto(String(config.saldoDisponible));
        setError('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!precioAplicado) {
            setError('Todavía no tenemos la cotización disponible.');
            return;
        }
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
        try {
            const creado = await crearCambioDolares({
                tipo: esCompra ? 'COMPRA' : 'VENTA',
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
                            <CotizacionTicker cotizacion={cotizacion} />
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
                                        {montoEntrada > 0 && precioAplicado && (
                                            <p className="transfer-equivalente">
                                                ≈ {config.simboloSalida} {formatearMonto(montoSalida)} al tipo de cambio actual
                                            </p>
                                        )}
                                    </div>

                                    <div className="cambio-dolares-info">
                                        <IconRefreshCw size={15} />
                                        {precioAplicado ? (
                                            <span>
                                                Cotización de {esCompra ? 'venta' : 'compra'}: <strong>$ {formatearMonto(precioAplicado)}</strong> por dólar (oficial)
                                                {cotizacion?.desactualizada && ' · sin poder actualizar en este momento'}
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
                                        <button type="submit" className="transfer-btn-continuar" disabled={enviando || !precioAplicado}>
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
                                            <span>{precioAplicado ? `$ ${formatearMonto(precioAplicado)}` : '-'}</span>
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

                    {paso === 'exito' && resultado && (
                        <div className="transfer-exito-page">
                            <div className="transfer-exito-icono">
                                <IconCheck size={30} />
                            </div>
                            <h1 className="transfer-page-titulo">{config.tituloExito}</h1>
                            <p className="transfer-exito-texto">
                                {esCompra ? (
                                    <>Compraste <strong>US$ {formatearMonto(resultado.montoUsd)}</strong> pagando <strong>$ {formatearMonto(resultado.montoPesos)}</strong></>
                                ) : (
                                    <>Vendiste <strong>US$ {formatearMonto(resultado.montoUsd)}</strong> y recibiste <strong>$ {formatearMonto(resultado.montoPesos)}</strong></>
                                )}
                            </p>
                            <p className="transfer-exito-concepto">Cotización $ {formatearMonto(resultado.cotizacion)} por dólar</p>
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
