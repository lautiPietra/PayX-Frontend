import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ActividadItem from '../components/ActividadItem';
import TransferenciaDetalleModal from '../components/TransferenciaDetalleModal';
import { listarTransferencias } from '../services/transferenciaService';
import { listarPlazosFijos } from '../services/plazoFijoService';
import { listarCambiosDolares } from '../services/cambioDolaresService';
import { listarOperacionesCripto } from '../services/criptoService';
import { construirActividades } from '../utils/actividad';
import { IconArrowLeft } from '../components/icons/Icons';
import './Home.css';
import './Movimientos.css';

function Movimientos() {
    const navigate = useNavigate();
    const [transferencias, setTransferencias] = useState([]);
    const [plazosFijos, setPlazosFijos] = useState([]);
    const [cambiosDolares, setCambiosDolares] = useState([]);
    const [cambiosCripto, setCambiosCripto] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [detalleActivo, setDetalleActivo] = useState(null);

    const actividades = construirActividades(transferencias, plazosFijos, cambiosDolares, cambiosCripto);

    useEffect(() => {
        cargar();
    }, []);

    // Polling: si otro usuario confirma o cancela una transferencia pendiente que
    // tenes con el (o si un plazo fijo tuyo vencio y el scheduler ya lo acredito),
    // no hay forma de enterarse sin preguntarle al backend de tanto en tanto (no hay
    // websockets en este proyecto). Silencioso: no toca "cargando" para no reemplazar
    // la lista por el cartel de "Cargando..." cada vez.
    useEffect(() => {
        const intervalo = setInterval(refrescarSilencioso, 5000);
        return () => clearInterval(intervalo);
    }, []);

    async function cargar() {
        setCargando(true);
        try {
            const [datosTransferencias, datosPlazosFijos, datosCambios, datosCripto] = await Promise.all([
                listarTransferencias(),
                listarPlazosFijos(),
                listarCambiosDolares(),
                listarOperacionesCripto(),
            ]);
            setTransferencias(datosTransferencias);
            setPlazosFijos(datosPlazosFijos);
            setCambiosDolares(datosCambios);
            setCambiosCripto(datosCripto);
        } catch {
            // si falla, se muestra la lista vacia
        } finally {
            setCargando(false);
        }
    }

    async function refrescarSilencioso() {
        try {
            const [datosTransferencias, datosPlazosFijos, datosCambios, datosCripto] = await Promise.all([
                listarTransferencias(),
                listarPlazosFijos(),
                listarCambiosDolares(),
                listarOperacionesCripto(),
            ]);
            setTransferencias(datosTransferencias);
            setPlazosFijos(datosPlazosFijos);
            setCambiosDolares(datosCambios);
            setCambiosCripto(datosCripto);
            setDetalleActivo((actual) => (actual ? datosTransferencias.find((t) => t.id === actual.id) || actual : actual));
        } catch {
            // si falla, se mantiene la lista tal como estaba
        }
    }

    function manejarActualizada(actualizada) {
        setTransferencias((prev) => prev.map((t) => (t.id === actualizada.id ? actualizada : t)));
        setDetalleActivo(actualizada);
        // Confirmar una pendiente genera notificaciones (enviada/recibida) al instante
        window.dispatchEvent(new Event('notificaciones-actualizadas'));
    }

    return (
        <>
            <Navbar />
            <div className="movimientos-container">

                <button className="movimientos-volver" onClick={() => navigate('/inicio')}>
                    <IconArrowLeft size={16} /> Volver
                </button>

                <h1 className="movimientos-titulo">Todos tus movimientos</h1>
                <p className="movimientos-subtitulo">Transferencias, plazos fijos, dólares y cripto</p>

                {cargando && <p className="movimientos-cargando">Cargando movimientos...</p>}

                {!cargando && actividades.length === 0 && (
                    <p className="home-actividad-vacio">Todavía no tenés movimientos</p>
                )}

                {!cargando && actividades.length > 0 && (
                    <div className="home-actividad-lista">
                        {actividades.map((item) => (
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
                )}
            </div>

            <TransferenciaDetalleModal
                transferencia={detalleActivo}
                onCerrar={() => setDetalleActivo(null)}
                onActualizada={manejarActualizada}
            />
        </>
    );
}

export default Movimientos;
