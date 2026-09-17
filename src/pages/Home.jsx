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
import { listarPlazosFijos } from '../services/plazoFijoService';
import { listarCambiosDolares } from '../services/cambioDolaresService';
import { obtenerCotizacionDolar } from '../services/cotizacionService';
import { listarOperacionesCripto } from '../services/criptoService';
import { obtenerCotizacionesCripto } from '../services/cotizacionCriptoService';
import { construirActividades } from '../utils/actividad';
import { useValorAnimado } from '../hooks/useValorAnimado';
import {
    IconSend, IconPiggyBank,
    IconDollarSign, IconArrowDownCircle, IconArrowUpCircle, IconCoins,
    IconCreditCard, IconTrendingUp, IconEye, IconEyeOff, IconFileText, IconTarget, IconBarChart, IconZap
} from '../components/icons/Icons';
import './Home.css';

const ACCIONES_GENERALES = [
    { label: 'Transferir', Icon: IconSend, accion: 'transferir-pesos' },
    { label: 'Transferencia en dólares', Icon: IconDollarSign, accion: 'transferir-dolares' },
    { label: 'Transferencia en cripto', Icon: IconCoins, accion: 'transferir-cripto' },
    { label: 'Pagar servicios', Icon: IconZap, accion: 'servicios' },
    { label: 'Tarjeta virtual', Icon: IconCreditCard, accion: 'tarjeta' },
    { label: 'Estadísticas', Icon: IconBarChart, accion: 'estadisticas' },
];

const ACCIONES_INVERSION = [
    { label: 'Plazos fijos', Icon: IconPiggyBank, accion: 'plazo-fijo' },
    { label: 'Mis plazos fijos', Icon: IconFileText, accion: 'mis-plazos-fijos' },
    { label: 'Cajas de ahorro', Icon: IconTarget, accion: 'caja-ahorro' },
    { label: 'Comprar dólares', Icon: IconArrowDownCircle, accion: 'comprar-dolares' },
    { label: 'Vender dólares', Icon: IconArrowUpCircle, accion: 'vender-dolares' },
    { label: 'Comprar criptomonedas', Icon: IconCoins, accion: 'comprar-cripto' },
    { label: 'Vender criptomonedas', Icon: IconCoins, accion: 'vender-cripto' },
];

function formatearMonto(valor) {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Sin ceros de relleno hasta 8 decimales, para mostrar tenencias chicas de cripto
// (0.5 en vez de 0.50000000) sin perder precision cuando sí hacen falta decimales.
function formatearMontoCripto(valor) {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 8 });
}

const CRIPTOS_DISPONIBLES = ['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP'];
const SALDO_KEY_CRIPTO = {
    BTC: 'saldoBtc', ETH: 'saldoEth', SOL: 'saldoSolana',
    USDT: 'saldoUsdt', BNB: 'saldoBnb', XRP: 'saldoXrp',
};

