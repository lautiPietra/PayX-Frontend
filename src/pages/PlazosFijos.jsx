import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PlazoFijoModal from '../components/PlazoFijoModal';
import { IconArrowLeft, IconPiggyBank, IconPlus } from '../components/icons/Icons';
import { obtenerPerfil } from '../services/perfilService';
import { listarPlazosFijos } from '../services/plazoFijoService';
import './Movimientos.css';
import './PlazosFijos.css';
import '../components/PlazoFijoModal.css';

const MAX_PLAZOS_ACTIVOS = 5;

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// El backend manda fechas puras "yyyy-MM-dd" (sin hora): se arma la fecha en
// horario local a mano para no correrse un dia por interpretarla en UTC.
function formatearFecha(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Pagina completa con todos los plazos fijos del usuario (activos y vencidos),
// mas recientes primero, con un boton para constituir uno nuevo. Antes era un
// modal chico; se convirtio en pagina para que se sienta consistente con "Todos
// tus movimientos".
function PlazosFijos() {
    const navigate = useNavigate();
    const [perfil, setPerfil] = useState(null);
    const [plazos, setPlazos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);

    const saldoPesos = Number(perfil?.saldoPesos ?? 0);
    const activos = plazos.filter((p) => p.estado === 'ACTIVO').length;

    useEffect(() => {
        cargar();
    }, []);

    // Polling: si un plazo fijo vence mientras estas mirando esta pagina, el
    // scheduler del backend lo acredita solo pero esta pantalla no se entera sin
    // preguntar de tanto en tanto (no hay websockets en este proyecto).
    useEffect(() => {
        const intervalo = setInterval(refrescarSilencioso, 5000);
        return () => clearInterval(intervalo);
    }, []);

    async function cargar() {
        setCargando(true);
        try {
            const [datosPerfil, datosPlazos] = await Promise.all([obtenerPerfil(), listarPlazosFijos()]);
            setPerfil(datosPerfil);
            setPlazos(datosPlazos);
        } catch {
            // si falla, se muestra la lista vacia
        } finally {
            setCargando(false);
        }
    }

    async function refrescarSilencioso() {
        try {
            const [datosPerfil, datosPlazos] = await Promise.all([obtenerPerfil(), listarPlazosFijos()]);
            setPerfil(datosPerfil);
            setPlazos(datosPlazos);
        } catch {
            // si falla, se mantiene la lista tal como estaba
        }
    }

    function manejarExito() {
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

                <div className="plazos-fijos-header">
                    <div>
                        <h1 className="movimientos-titulo">Tus plazos fijos</h1>
                        <p className="movimientos-subtitulo">{activos}/{MAX_PLAZOS_ACTIVOS} activos</p>
                    </div>
                    <button
                        className="plazos-fijos-btn-nuevo"
                        onClick={() => setModalAbierto(true)}
                        disabled={activos >= MAX_PLAZOS_ACTIVOS}
                        title={activos >= MAX_PLAZOS_ACTIVOS ? 'Ya tenés el máximo de plazos fijos activos' : undefined}
                    >
                        <IconPlus size={16} /> Constituir nuevo
                    </button>
                </div>

                {cargando && <p className="movimientos-cargando">Cargando plazos fijos...</p>}

                {!cargando && plazos.length === 0 && (
                    <p className="home-actividad-vacio">Todavía no constituiste ningún plazo fijo</p>
                )}

                {!cargando && plazos.length > 0 && (
                    <div className="plazo-fijo-lista-items">
                        {plazos.map((p) => (
                            <div key={p.id} className="plazo-fijo-item">
                                <div className="plazo-fijo-item-header">
                                    <span className="plazo-fijo-item-monto">
                                        <IconPiggyBank size={15} /> $ {formatearMonto(p.monto)}
                                    </span>
                                    <span className={`plazo-fijo-item-badge ${p.estado.toLowerCase()}`}>
                                        {p.estado === 'ACTIVO' ? 'Activo' : 'Acreditado'}
                                    </span>
                                </div>
                                <div className="plazo-fijo-item-filas">
                                    <div className="plazo-fijo-item-fila">
                                        <span>Constituido el</span>
                                        <span>{formatearFecha(p.fechaInicio)}</span>
                                    </div>
                                    <div className="plazo-fijo-item-fila">
                                        <span>Plazo</span>
                                        <span>{p.plazoDias} días · TNA {p.tna}%</span>
                                    </div>
                                    <div className="plazo-fijo-item-fila">
                                        <span>Interés generado</span>
                                        <span>+$ {formatearMonto(p.interesEstimado)}</span>
                                    </div>
                                    <div className="plazo-fijo-item-fila destacado">
                                        <span>{p.estado === 'ACTIVO' ? 'Vas a cobrar' : 'Se acreditaron'}</span>
                                        <span>$ {formatearMonto(p.montoTotal)}</span>
                                    </div>
                                    <div className="plazo-fijo-item-fila">
                                        <span>{p.estado === 'ACTIVO' ? 'Se acredita el' : 'Se acreditó el'}</span>
                                        <span>{formatearFecha(p.fechaVencimiento)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <PlazoFijoModal
                abierto={modalAbierto}
                onCerrar={() => setModalAbierto(false)}
                saldoDisponible={saldoPesos}
                onExito={manejarExito}
            />
        </>
    );
}

export default PlazosFijos;
