import { useState, useEffect, useCallback, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ServicioCard from '../components/ServicioCard';
import FacturaPagoModal from '../components/FacturaPagoModal';
import { IconArrowLeft } from '../components/icons/Icons';
import { TEMA_POR_SERVICIO, TEMA_DEFAULT } from '../utils/serviciosTemas';
import { obtenerPerfil } from '../services/perfilService';
import { listarServicios, listarHistorialFacturas } from '../services/facturaService';
import './Movimientos.css';
import './Servicios.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFecha(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('T')[0].split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function Servicios() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('servicios'); // 'servicios' | 'historial'
    const [servicios, setServicios] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [saldoPesos, setSaldoPesos] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [servicioAPagar, setServicioAPagar] = useState(null);

    const cargarServicios = useCallback(() => {
        return Promise.all([listarServicios(), obtenerPerfil()])
            .then(([lista, perfil]) => {
                setServicios(lista);
                setSaldoPesos(Number(perfil?.saldoPesos ?? 0));
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        cargarServicios().finally(() => setCargando(false));
    }, [cargarServicios]);

    useEffect(() => {
        if (tab !== 'historial') return;
        let cancelado = false;
        listarHistorialFacturas().then((data) => { if (!cancelado) setHistorial(data); }).catch(() => {});
        return () => { cancelado = true; };
    }, [tab]);

    // El historial trae un FacturaResponse (servicioNombre/id), no el mismo shape
    // que ServicioConFacturaResponse (nombre/facturaId) que espera el modal de pago
    // -se arma el objeto equivalente para poder pagar una factura vieja e impaga
    // sin duplicar el modal.
    function abrirPagoDesdeHistorial(f) {
        setServicioAPagar({
            servicioCodigo: f.servicioCodigo,
            nombre: f.servicioNombre,
            proveedor: '',
            facturaId: f.id,
            monto: f.monto,
        });
    }

    function alExitoDePago() {
        cargarServicios();
        if (tab === 'historial') listarHistorialFacturas().then(setHistorial).catch(() => {});
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
                        Mis servicios
                    </button>
                    <button className={`servicios-tab ${tab === 'historial' ? 'activo' : ''}`} onClick={() => setTab('historial')}>
                        Historial de pagos
                    </button>
                </div>

                {tab === 'servicios' && (
                    <>
                        {cargando && <p className="movimientos-cargando">Cargando tus servicios...</p>}
                        {!cargando && (
                            <div className="servicios-lista">
                                {servicios.map((s) => (
                                    <ServicioCard key={s.servicioCodigo} servicio={s} onPagar={setServicioAPagar} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {tab === 'historial' && (
                    <div className="servicios-historial-lista">
                        {historial.length === 0 && <p className="servicios-historial-vacio">Todavía no pagaste ningún servicio</p>}
                        {historial.map((f) => {
                            const tema = TEMA_POR_SERVICIO[f.servicioCodigo] || TEMA_DEFAULT;
                            const pagada = f.estado === 'PAGADA';
                            return (
                                <div key={f.id} className="servicios-historial-item">
                                    <span className="servicios-historial-icono" style={{ backgroundColor: tema.color }}>
                                        {createElement(tema.Icon, { size: 16 })}
                                    </span>
                                    <div className="servicios-historial-info">
                                        <p className="servicios-historial-nombre">{f.servicioNombre}</p>
                                        <p className="servicios-historial-periodo">
                                            {pagada ? `Pagada el ${formatearFecha(f.fechaPago)}` : `Período ${f.periodo}`}
                                        </p>
                                    </div>
                                    <div className="servicios-historial-derecha">
                                        <p className="servicios-historial-monto">$ {formatearMonto(f.monto)}</p>
                                        {pagada ? (
                                            <span className="servicios-historial-badge pagada">Pagada</span>
                                        ) : (
                                            <button className="servicios-historial-btn-pagar" onClick={() => abrirPagoDesdeHistorial(f)}>
                                                Pagar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