function Home() {
    const navigate = useNavigate();
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const primerNombre = usuario.nombreCompleto?.split(' ')[0] || 'de nuevo';

    const [perfil, setPerfil] = useState(null);
    const [transferencias, setTransferencias] = useState([]);
    const [plazosFijos, setPlazosFijos] = useState([]);
    const [cambiosDolares, setCambiosDolares] = useState([]);
    const [cotizacionDolar, setCotizacionDolar] = useState(null);
    const [cambiosCripto, setCambiosCripto] = useState([]);
    const [cotizacionesCripto, setCotizacionesCripto] = useState([]);
    const [detalleActivo, setDetalleActivo] = useState(null);

    const [monedaActiva, setMonedaActiva] = useState('pesos');
    const [criptoSeleccionada, setCriptoSeleccionada] = useState('BTC');
    const [saldoVisible, setSaldoVisible] = useState(true);
    const [aviso, setAviso] = useState(null);
    const avisoTimeoutRef = useRef(null);
    const [modalActivo, setModalActivo] = useState(null); // null | 'pesos' | 'dolares' | 'cripto'
    const [plazoFijoAbierto, setPlazoFijoAbierto] = useState(false);
    const [cambioDolaresActivo, setCambioDolaresActivo] = useState(null); // null | 'compra' | 'venta'
    const [cambioCriptoActivo, setCambioCriptoActivo] = useState(null); // null | 'compra' | 'venta'

    const saldoPesos = Number(perfil?.saldoPesos ?? 0);
    const saldoDolares = Number(perfil?.saldoUsd ?? 0);

    // Saldo de cada cripto en su propia unidad (no hay rendimiento/P&L: no se
    // guarda un precio de compra promedio para calcularlo). El boton BTC/ETH/SOL
    // elige cual se muestra como numero grande, igual que "Pesos"/"Dólares" ya
    // muestran cada uno su propia moneda en vez de un total mezclado.
    const precioDe = (simbolo) => Number(cotizacionesCripto.find((c) => c.simbolo === simbolo)?.precio ?? 0);
    const saldoCriptoNativo = Number(perfil?.[SALDO_KEY_CRIPTO[criptoSeleccionada]] ?? 0);
    const precioCriptoSeleccionada = precioDe(criptoSeleccionada);
    const equivalentePesosCriptoSeleccionada = saldoCriptoNativo * precioCriptoSeleccionada;

    // Alias a los que ya se les transfirio, mas reciente primero y sin repetidos,
    // para sugerirlos en el modal de transferencia y no tener que escribirlos de nuevo.
    const contactosFrecuentes = (() => {
        const vistos = new Set();
        const contactos = [];
        for (const t of transferencias) {
            if (t.direccion !== 'ENVIADA' || vistos.has(t.contraparteAlias)) continue;
            vistos.add(t.contraparteAlias);
            contactos.push({ alias: t.contraparteAlias, nombre: t.contraparteNombre });
        }
        return contactos;
    })();

    const actividades = construirActividades(transferencias, plazosFijos, cambiosDolares, cambiosCripto);

    const MONEDAS = [
        { key: 'pesos', label: 'Pesos', simbolo: '$', saldo: saldoPesos },
        { key: 'dolares', label: 'Dólares', simbolo: 'US$', saldo: saldoDolares },
        {
            key: 'cripto', label: 'Cripto', simbolo: criptoSeleccionada, saldo: saldoCriptoNativo,
            esCripto: true, equivalentePesos: equivalentePesosCriptoSeleccionada,
        },
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
        // Cotizacion real (oficial, venta) para el "≈ $ tal en pesos" de la vista previa.
        cotizacion: Number(cotizacionDolar?.venta ?? 0),
    };

    const configModalCripto = {
        titulo: 'Transferencia en cripto',
        esCripto: true,
        saldosPorCripto: {
            BTC: perfil?.saldoBtc, ETH: perfil?.saldoEth, SOL: perfil?.saldoSolana,
            USDT: perfil?.saldoUsdt, BNB: perfil?.saldoBnb, XRP: perfil?.saldoXrp,
        },
        placeholderDestinatario: 'CVU, alias o @usuario',
    };

    const configComprarDolares = {
        tipo: 'compra',
        titulo: 'Comprar dólares',
        subtitulo: 'Comprá dólares al instante con el saldo de tu cuenta en pesos',
        simboloEntrada: '$',
        simboloSalida: 'US$',
        saldoDisponible: saldoPesos,
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
            // Si hay un detalle abierto, lo actualiza con la version fresca (por si
            // la otra parte lo confirmo/cancelo mientras lo estabas mirando)
            setDetalleActivo((actual) => (actual ? datos.find((t) => t.id === actual.id) || actual : actual));
        } catch {
            // si falla, se muestra la lista vacia
        }
    };

    const cargarPlazosFijos = async () => {
        try {
            const datos = await listarPlazosFijos();
            setPlazosFijos(datos);
        } catch {
            // si falla, se mantiene la ultima lista conocida
        }
    };

    const cargarCambiosDolares = async () => {
        try {
            const datos = await listarCambiosDolares();
            setCambiosDolares(datos);
        } catch {
            // si falla, se mantiene la ultima lista conocida
        }
    };

    // El backend cachea la cotizacion hasta 60s, asi que no hace falta pedirla mas
    // seguido que eso: pollear a 5s como el resto no traeria nada mas fresco.
    const cargarCotizacion = async () => {
        try {
            const datos = await obtenerCotizacionDolar();
            setCotizacionDolar(datos);
        } catch {
            // si falla, se mantiene la ultima cotizacion conocida (o null la primera vez)
        }
    };

    const cargarCambiosCripto = async () => {
        try {
            const datos = await listarOperacionesCripto();
            setCambiosCripto(datos);
        } catch {
            // si falla, se mantiene la ultima lista conocida
        }
    };

    // Mismo motivo que cargarCotizacion: el backend cachea los precios de cripto 60s.
    const cargarCotizacionesCripto = async () => {
        try {
            const datos = await obtenerCotizacionesCripto();
            setCotizacionesCripto(datos);
        } catch {
            // si falla, se mantienen las ultimas cotizaciones conocidas (o vacio la primera vez)
        }
    };

    const cargarDatosTrasTransferencia = () => {
        cargarPerfil();
        cargarTransferencias();
        // Una transferencia directa genera notificaciones (enviada/recibida) al instante
        window.dispatchEvent(new Event('notificaciones-actualizadas'));
    };

    const cargarDatosTrasPlazoFijo = () => {
        cargarPerfil();
        cargarPlazosFijos();
        // Constituir un plazo fijo genera una notificacion al instante
        window.dispatchEvent(new Event('notificaciones-actualizadas'));
    };

    const cargarDatosTrasCambioDolares = () => {
        cargarPerfil();
        cargarCambiosDolares();
        // Comprar/vender dolares genera una notificacion al instante
        window.dispatchEvent(new Event('notificaciones-actualizadas'));
    };

    const cargarDatosTrasCripto = () => {
        cargarPerfil();
        cargarCambiosCripto();
        // Comprar/vender cripto genera una notificacion al instante
        window.dispatchEvent(new Event('notificaciones-actualizadas'));
    };

    // Carga inicial de saldo real (pesos/dolares/cripto), transferencias, plazos
    // fijos, cambios de dolares y de cripto hechos, y las cotizaciones actuales
    useEffect(() => {
        obtenerPerfil().then(setPerfil).catch(() => {});
        listarTransferencias().then(setTransferencias).catch(() => {});
        listarPlazosFijos().then(setPlazosFijos).catch(() => {});
        listarCambiosDolares().then(setCambiosDolares).catch(() => {});
        listarOperacionesCripto().then(setCambiosCripto).catch(() => {});
        cargarCotizacion();
        cargarCotizacionesCripto();
    }, []);

    // Polling: si otro usuario confirma o cancela una transferencia pendiente que
    // tenes con el (o si un plazo fijo tuyo vencio y el scheduler ya lo acredito),
    // tu cuenta no tiene forma de enterarse sola sin preguntarle al backend de tanto
    // en tanto (no hay websockets en este proyecto).
    useEffect(() => {
        const intervalo = setInterval(() => {
            cargarPerfil();
            cargarTransferencias();
            cargarPlazosFijos();
            cargarCambiosDolares();
            cargarCambiosCripto();
        }, 5000);
        return () => clearInterval(intervalo);
    }, []);

    // Las cotizaciones se refrescan aparte, cada 20s: pollearlas a 5s no traeria
    // nada mas fresco (el backend las cachea 60s) y solo agregaria pedidos de mas.
    useEffect(() => {
        const intervalo = setInterval(() => {
            cargarCotizacion();
            cargarCotizacionesCripto();
        }, 20000);
        return () => clearInterval(intervalo);
    }, []);

    // El numero grande se desliza suavemente hacia el saldo real cada vez que
    // cambia (al cambiar de pestaña de moneda, o -en cripto- porque el precio en
    // vivo se movio), en vez de reiniciar a cero cada vez que la cotizacion ticka.
    const [saldoAnimado] = useValorAnimado(monedaData.saldo, 700);

    const mostrarProximamente = () => {
        setAviso('Esta función va a estar disponible próximamente.');
        clearTimeout(avisoTimeoutRef.current);
        avisoTimeoutRef.current = setTimeout(() => setAviso(null), 2600);
    };

    const manejarAccion = (accion) => {
        if (accion === 'transferir-pesos') { setModalActivo('pesos'); return; }
        if (accion === 'transferir-dolares') { setModalActivo('dolares'); return; }
        if (accion === 'transferir-cripto') { setModalActivo('cripto'); return; }
        if (accion === 'plazo-fijo') { setPlazoFijoAbierto(true); return; }
        if (accion === 'mis-plazos-fijos') { navigate('/plazos-fijos'); return; }
        if (accion === 'comprar-dolares') { setCambioDolaresActivo('compra'); return; }
        if (accion === 'vender-dolares') { setCambioDolaresActivo('venta'); return; }
        if (accion === 'comprar-cripto') { setCambioCriptoActivo('compra'); return; }
        if (accion === 'vender-cripto') { setCambioCriptoActivo('venta'); return; }
        if (accion === 'tarjeta') { navigate('/tarjeta'); return; }
        if (accion === 'caja-ahorro') { navigate('/cajas-ahorro'); return; }
        if (accion === 'estadisticas') { navigate('/estadisticas'); return; }
        if (accion === 'servicios') { navigate('/servicios'); return; }
        mostrarProximamente();
    };

    const manejarTransferenciaActualizada = (actualizada) => {
        setTransferencias((prev) => prev.map((t) => (t.id === actualizada.id ? actualizada : t)));
        setDetalleActivo(actualizada);
        cargarPerfil(); // confirmar una pendiente mueve plata: refrescamos el saldo
        // Confirmar una pendiente tambien genera notificaciones (cancelar/editar no, pero no hace nada raro re-pedirlas igual)
        window.dispatchEvent(new Event('notificaciones-actualizadas'));
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

                        {monedaActiva === 'cripto' && (
                            <div className="home-tabs-cripto">
                                {CRIPTOS_DISPONIBLES.map((c) => (
                                    <button
                                        key={c}
                                        className={`home-tab-cripto ${criptoSeleccionada === c ? 'activo' : ''}`}
                                        onClick={() => setCriptoSeleccionada(c)}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="home-saldo-fila">
                            <div className="home-saldo-monto">
                                <span className="home-saldo-simbolo">{monedaData.esCripto ? '' : monedaData.simbolo}</span>
                                <span className="home-saldo-numero">
                                    {saldoVisible
                                        ? (monedaData.esCripto ? formatearMontoCripto(saldoAnimado) : formatearMonto(saldoAnimado))
                                        : '••••••'}
                                </span>
                                {monedaData.esCripto && <span className="home-saldo-simbolo-sufijo">{monedaData.simbolo}</span>}
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

                        {saldoVisible && monedaData.esCripto && (
                            <p className="home-saldo-equivalente">
                                ≈ $ {formatearMonto(monedaData.equivalentePesos)}
                            </p>
                        )}
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
                        <button className="home-btn-promo" onClick={() => navigate('/plazos-fijos')}>
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
                <div className="home-acciones-grid home-acciones-grid-inversiones">
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
                    {actividades.length === 0 && (
                        <p className="home-actividad-vacio">Todavía no tenés movimientos</p>
                    )}
                    {actividades.slice(0, 4).map((item) => (
                        <ActividadItem
                            key={item.key}
                            transferencia={item.transferencia}
                            plazoFijoEvento={item.plazoFijoEvento}
                            cambioDolares={item.cambioDolares}
                            cambioCripto={item.cambioCripto}
                            onClick={
                                item.transferencia ? () => setDetalleActivo(item.transferencia)
                                    : item.plazoFijoEvento ? () => navigate('/plazos-fijos')
                                        : undefined
                            }
                        />
                    ))}
                </div>

            </div>

            {aviso && <div className="home-toast">{aviso}</div>}

            <TransferModal
                abierto={modalActivo === 'pesos'}
                onCerrar={() => setModalActivo(null)}
                config={configModalPesos}
                onExito={cargarDatosTrasTransferencia}
                contactos={contactosFrecuentes}
            />
            <TransferModal
                abierto={modalActivo === 'dolares'}
                onCerrar={() => setModalActivo(null)}
                config={configModalDolares}
                onExito={cargarDatosTrasTransferencia}
                contactos={contactosFrecuentes}
            />
            <TransferModal
                abierto={modalActivo === 'cripto'}
                onCerrar={() => setModalActivo(null)}
                config={configModalCripto}
                onExito={cargarDatosTrasTransferencia}
                contactos={contactosFrecuentes}
            />
            <PlazoFijoModal
                abierto={plazoFijoAbierto}
                onCerrar={() => setPlazoFijoAbierto(false)}
                saldoDisponible={saldoPesos}
                onExito={cargarDatosTrasPlazoFijo}
                onVerMisPlazosFijos={() => { setPlazoFijoAbierto(false); navigate('/plazos-fijos'); }}
            />
            <CambioDolaresModal
                abierto={cambioDolaresActivo === 'compra'}
                onCerrar={() => setCambioDolaresActivo(null)}
                config={configComprarDolares}
                onExito={cargarDatosTrasCambioDolares}
            />
            <CambioDolaresModal
                abierto={cambioDolaresActivo === 'venta'}
                onCerrar={() => setCambioDolaresActivo(null)}
                config={configVenderDolares}
                onExito={cargarDatosTrasCambioDolares}
            />
            <CriptoModal
                abierto={cambioCriptoActivo === 'compra'}
                onCerrar={() => setCambioCriptoActivo(null)}
                tipo="compra"
                perfil={perfil}
                onExito={cargarDatosTrasCripto}
            />
            <CriptoModal
                abierto={cambioCriptoActivo === 'venta'}
                onCerrar={() => setCambioCriptoActivo(null)}
                tipo="venta"
                perfil={perfil}
                onExito={cargarDatosTrasCripto}
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
