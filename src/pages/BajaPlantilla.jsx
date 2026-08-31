import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./BajaPlantilla.css";

function BajaPlantilla() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [plantilla, setPlantilla] = useState(null);
    const [cargandoDatos, setCargandoDatos] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        async function cargarPlantilla() {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`http://localhost:8080/api/plantillas/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setPlantilla(res.data);
            } catch (err) {
                setError("No se pudo cargar la plantilla.");
            } finally {
                setCargandoDatos(false);
            }
        }
        cargarPlantilla();
    }, [id]);

    async function confirmarDesactivar() {
        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`http://localhost:8080/api/plantillas/${id}/desactivar`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            navigate("/admin/plantillas");
        } catch (err) {
            setError("Error al desactivar la plantilla.");
            setModalVisible(false);
        } finally {
            setCargando(false);
        }
    }

    async function reactivar() {
        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`http://localhost:8080/api/plantillas/${id}/reactivar`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            navigate("/admin/plantillas");
        } catch (err) {
            setError("Error al reactivar la plantilla.");
        } finally {
            setCargando(false);
        }
    }

    function formatearFecha(fecha) {
        if (!fecha) return "-";
        return new Date(fecha).toLocaleDateString("es-AR");
    }

    if (cargandoDatos) {
        return (
            <div className="baja-container">
                <div className="baja-card">
                    <p className="cargando-texto">Cargando plantilla...</p>
                </div>
            </div>
        );
    }

    if (error && !plantilla) {
        return (
            <div className="baja-container">
                <div className="baja-card">
                    <p className="mensaje-error">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="baja-container">
            <div className="baja-card">

                {/* Header */}
                <div className="baja-header">
                    <h1 className="payx-logo">Pay<span>X</span></h1>
                    <p className="baja-subtitulo">Gestión de Plantilla de Notificación</p>
                </div>

                <div className="baja-body">

                    {/* Volver */}
                    <span className="link-volver" onClick={() => navigate("/admin/plantillas")}>
                        ← Volver
                    </span>

                    {/* Info de la plantilla */}
                    <div className="plantilla-info-card">
                        <div className="plantilla-info-top">
                            <span className={`badge-estado ${plantilla.activa ? "activa" : "inactiva"}`}>
                                ● {plantilla.activa ? "Activa" : "Inactiva"}
                            </span>
                            <span className="badge-id">ID: #{plantilla.id}</span>
                        </div>
                        <div className="plantilla-info-datos">
                            <div className="dato-fila">
                                <span className="dato-label">Código:</span>
                                <span className="dato-valor">{plantilla.codigo}</span>
                            </div>
                            <div className="dato-fila">
                                <span className="dato-label">Nombre:</span>
                                <span className="dato-valor">{plantilla.nombre}</span>
                            </div>
                            <div className="dato-fila">
                                <span className="dato-label">Creada:</span>
                                <span className="dato-valor">{formatearFecha(plantilla.fechaCreacion)}</span>
                            </div>
                        </div>
                    </div>

                    {error && <div className="mensaje-error">{error}</div>}

                    {/* Botones segun estado */}
                    {plantilla.activa ? (
                        <button
                            className="btn-desactivar"
                            onClick={() => setModalVisible(true)}
                            disabled={cargando}
                        >
                            Desactivar Plantilla
                        </button>
                    ) : (
                        <button
                            className="btn-reactivar"
                            onClick={reactivar}
                            disabled={cargando}
                        >
                            {cargando ? "Reactivando..." : "Reactivar Plantilla"}
                        </button>
                    )}

                    <p className="link-volver-bottom" onClick={() => navigate("/admin/plantillas")}>
                        ← Volver al listado de plantillas
                    </p>
                </div>
            </div>

            {/* MODAL DE CONFIRMACION */}
            {modalVisible && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-icono">⚠</div>
                        <h2 className="modal-titulo">¿Desactivar plantilla?</h2>
                        <p className="modal-desc">
                            Estás por desactivar la plantilla:<br />
                            <strong>"{plantilla.nombre}" ({plantilla.codigo})</strong>
                        </p>
                        <ul className="modal-lista">
                            <li><span className="punto-naranja">●</span> Dejará de enviarse inmediatamente.</li>
                            <li><span className="punto-naranja">●</span> El registro se conserva para auditoría.</li>
                            <li><span className="punto-naranja">●</span> Puede reactivarse en cualquier momento.</li>
                        </ul>
                        <p className="modal-pregunta">¿Confirmás la desactivación?</p>
                        <div className="modal-botones">
                            <button
                                className="btn-no-cancelar"
                                onClick={() => setModalVisible(false)}
                                disabled={cargando}
                            >
                                No, cancelar
                            </button>
                            <button
                                className="btn-si-desactivar"
                                onClick={confirmarDesactivar}
                                disabled={cargando}
                            >
                                {cargando ? "Desactivando..." : "Sí, desactivar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BajaPlantilla;