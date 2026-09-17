import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EstadisticaDonut from '../components/EstadisticaDonut';
import EstadisticaBarras from '../components/EstadisticaBarras';
import { IconArrowLeft, IconBarChart } from '../components/icons/Icons';
import { obtenerEstadisticaGastos } from '../services/estadisticaService';
import './Movimientos.css';
import '../components/TransferModal.css';
import './Estadisticas.css';

const PERIODOS = [
    { dias: 7, label: '7 días' },
    { dias: 30, label: '30 días' },
    { dias: 90, label: '90 días' },
    { dias: 0, label: 'Todo' },
];

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFechaLarga(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function Estadisticas() {
    const navigate = useNavigate();
    const [dias, setDias] = useState(30);
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Si el usuario clickea varios periodos seguido (7/30/90/todo), los pedidos
        // pueden volver desordenados: sin esto, una respuesta vieja que llega tarde
        // pisaria los datos del periodo que en realidad esta seleccionado ahora.
        let cancelado = false;
        setCargando(true);
        setError('');
        obtenerEstadisticaGastos(dias)
            .then((data) => { if (!cancelado) setDatos(data); })
            .catch(() => { if (!cancelado) setError('No pudimos cargar tus estadísticas. Probá de nuevo en un momento.'); })
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, [dias]);

    return (
        <>
            <Navbar />
            <div className="movimientos-container">
                <button className="movimientos-volver" onClick={() => navigate('/inicio')}>
                    <IconArrowLeft size={16} /> Volver
                </button>

                <h1 className="movimientos-titulo">Estadísticas de gastos</h1>
                <p className="movimientos-subtitulo">
                    Transferencias enviadas, compra de dólares y cripto, y plazos fijos constituidos. Mover plata a una caja de ahorro no cuenta como gasto: sigue siendo tuya.
                </p>

                <div className="estadisticas-periodos">
                    {PERIODOS.map((p) => (
                        <button
                            key={p.dias}
                            className={`estadisticas-periodo-btn ${dias === p.dias ? 'activo' : ''}`}
                            onClick={() => setDias(p.dias)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {cargando && <p className="movimientos-cargando">Cargando tus estadísticas...</p>}
                {error && <div className="transfer-error">{error}</div>}

                {!cargando && !error && datos && (
                    <>
                        <div className="estadisticas-total-card">
                            <span className="estadisticas-total-icono"><IconBarChart size={20} /></span>
                            <div>
                                <p className="estadisticas-total-label">
                                    {datos.desde
                                        ? `Gastado del ${formatearFechaLarga(datos.desde)} al ${formatearFechaLarga(datos.hasta)}`
                                        : 'Gastado desde siempre'}
                                </p>
                                <p className="estadisticas-total-valor">$ {formatearMonto(datos.totalGastado)}</p>
                            </div>
                        </div>

                        <div className="estadisticas-seccion">
                            <h2 className="estadisticas-seccion-titulo">Por categoría</h2>
                            <EstadisticaDonut categorias={datos.categorias} total={datos.totalGastado} />
                        </div>

                        {datos.porDia.length > 0 && (
                            <div className="estadisticas-seccion">
                                <h2 className="estadisticas-seccion-titulo">Día a día</h2>
                                <EstadisticaBarras puntos={datos.porDia} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

export default Estadisticas;
