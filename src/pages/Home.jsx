import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TransferModal from '../components/TransferModal';
import PlazoFijoModal from '../components/PlazoFijoModal';
import CambioDolaresModal from '../components/CambioDolaresModal';
import CriptoModal from '../components/CriptoModal';
import ActividadItem from '../components/ActividadItem';
import TransferenciaDetalleModal from '../components/TransferenciaDetalleModal';
import { obtenerPerfil } from '../services/perfilService';
import { listarTransferencias } from '../services/transferenciaService';
import {
    IconSend, IconQrCode, IconPiggyBank,
    IconDollarSign, IconArrowDownCircle, IconArrowUpCircle, IconCoins,
    IconCreditCard, IconTrendingUp, IconEye, IconEyeOff
} from '../components/icons/Icons';
import './Home.css';

// Cotizaciones de ejemplo, tampoco hay un endpoint de cotizaciones todavia.
// Se simula un spread: comprar dolares sale mas caro que lo que se recibe al venderlos.
const COTIZACION_USD = 1250;
const COTIZACION_COMPRA_USD = 1265;
const COTIZACION_VENTA_USD = 1235;

// Cripto todavia no tiene backend (ni saldo ni compra/venta reales): sigue siendo mock.
const SALDO_CRIPTO_MOCK = { saldo: 5310.00, rendimiento: 612.75 };

const ACCIONES_GENERALES = [
    { label: 'Transferir', Icon: IconSend, accion: 'transferir-pesos' },
    { label: 'Transferencia en dólares', Icon: IconDollarSign, accion: 'transferir-dolares' },
    { label: 'Pagar con QR', Icon: IconQrCode },
    { label: 'Tarjeta virtual', Icon: IconCreditCard },
];

const ACCIONES_INVERSION = [
    { label: 'Plazos fijos', Icon: IconPiggyBank, accion: 'plazo-fijo' },
    { label: 'Comprar dólares', Icon: IconArrowDownCircle, accion: 'comprar-dolares' },
    { label: 'Vender dólares', Icon: IconArrowUpCircle, accion: 'vender-dolares' },
    { label: 'Comprar criptomonedas', Icon: IconCoins, accion: 'comprar-cripto' },
    { label: 'Vender criptomonedas', Icon: IconCoins, accion: 'vender-cripto' },
];

