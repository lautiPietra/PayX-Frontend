import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AltaPlantilla.css";

function AltaPlantilla() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        codigo: "",
        nombre: "",
        mensajeBase: "",
        requiereOrigen: false,
        requiereDestino: false,
    });

    const [error, setError] = useState("");
    const [exito, setExito] = useState("");
    const [cargando, setCargando] = useState(false);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    // El codigo solo puede tener mayusculas, numeros y guion bajo
    function handleCodigo(e) {
        const valor = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "");
        setForm((prev) => ({ ...prev, codigo: valor }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setExito("");

        // Validaciones basicas
        if (!form.codigo || !form.nombre || !form.mensajeBase) {
            setError("Todos los campos obligatorios deben completarse.");
            return;
        }

        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post("http://localhost:8080/api/plantillas", form, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setExito("Plantilla creada correctamente.");
            setTimeout(() => navigate("/admin/plantillas"), 1500);
        } catch (err) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError("Error al crear la plantilla. Intentá de nuevo.");
            }
        } finally {
            setCargando(false);
        }
    }

    return (
        <div className="alta-plantilla-container">
            <div className="alta-plantilla-card">
                <div className="alta-plantilla-header">
                    <h1 className="payx-logo">Pay<span>X</span></h1>
                    <p className="alta-plantilla-subtitulo">Alta de Plantilla de Notificación</p>
                </div>

                <form onSubmit={handleSubmit} className="alta-plantilla-form">

                    {/* CODIGO */}
                    <div className="campo-grupo">
                        <label>CÓDIGO <span className="requerido">* Requerido</span></label>
                        <div className="input-con-icono">
                            <span className="icono-campo">#</span>
                            <input
                                type="text"
                                name="codigo"
                                value={form.codigo}
                                onChange={handleCodigo}
                                placeholder="TRANS_REC"
                                maxLength={50}
                            />
                        </div>
                        <small className="hint">Sin espacios · solo mayúsculas</small>
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
                                placeholder="Transferencia Recibida"
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
                                placeholder={"Escribe el contenido de la notificación.\nUsá variables para personalizar: {{usuario}}, {{monto}}, {{fecha}}, {{cuenta}}"}
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

                    {/* MENSAJES */}
                    {error && <div className="mensaje-error">{error}</div>}
                    {exito && <div className="mensaje-exito">{exito}</div>}

                    {/* BOTONES */}
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
                            className="btn-crear"
                            disabled={cargando}
                        >
                            {cargando ? "Creando..." : "Crear Plantilla"}
                        </button>
                    </div>

                    <p className="link-volver" onClick={() => navigate("/admin/plantillas")}>
                        ← Volver al listado de plantillas
                    </p>
                </form>
            </div>
        </div>
    );
}

export default AltaPlantilla;