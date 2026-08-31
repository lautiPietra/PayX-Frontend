import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./EditarPlantilla.css";

function EditarPlantilla() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        nombre: "",
        mensajeBase: "",
        requiereOrigen: false,
        requiereDestino: false,
    });

    const [codigoInmutable, setCodigoInmutable] = useState("");
    const [estadoActiva, setEstadoActiva] = useState(true);
    const [error, setError] = useState("");
    const [exito, setExito] = useState("");
    const [cargando, setCargando] = useState(false);
    const [cargandoDatos, setCargandoDatos] = useState(true);

    // Cargar datos de la plantilla al entrar
    useEffect(() => {
        async function cargarPlantilla() {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`http://localhost:8080/api/plantillas/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const p = res.data;
                setCodigoInmutable(p.codigo);
                setEstadoActiva(p.activa);
                setForm({
                    nombre: p.nombre,
                    mensajeBase: p.mensajeBase,
                    requiereOrigen: p.requiereOrigen,
                    requiereDestino: p.requiereDestino,
                });
            } catch (err) {
                setError("No se pudo cargar la plantilla.");
            } finally {
                setCargandoDatos(false);
            }
        }
        cargarPlantilla();
    }, [id]);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setExito("");

        if (!form.nombre || !form.mensajeBase) {
            setError("El nombre y el mensaje base son obligatorios.");
            return;
        }

        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            await axios.put(`http://localhost:8080/api/plantillas/${id}`, form, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setExito("Plantilla actualizada correctamente.");
            setTimeout(() => navigate("/admin/plantillas"), 1500);
        } catch (err) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError("Error al guardar los cambios.");
            }
        } finally {
            setCargando(false);
        }
    }

    if (cargandoDatos) {
        return (
            <div className="editar-plantilla-container">
                <div className="editar-plantilla-card">
                    <p className="cargando-texto">Cargando plantilla...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="editar-plantilla-container">
            <div className="editar-plantilla-card">

                <div className="editar-plantilla-header">
                    <h1 className="payx-logo">Pay<span>X</span></h1>
                    <p className="editar-plantilla-subtitulo">Modificación de Plantilla de Notificación</p>
                </div>

                <form onSubmit={handleSubmit} className="editar-plantilla-form">

                    {/* Volver + Estado + ID */}
                    <div className="editar-top-bar">
                        <span className="link-volver-top" onClick={() => navigate("/admin/plantillas")}>
                            ← Volver
                        </span>
                        <div className="editar-meta">
                            <span className={`badge-estado ${estadoActiva ? "activa" : "inactiva"}`}>
                                ● {estadoActiva ? "Activa" : "Inactiva"}
                            </span>
                            <span className="badge-id">ID: #{id}</span>
                        </div>
                    </div>

                    {/* CODIGO — inmutable */}
                    <div className="campo-grupo">
                        <label>
                            CÓDIGO
                            <span className="badge-no-editable">⬜ No editable</span>
                        </label>
                        <div className="input-con-icono input-bloqueado">
                            <span className="icono-campo">#</span>
                            <input
                                type="text"
                                value={codigoInmutable}
                                disabled
                            />
                        </div>
                    </div>

                    {/* NOMBRE */}
                    <div className="campo-grupo">
                        <label>NOMBRE</label>
                        <div className="input-con-icono">
                            <span className="icono-campo">Aa</span>
                            <input
                                type="text"
                                name="nombre"
                                value={form.nombre}
                                onChange={handleChange}
                                maxLength={100}
                            />
                        </div>
                    </div>

                    {/* MENSAJE BASE */}
                    <div className="campo-grupo">
                        <label>MENSAJE BASE</label>
                        <div className="textarea-con-icono">
                            <span className="icono-campo icono-textarea">M</span>
                            <textarea
                                name="mensajeBase"
                                value={form.mensajeBase}
                                onChange={handleChange}
                                rows={4}
                            />
                        </div>
                        <small className="hint">
                            Variables disponibles: <code>{"{{usuario}}"}</code> <code>{"{{monto}}"}</code> <code>{"{{fecha}}"}</code> <code>{"{{cuenta}}"}</code>
                        </small>
                    </div>

                    {/* DATOS REQUERIDOS */}
                    <div className="campo-grupo">
                        <label>DATOS REQUERIDOS</label>
                        <div
                            className={`checkbox-card ${form.requiereOrigen ? "activo" : ""}`}
                            onClick={() => setForm((p) => ({ ...p, requiereOrigen: !p.requiereOrigen }))}
                        >
                            <div className={`checkbox-custom ${form.requiereOrigen ? "checked" : ""}`}>
                                {form.requiereOrigen && <span>✓</span>}
                            </div>
                            <div>
                                <p className="checkbox-titulo">Requiere usuario origen</p>
                                <p className="checkbox-desc">La notificación necesita datos del usuario que inicia la transacción</p>
                            </div>
                        </div>
                        <div
                            className={`checkbox-card ${form.requiereDestino ? "activo" : ""}`}
                            onClick={() => setForm((p) => ({ ...p, requiereDestino: !p.requiereDestino }))}
                        >
                            <div className={`checkbox-custom ${form.requiereDestino ? "checked" : ""}`}>
                                {form.requiereDestino && <span>✓</span>}
                            </div>
                            <div>
                                <p className="checkbox-titulo">Requiere usuario destino</p>
                                <p className="checkbox-desc">La notificación necesita datos del usuario receptor de la transacción</p>
                            </div>
                        </div>
                    </div>

                    {/* Aviso codigo inmutable */}
                    <div className="aviso-codigo">
                        <span className="aviso-icono">⚠</span>
                        <div>
                            <p className="aviso-titulo">El campo Código no puede modificarse.</p>
                            <p className="aviso-desc">Cambiar el código rompería la lógica interna del sistema de disparadores.</p>
                        </div>
                    </div>

                    {/* Mensajes */}
                    {error && <div className="mensaje-error">{error}</div>}
                    {exito && <div className="mensaje-exito">{exito}</div>}

                    {/* Botones */}
                    <div className="botones-grupo">
                        <button
                            type="button"
                            className="btn-cancelar"
                            onClick={() => navigate("/admin/plantillas")}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-guardar"
                            disabled={cargando}
                        >
                            {cargando ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>

                    <p className="link-volver-bottom" onClick={() => navigate("/admin/plantillas")}>
                        ← Volver al listado de plantillas
                    </p>
                </form>
            </div>
        </div>
    );
}

export default EditarPlantilla;