function formatearMonto(valor) {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Home() {
    const navigate = useNavigate();
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const primerNombre = usuario.nombreCompleto?.split(' ')[0] || 'de nuevo';

    const [perfil, setPerfil] = useState(null);
    const [transferencias, setTransferencias] = useState([]);
    const [detalleActivo, setDetalleActivo] = useState(null);

    const [monedaActiva, setMonedaActiva] = useState('pesos');
    const [saldoVisible, setSaldoVisible] = useState(true);
    const [saldoAnimado, setSaldoAnimado] = useState(0);
    const [aviso, setAviso] = useState(null);
    const avisoTimeoutRef = useRef(null);
    const [modalActivo, setModalActivo] = useState(null); // null | 'pesos' | 'dolares'
    const [plazoFijoAbierto, setPlazoFijoAbierto] = useState(false);
    const [cambioDolaresActivo, setCambioDolaresActivo] = useState(null); // null | 'compra' | 'venta'
    const [cambioCriptoActivo, setCambioCriptoActivo] = useState(null); // null | 'compra' | 'venta'

    const saldoPesos = Number(perfil?.saldoPesos ?? 0);
    const saldoDolares = Number(perfil?.saldoUsd ?? 0);

    const MONEDAS = [
        { key: 'pesos', label: 'Pesos', simbolo: '$', saldo: saldoPesos },
        { key: 'dolares', label: 'Dólares', simbolo: 'US$', saldo: saldoDolares },
        { key: 'cripto', label: 'Cripto', simbolo: '$', ...SALDO_CRIPTO_MOCK },
    ];
    const monedaData = MONEDAS.find((m) => m.key === monedaActiva);

    const configModalPesos = {
        titulo: 'Transferir dinero',
        simbolo: '$',
        saldo: saldoPesos,
        moneda: 'PESOS',
        placeholderDestinatario: 'CVU, alias o @usuario',
        mostrarEquivalente: false,
    };

    const configModalDolares = {
        titulo: 'Transferencia en dólares',
        simbolo: 'US$',
        saldo: saldoDolares,
        moneda: 'USD',
        placeholderDestinatario: 'CVU, alias o @usuario',
        mostrarEquivalente: true,
        cotizacion: COTIZACION_USD,
    };

    const configComprarDolares = {
        tipo: 'compra',
        titulo: 'Comprar dólares',
        subtitulo: 'Comprá dólares al instante con el saldo de tu cuenta en pesos',
        simboloEntrada: '$',
        simboloSalida: 'US$',
        saldoDisponible: saldoPesos,
        cotizacion: COTIZACION_COMPRA_USD,
        labelSaldo: 'Saldo disponible en pesos',
        labelInput: 'Monto en pesos a destinar',
        labelResumenEntrada: 'Vas a pagar',
        labelResumenSalida: 'Recibís',
        tituloBoton: 'Comprar dólares',
        tituloExito: '¡Compra realizada!',
        IconBoton: IconArrowDownCircle,
    };

    const configVenderDolares = {
        tipo: 'venta',
        titulo: 'Vender dólares',
        subtitulo: 'Vendé tus dólares y recibí el dinero al instante en tu cuenta en pesos',
        simboloEntrada: 'US$',
        simboloSalida: '$',
        saldoDisponible: saldoDolares,
        cotizacion: COTIZACION_VENTA_USD,
        labelSaldo: 'Saldo disponible en dólares',
        labelInput: 'Monto de dólares a vender',
        labelResumenEntrada: 'Vas a vender',
        labelResumenSalida: 'Recibís',
        tituloBoton: 'Vender dólares',
        tituloExito: '¡Venta realizada!',
        IconBoton: IconArrowUpCircle,
    };

    const cargarPerfil = async () => {
        try {
            const datos = await obtenerPerfil();
            setPerfil(datos);
        } catch {
            // si falla, se mantiene el ultimo saldo conocido (o 0 la primera vez)
        }
    };

    const cargarTransferencias = async () => {
        try {
            const datos = await listarTransferencias();
            setTransferencias(datos);
        } catch {
            // si falla, se muestra la lista vacia
        }
    };

    const cargarDatosTrasTransferencia = () => {
        cargarPerfil();
        cargarTransferencias();
    };

    // Carga inicial de saldo real (pesos/dolares) y de las transferencias del usuario
    useEffect(() => {
        obtenerPerfil().then(setPerfil).catch(() => {});
        listarTransferencias().then(setTransferencias).catch(() => {});
    }, []);

    // Animacion de conteo del saldo al montar o cambiar de moneda
    useEffect(() => {
        let frame;
        const duracion = 700;
        const inicio = performance.now();
        const desde = 0;
        const hasta = monedaData.saldo;

        function tick(ahora) {
            const progreso = Math.min((ahora - inicio) / duracion, 1);
            const facil = 1 - Math.pow(1 - progreso, 3);
            setSaldoAnimado(desde + (hasta - desde) * facil);
            if (progreso < 1) frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [monedaActiva, monedaData.saldo]);

    const mostrarProximamente = () => {
        setAviso('Esta función va a estar disponible próximamente.');
        clearTimeout(avisoTimeoutRef.current);
        avisoTimeoutRef.current = setTimeout(() => setAviso(null), 2600);
    };

    const manejarAccion = (accion) => {
        if (accion === 'transferir-pesos') { setModalActivo('pesos'); return; }
        if (accion === 'transferir-dolares') { setModalActivo('dolares'); return; }
        if (accion === 'plazo-fijo') { setPlazoFijoAbierto(true); return; }
        if (accion === 'comprar-dolares') { setCambioDolaresActivo('compra'); return; }
        if (accion === 'vender-dolares') { setCambioDolaresActivo('venta'); return; }
        if (accion === 'comprar-cripto') { setCambioCriptoActivo('compra'); return; }
        if (accion === 'vender-cripto') { setCambioCriptoActivo('venta'); return; }
        mostrarProximamente();
    };

    const manejarTransferenciaActualizada = (actualizada) => {
        setTransferencias((prev) => prev.map((t) => (t.id === actualizada.id ? actualizada : t)));
        setDetalleActivo(actualizada);
        cargarPerfil(); // confirmar una pendiente mueve plata: refrescamos el saldo
    };

    useEffect(() => () => clearTimeout(avisoTimeoutRef.current), []);

    return (
        <>
            <Navbar />
            <div className="home-container">

                <div className="home-saludo">
                    <h1 className="home-titulo">Hola, {primerNombre}</h1>
                    <p className="home-subtitulo">Este es el resumen de tu cuenta PayX</p>
                </div>

                <div className="home-grid-principal">

                    {/* Card de saldo */}
                    <div className="home-card-saldo">
                        <div className="home-tabs-moneda">
                            {MONEDAS.map((m) => (
                                <button
                                    key={m.key}
                                    className={`home-tab-moneda ${monedaActiva === m.key ? 'activo' : ''}`}
                                    onClick={() => setMonedaActiva(m.key)}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <div className="home-saldo-fila">
                            <div className="home-saldo-monto">
                                <span className="home-saldo-simbolo">{monedaData.simbolo}</span>
                                <span className="home-saldo-numero">
                                    {saldoVisible ? formatearMonto(saldoAnimado) : '••••••'}
                                </span>
                                <button
                                    className="home-saldo-toggle"
                                    onClick={() => setSaldoVisible(!saldoVisible)}
                                    aria-label={saldoVisible ? 'Ocultar saldo' : 'Mostrar saldo'}
                                >
                                    {saldoVisible ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                                </button>
                            </div>

                            <div className="home-botones-principales">
                                <button className="home-btn-primario" onClick={() => setModalActivo('pesos')}>
                                    <IconSend size={16} /> Transferir
                                </button>
                                <button className="home-btn-secundario" onClick={() => navigate('/movimientos')}>
                                    Ver movimientos
                                </button>
                            </div>
                        </div>

                        {saldoVisible && monedaData.rendimiento != null && (
                            <p className="home-rendimiento">
                                Rindió <strong>{monedaData.simbolo} {formatearMonto(monedaData.rendimiento)}</strong> en los últimos 12 meses
                            </p>
                        )}
                    </div>

                    {/* Card promocional */}
                    <div className="home-card-promo">
                        <div className="home-promo-icono"><IconTrendingUp size={20} /></div>
                        <h3 className="home-promo-titulo">Hacé rendir tu dinero</h3>
                        <p className="home-promo-texto">
                            Invertí el saldo de tu cuenta y generá rendimientos todos los días, sin plazos ni mínimos.
                        </p>
                        <button className="home-btn-promo" onClick={mostrarProximamente}>
                            Quiero invertir
                        </button>
                    </div>
                </div>

                {/* Acciones rapidas */}
                <h2 className="home-seccion-titulo">Qué querés hacer</h2>
                <div className="home-acciones-grid">
                    {ACCIONES_GENERALES.map((accion, i) => (
                        <button
                            key={accion.label}
                            className="home-accion"
                            style={{ animationDelay: `${i * 0.03}s` }}
                            onClick={() => manejarAccion(accion.accion)}
                        >
                            <span className="home-accion-icono"><accion.Icon size={20} /></span>
                            <span className="home-accion-label">{accion.label}</span>
                        </button>
                    ))}
                </div>

                {/* Inversiones */}
                <h2 className="home-seccion-titulo">Inversiones</h2>
                <div className="home-acciones-grid">
                    {ACCIONES_INVERSION.map((accion, i) => (
                        <button
                            key={accion.label}
                            className="home-accion"
                            style={{ animationDelay: `${i * 0.03}s` }}
                            onClick={() => manejarAccion(accion.accion)}
                        >
                            <span className="home-accion-icono"><accion.Icon size={20} /></span>
                            <span className="home-accion-label">{accion.label}</span>
                        </button>
                    ))}
                </div>

                {/* Actividad reciente */}
                <div className="home-actividad-header">
                    <h2 className="home-seccion-titulo">Últimas actividades</h2>
                    <button className="home-link-consultar" onClick={() => navigate('/movimientos')}>
                        Consultar todas →
                    </button>
                </div>

                <div className="home-actividad-lista">
                    {transferencias.length === 0 && (
                        <p className="home-actividad-vacio">Todavía no tenés movimientos</p>
                    )}
                    {transferencias.slice(0, 4).map((t) => (
                        <ActividadItem key={t.id} transferencia={t} onClick={() => setDetalleActivo(t)} />
                    ))}
                </div>

            </div>

            {aviso && <div className="home-toast">{aviso}</div>}

            <TransferModal
                abierto={modalActivo === 'pesos'}
                onCerrar={() => setModalActivo(null)}
                config={configModalPesos}
                onExito={cargarDatosTrasTransferencia}
            />
            <TransferModal
                abierto={modalActivo === 'dolares'}
                onCerrar={() => setModalActivo(null)}
                config={configModalDolares}
                onExito={cargarDatosTrasTransferencia}
            />
            <PlazoFijoModal
                abierto={plazoFijoAbierto}
                onCerrar={() => setPlazoFijoAbierto(false)}
                saldoDisponible={saldoPesos}
            />
            <CambioDolaresModal
                abierto={cambioDolaresActivo === 'compra'}
                onCerrar={() => setCambioDolaresActivo(null)}
                config={configComprarDolares}
            />
            <CambioDolaresModal
                abierto={cambioDolaresActivo === 'venta'}
                onCerrar={() => setCambioDolaresActivo(null)}
                config={configVenderDolares}
            />
            <CriptoModal
                abierto={cambioCriptoActivo === 'compra'}
                onCerrar={() => setCambioCriptoActivo(null)}
                tipo="compra"
                saldoPesos={saldoPesos}
            />
            <CriptoModal
                abierto={cambioCriptoActivo === 'venta'}
                onCerrar={() => setCambioCriptoActivo(null)}
                tipo="venta"
                saldoPesos={saldoPesos}
            />

            <TransferenciaDetalleModal
                transferencia={detalleActivo}
                onCerrar={() => setDetalleActivo(null)}
                onActualizada={manejarTransferenciaActualizada}
            />
        </>
    );
}

export default Home;
