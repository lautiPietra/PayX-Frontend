import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TarjetaVirtual from '../components/TarjetaVirtual';
import { IconArrowLeft } from '../components/icons/Icons';
import { obtenerPerfil } from '../services/perfilService';
import './Movimientos.css';
import './Tarjeta.css';

// Pagina completa de la tarjeta virtual (no un modal, a pedido explicito): se
// llega aca desde "Tarjeta virtual" en "Qué querés hacer". Muestra la tarjeta
// tapada por defecto (TarjetaVirtual ya trae su propio boton para revelarla).
function Tarjeta() {
    const navigate = useNavigate();
    const [perfil, setPerfil] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        obtenerPerfil()
            .then(setPerfil)
            .catch(() => {})
            .finally(() => setCargando(false));
    }, []);

    return (
        <>
            <Navbar />
            <div className="movimientos-container">

                <button className="movimientos-volver" onClick={() => navigate('/inicio')}>
                    <IconArrowLeft size={16} /> Volver
                </button>

                <h1 className="movimientos-titulo">Tu tarjeta virtual</h1>
                <p className="movimientos-subtitulo">Usala para compras online. Tocá "Ver número completo" para revelarla.</p>

                <div className="tarjeta-pagina-contenido">
                    {cargando && <p className="movimientos-cargando">Cargando tu tarjeta...</p>}
                    {!cargando && <TarjetaVirtual perfil={perfil} />}
                </div>

            </div>
        </>
    );
}

export default Tarjeta;
