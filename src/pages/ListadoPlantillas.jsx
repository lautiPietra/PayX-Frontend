import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ListadoPlantillas.css";

const ITEMS_POR_PAGINA = 5;

function ListadoPlantillas() {
    const navigate = useNavigate();

    const [plantillas, setPlantillas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState("todas"); // "todas" | "activas" | "inactivas"
    const [paginaActual, setPaginaActual] = useState(1);

    useEffect(() => {
        cargarPlantillas();
    }, []);

    async function cargarPlantillas() {
        setCargando(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("http://localhost:8080/api/plantillas", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPlantillas(res.data);
        } catch (err) {
            setError("No se pudieron cargar las plantillas.");
        } finally {
            setCargando(false);
        }
    }

    // Aplicar filtro de estado
    function aplicarFiltroEstado(lista) {
        if (filtro === "activas") return lista.filter((p) => p.activa);
        if (filtro === "inactivas") return lista.filter((p) => !p.activa);
        return lista;
    }

    // Aplicar busqueda por codigo o nombre
    function aplicarBusqueda(lista) {
        if (!busqueda.trim()) return lista;
        const texto = busqueda.toLowerCase();
        return lista.filter(
            (p) =>
                p.codigo.toLowerCase().includes(texto) ||
                p.nombre.toLowerCase().includes(texto)
        );
    }

    // Resetear pagina al cambiar filtro o busqueda
    function handleFiltro(nuevo) {
        setFiltro(nuevo);
        setPaginaActual(1);
    }

    function handleBusqueda(e) {
        setBusqueda(e.target.value);
        setPaginaActual(1);
    }

    function resolverVariables(p) {
        const vars = [];
        if (p.requiereOrigen) vars.push("Origen");
        if (p.requiereDestino) vars.push("Destino");
        if (vars.length === 0) return "Ninguna";
        return vars.join(" · ");
    }

    const plantillasFiltradas = aplicarBusqueda(aplicarFiltroEstado(plantillas));
    const totalPaginas = Math.ceil(plantillasFiltradas.length / ITEMS_POR_PAGINA);
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const plantillasPagina = plantillasFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);

    return (
        <div className="listado-container">
            <div className="listado-card">

                {/* Header */}
                <div className="listado-header">
                    <h1 className="payx-logo">Pay<span>X</span></h1>
                    <p className="listado-subtitulo">Listado de Plantillas de Notificación</p>
                </div>

                <div className="listado-body">

                    {/* Barra de busqueda + boton nueva */}
                    <div className="listado-top-bar">
                        <div className="buscador">
                            <span className="buscador-icono">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar por código o nombre..."
                                value={busqueda}
                                onChange={handleBusqueda}
                            />
                        </div>
                        <button
                            className="btn-nueva"
                            onClick={() => navigate("/admin/plantillas/nueva")}
                        >
                            + Nueva Plantilla
                        </button>
                    </div>

                    {/* Filtros de estado */}
                    <div className="filtros-bar">
                        <button
                            className={`btn-filtro ${filtro === "todas" ? "activo" : ""}`}
                            onClick={() => handleFiltro("todas")}
                        >
                            Todas
                        </button>
                        <button
                            className={`btn-filtro ${filtro === "activas" ? "activo" : ""}`}
                            onClick={() => handleFiltro("activas")}
                        >
                            Activas
                        </button>
                        <button
                            className={`btn-filtro ${filtro === "inactivas" ? "activo" : ""}`}
                            onClick={() => handleFiltro("inactivas")}
                        >
                            Inactivas
                        </button>
                    </div>

                    {/* Contador */}
                    {!cargando && !error && (
                        <p className="contador-resultados">
                            {plantillasFiltradas.length} plantilla{plantillasFiltradas.length !== 1 ? "s" : ""} encontrada{plantillasFiltradas.length !== 1 ? "s" : ""}
                        </p>
                    )}

                    {/* Estado de carga */}
                    {cargando && <p className="cargando-texto">Cargando plantillas...</p>}
                    {error && <p className="mensaje-error">{error}</p>}

                    {/* Tabla */}
                    {!cargando && !error && plantillasFiltradas.length > 0 && (
                        <>
                            <div className="tabla-wrapper">
                                <table className="tabla-plantillas">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Nombre</th>
                                            <th>Variables</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {plantillasPagina.map((p) => (
                                            <tr key={p.id}>
                                                <td>
                                                    <span className="badge-codigo">{p.codigo}</span>
                                                </td>
                                                <td className="nombre-celda">{p.nombre}</td>
                                                <td className="variables-celda">{resolverVariables(p)}</td>
                                                <td>
                                                    <span className={`badge-estado ${p.activa ? "activa" : "inactiva"}`}>
                                                        ● {p.activa ? "Activa" : "Inactiva"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="acciones-celda">
                                                        <button
                                                            className="btn-accion btn-editar"
                                                            onClick={() => navigate(`/admin/plantillas/${p.id}/editar`)}
                                                            title="Editar"
                                                        >
                                                            ✏
                                                        </button>
                                                        <button
                                                            className="btn-accion btn-baja"
                                                            onClick={() => navigate(`/admin/plantillas/${p.id}/baja`)}
                                                            title={p.activa ? "Desactivar" : "Reactivar"}
                                                        >
                                                            🗑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginacion */}
                            {totalPaginas > 1 && (
                                <div className="paginacion">
                                    <button
                                        className="btn-pag"
                                        onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                                        disabled={paginaActual === 1}
                                    >
                                        &lt;
                                    </button>
                                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                                        <button
                                            key={n}
                                            className={`btn-pag ${paginaActual === n ? "activo" : ""}`}
                                            onClick={() => setPaginaActual(n)}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                    <button
                                        className="btn-pag"
                                        onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
                                        disabled={paginaActual === totalPaginas}
                                    >
                                        &gt;
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Sin resultados */}
                    {!cargando && !error && plantillasFiltradas.length === 0 && (
                        <div className="sin-resultados">
                            <span className="sin-resultados-icono">🔍</span>
                            <p className="sin-resultados-titulo">Sin resultados</p>
                            <p className="sin-resultados-desc">No se encontraron plantillas con ese filtro.</p>
                        </div>
                    )}

                    <p className="footer-texto">PayX Admin · Gestión de Notificaciones</p>
                </div>
            </div>
        </div>
    );
}

export default ListadoPlantillas;