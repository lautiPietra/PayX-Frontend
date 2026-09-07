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

    function manejarActualizada(actualizada) {
        setTransferencias((prev) => prev.map((t) => (t.id === actualizada.id ? actualizada : t)));
        setDetalleActivo(actualizada);
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
