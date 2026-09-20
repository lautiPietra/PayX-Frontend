import { useState, useEffect, useCallback, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ServicioCard from '../components/ServicioCard';
import FacturaPagoModal from '../components/FacturaPagoModal';
import { IconArrowLeft } from '../components/icons/Icons';
import { TEMA_POR_SERVICIO, TEMA_DEFAULT } from '../utils/serviciosTemas';
import { formatearDia, formatearInstante } from '../utils/fechas';
import { obtenerPerfil } from '../services/perfilService';
import { listarServicios, listarHistorialFacturas } from '../services/facturaService';
import './Movimientos.css';
import './Servicios.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const LARGO = { day: '2-digit', month: 'long', year: 'numeric' };

// "2026-08" -> "agosto de 2026"
function formatearPeriodo(periodo) {
    const [anio, mes] = periodo.split('-').map(Number);
    return new Date(anio, mes - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function FilaFactura({ factura, detalle, onPagar }) {
    const tema = TEMA_POR_SERVICIO[factura.servicioCodigo] || TEMA_DEFAULT;
    return (
        <div className="servicios-historial-item">
            <span className="servicios-historial-icono" style={{ backgroundColor: tema.color }}>
                {createElement(tema.Icon, { size: 16 })}
            </span>
            <div className="servicios-historial-info">
                <p className="servicios-historial-nombre">{factura.servicioNombre}</p>
                <p className="servicios-historial-periodo">{detalle}</p>
            </div>
            <div className="servicios-historial-derecha">
                <p className="servicios-historial-monto">$ {formatearMonto(factura.monto)}</p>
                {onPagar ? (
                    <button className="servicios-historial-btn-pagar" onClick={() => onPagar(factura)}>Pagar</button>
                ) : (
                    <span className="servicios-historial-badge pagada">Pagada</span>
                )}
            </div>
        </div>
    );
}

function Servicios() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('servicios'); // 'servicios' | 'historial'
    const [servicios, setServicios] = useState([]);
    const [facturas, setFacturas] = useState([]);
    const [saldoPesos, setSaldoPesos] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [servicioAPagar, setServicioAPagar] = useState(null);

    const cargar = useCallback(() => {
        return Promise.all([
            listarServicios(),
            obtenerPerfil(),
            // Si solo falla el listado de facturas, que igual se puedan ver y pagar los servicios del mes.
            listarHistorialFacturas().catch(() => []),
        ])
            .then(([lista, perfil, todasLasFacturas]) => {
                setServicios(lista);
                setSaldoPesos(Number(perfil?.saldoPesos ?? 0));
                setFacturas(todasLasFacturas);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        cargar().finally(() => setCargando(false));
    }, [cargar]);

    // Las facturas del mes en curso ya se ven como tarjetas en la primera pestaña, asi
    // que no se repiten en otro lado. Lo que sobra son dos cosas distintas: las de meses
    // anteriores que quedaron sin pagar (se muestran ahi mismo, para poder pagarlas) y
    // las ya pagadas (eso es el historial de pagos).
    const idsDelMes = new Set(servicios.map((s) => s.facturaId));
    const atrasadas = facturas
        .filter((f) => f.estado === 'PENDIENTE' && !idsDelMes.has(f.id))
        .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    const pagos = facturas
        .filter((f) => f.estado === 'PAGADA')
        .sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));

    // Una FacturaResponse (servicioNombre/id) no tiene el mismo shape que un
    // ServicioConFacturaResponse (nombre/facturaId), que es lo que espera el modal de
    // pago: se arma el objeto equivalente para reutilizar el mismo modal.
    function abrirPagoDeFacturaAtrasada(f) {
        setServicioAPagar({
            servicioCodigo: f.servicioCodigo,
            nombre: f.servicioNombre,
            proveedor: '',
            facturaId: f.id,
            monto: f.monto,
        });
    }

    function alExitoDePago() {
        cargar();
        window.dispatchEvent(new Event('notificaciones-actualizadas'));
    }

    return (
        <>
            <Navbar />
            <div className="movimientos-container">
                <button className="movimientos-volver" onClick={() => navigate('/inicio')}>
                    <IconArrowLeft size={16} /> Volver
                </button>

                <h1 className="movimientos-titulo">Pago de servicios</h1>
                <p className="movimientos-subtitulo">Luz, gas, agua, internet, cable y telefonía — todo en un solo lugar</p>

                <div className="servicios-tabs">
                    <button className={`servicios-tab ${tab === 'servicios' ? 'activo' : ''}`} onClick={() => setTab('servicios')}>
                        Facturas del mes
                    </button>
                    <button className={`servicios-tab ${tab === 'historial' ? 'activo' : ''}`} onClick={() => setTab('historial')}>
                        Pagos realizados
                    </button>
                </div>

                {tab === 'servicios' && (
                    <>
                        {cargando && <p className="movimientos-cargando">Cargando tus servicios...</p>}
                        {!cargando && (
                            <>
                                <div className="servicios-lista">
                                    {servicios.map((s) => (
                                        <ServicioCard key={s.servicioCodigo} servicio={s} onPagar={setServicioAPagar} />
                                    ))}
                                </div>

                                {atrasadas.length > 0 && (
                                    <>
                                        <h2 className="servicios-seccion-titulo">Facturas anteriores sin pagar</h2>
                                        <div className="servicios-historial-lista">
                                            {atrasadas.map((f) => (
                                                <FilaFactura
                                                    key={f.id}
                                                    factura={f}
                                                    detalle={`${formatearPeriodo(f.periodo)} · Venció el ${formatearDia(f.fechaVencimiento, LARGO)}`}
                                                    onPagar={abrirPagoDeFacturaAtrasada}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}

                {tab === 'historial' && (
                    <div className="servicios-historial-lista">
                        {cargando && <p className="movimientos-cargando">Cargando tus pagos...</p>}
                        {!cargando && pagos.length === 0 && <p className="servicios-historial-vacio">Todavía no pagaste ningún servicio</p>}
                        {pagos.map((f) => (
                            <FilaFactura
                                key={f.id}
                                factura={f}
                                detalle={`${formatearPeriodo(f.periodo)} · Pagada el ${formatearInstante(f.fechaPago, LARGO)}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            <FacturaPagoModal
                abierto={Boolean(servicioAPagar)}
                onCerrar={() => setServicioAPagar(null)}
                servicio={servicioAPagar}
                saldoDisponible={saldoPesos}
                onExito={alExitoDePago}
            />
        </>
    );
}

export default Servicios;
