import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ActividadItem from '../components/ActividadItem';
import TransferenciaDetalleModal from '../components/TransferenciaDetalleModal';
import { listarTransferencias } from '../services/transferenciaService';
import { IconArrowLeft } from '../components/icons/Icons';
import './Home.css';
import './Movimientos.css';

function Movimientos() {
    const navigate = useNavigate();
    const [transferencias, setTransferencias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [detalleActivo, setDetalleActivo] = useState(null);

    useEffect(() => {
        cargar();
    }, []);

    // Polling: si otro usuario confirma o cancela una transferencia pendiente que
    // tenes con el, no hay forma de enterarse sin preguntarle al backend de tanto
    // en tanto (no hay websockets en este proyecto). Silencioso: no toca "cargando"
    // para no reemplazar la lista por el cartel de "Cargando..." cada vez.
    useEffect(() => {
        const intervalo = setInterval(refrescarSilencioso, 15000);
        return () => clearInterval(intervalo);
    }, []);

    async function cargar() {
        setCargando(true);
        try {
            const datos = await listarTransferencias();
            setTransferencias(datos);
        } catch {
            // si falla, se muestra la lista vacia
        } finally {
            setCargando(false);
        }
    }

    async function refrescarSilencioso() {
        try {
            const datos = await listarTransferencias();
            setTransferencias(datos);
            setDetalleActivo((actual) => (actual ? datos.find((t) => t.id === actual.id) || actual : actual));
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
                <p className="movimientos-subtitulo">Transferencias enviadas y recibidas</p>

                {cargando && <p className="movimientos-cargando">Cargando movimientos...</p>}

                {!cargando && transferencias.length === 0 && (
                    <p className="home-actividad-vacio">Todavía no tenés movimientos</p>
                )}

                {!cargando && transferencias.length > 0 && (
                    <div className="home-actividad-lista">
                        {transferencias.map((t) => (
                            <ActividadItem key={t.id} transferencia={t} onClick={() => setDetalleActivo(t)} />
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
