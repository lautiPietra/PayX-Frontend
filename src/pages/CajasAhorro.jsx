import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CajaAhorroCard from '../components/CajaAhorroCard';
import CajaAhorroModal from '../components/CajaAhorroModal';
import MontoCajaModal from '../components/MontoCajaModal';
import { IconArrowLeft, IconPlus, IconPiggyBank } from '../components/icons/Icons';
import { obtenerPerfil } from '../services/perfilService';
import { listarCajasAhorro, eliminarCajaAhorro } from '../services/cajaAhorroService';
import '../pages/Movimientos.css';
import '../components/TransferModal.css';
import './CajasAhorro.css';

const MAX_CAJAS = 8;

function CajasAhorro() {
    const navigate = useNavigate();
    const [cajas, setCajas] = useState([]);
    const [saldoPesos, setSaldoPesos] = useState(0);
    const [cargando, setCargando] = useState(true);

    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [cajaAEditar, setCajaAEditar] = useState(null);
    const [operacion, setOperacion] = useState(null); // { caja, modo: 'depositar' | 'retirar' }
    const [cajaAEliminar, setCajaAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [errorEliminar, setErrorEliminar] = useState('');

    const cargar = useCallback(() => {
        return Promise.all([listarCajasAhorro(), obtenerPerfil()])
            .then(([listaCajas, perfil]) => {
                setCajas(listaCajas);
                setSaldoPesos(Number(perfil?.saldoPesos ?? 0));
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        cargar().finally(() => setCargando(false));
    }, [cargar]);

    function avisarActualizacion() {
        window.dispatchEvent(new Event('notificaciones-actualizadas'));
    }

    function abrirCrear() {
        setCajaAEditar(null);
        setModalCrearAbierto(true);
    }

    function abrirEditar(caja) {
        setCajaAEditar(caja);
        setModalCrearAbierto(true);
    }

    function cerrarModalCrear() {
        setModalCrearAbierto(false);
        setCajaAEditar(null);
    }

    function abrirDepositar(caja) {
        setOperacion({ caja, modo: 'depositar' });
    }

    function abrirRetirar(caja) {
        setOperacion({ caja, modo: 'retirar' });
    }

    function abrirEliminar(caja) {
        setErrorEliminar('');
        setCajaAEliminar(caja);
    }

    async function confirmarEliminar() {
        if (!cajaAEliminar) return;
        setEliminando(true);
        setErrorEliminar('');
        try {
            await eliminarCajaAhorro(cajaAEliminar.id);
            setCajaAEliminar(null);
            await cargar();
            avisarActualizacion();
        } catch (err) {
            setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar la caja. Intentá de nuevo.');
        } finally {
            setEliminando(false);
        }
    }

    return (
        <>
            <Navbar />
            <div className="movimientos-container">
                <button className="movimientos-volver" onClick={() => navigate('/inicio')}>
                    <IconArrowLeft size={16} /> Volver
                </button>

                <div className="cajas-ahorro-header">
                    <div>
                        <h1 className="movimientos-titulo">Cajas de ahorro</h1>
                        <p className="movimientos-subtitulo">Separá plata de tu saldo principal para cada objetivo</p>
                    </div>
                    <button
                        className="cajas-ahorro-btn-nuevo"
                        onClick={abrirCrear}
                        disabled={cajas.length >= MAX_CAJAS}
                        title={cajas.length >= MAX_CAJAS ? `Ya tenés el máximo de ${MAX_CAJAS} cajas` : undefined}
                    >
                        <IconPlus size={15} /> Nueva caja
                    </button>
                </div>

                {cargando && <p className="movimientos-cargando">Cargando tus cajas de ahorro...</p>}

                {!cargando && cajas.length === 0 && (
                    <div className="cajas-ahorro-vacio">
                        <span className="cajas-ahorro-vacio-icono"><IconPiggyBank size={26} /></span>
                        <p>Todavía no tenés cajas de ahorro.</p>
                        <p className="cajas-ahorro-vacio-sub">Creá la primera para separar plata sin gastarla, con o sin una meta puntual.</p>
                        <button className="cajas-ahorro-btn-nuevo" onClick={abrirCrear}>
                            <IconPlus size={15} /> Crear mi primera caja
                        </button>
                    </div>
                )}

                {!cargando && cajas.length > 0 && (
                    <div className="cajas-ahorro-grid">
                        {cajas.map((caja) => (
                            <CajaAhorroCard
                                key={caja.id}
                                caja={caja}
                                onEditar={abrirEditar}
                                onEliminar={abrirEliminar}
                                onDepositar={abrirDepositar}
                                onRetirar={abrirRetirar}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CajaAhorroModal
                abierto={modalCrearAbierto}
                onCerrar={cerrarModalCrear}
                cajaExistente={cajaAEditar}
                onExito={() => { cargar(); }}
            />

            <MontoCajaModal
                abierto={Boolean(operacion)}
                onCerrar={() => setOperacion(null)}
                caja={operacion?.caja}
                modo={operacion?.modo}
                saldoDisponible={operacion?.modo === 'depositar' ? saldoPesos : Number(operacion?.caja?.saldo ?? 0)}
                onExito={() => { cargar(); avisarActualizacion(); }}
            />

            {cajaAEliminar && (
                <div className="cajas-ahorro-confirmar-overlay">
                    <div className="cajas-ahorro-confirmar">
                        <h3>¿Eliminar "{cajaAEliminar.nombre}"?</h3>
                        <p>
                            {Number(cajaAEliminar.saldo) > 0
                                ? `Los $ ${Number(cajaAEliminar.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })} que tiene se devuelven a tu cuenta principal.`
                                : 'Esta acción no se puede deshacer.'}
                        </p>
                        {errorEliminar && <div className="transfer-error" style={{ marginBottom: 16 }}>{errorEliminar}</div>}
                        <div className="cajas-ahorro-confirmar-botones">
                            <button className="transfer-btn-cancelar" onClick={() => setCajaAEliminar(null)} disabled={eliminando}>
                                Cancelar
                            </button>
                            <button className="cajas-ahorro-btn-eliminar" onClick={confirmarEliminar} disabled={eliminando}>
                                {eliminando ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default CajasAhorro;
