import { paginasVisibles } from '../utils/paginacion';
import './AdminPaginacion.css';

function formatearNumero(n) {
    return Number(n).toLocaleString('es-AR');
}

// Paginador reutilizable: rango mostrado, botones anterior/siguiente, numeros de
// pagina (en pantalla desde 1; internamente desde 0, como el backend) y,
// opcionalmente, el selector de cuantas filas por pagina.
function AdminPaginacion({ pagina, totalPaginas, totalElementos, tamanio, cantidadEnPagina, onCambiarPagina, tamanios, onCambiarTamanio, deshabilitado, totalAproximado = false }) {
    if (totalElementos === 0) return null;

    const desde = pagina * tamanio + 1;
    const hasta = desde + Math.max(cantidadEnPagina, 1) - 1;

    return (
        <div className="admin-paginacion">
            <div className="admin-paginacion-info">
                <span>Mostrando {formatearNumero(desde)}–{formatearNumero(Math.min(hasta, totalElementos))} de {totalAproximado ? "más de " : ""}{formatearNumero(totalElementos)}</span>
                {onCambiarTamanio && (
                    <label className="admin-paginacion-tamanio">
                        Por página
                        <select value={tamanio} onChange={(e) => onCambiarTamanio(Number(e.target.value))} disabled={deshabilitado}>
                            {tamanios.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                )}
            </div>

            {totalPaginas > 1 && (
                <nav className="admin-paginacion-botones" aria-label="Paginación">
                    <button
                        className="admin-paginacion-btn"
                        onClick={() => onCambiarPagina(pagina - 1)}
                        disabled={deshabilitado || pagina <= 0}
                        aria-label="Página anterior"
                    >
                        ‹
                    </button>
                    {paginasVisibles(pagina, totalPaginas).map((p) => (
                        typeof p === 'string'
                            ? <span key={p} className="admin-paginacion-salto">…</span>
                            : (
                                <button
                                    key={p}
                                    className={`admin-paginacion-btn ${p === pagina ? 'activo' : ''}`}
                                    onClick={() => onCambiarPagina(p)}
                                    disabled={deshabilitado}
                                    aria-current={p === pagina ? 'page' : undefined}
                                >
                                    {formatearNumero(p + 1)}
                                </button>
                            )
                    ))}
                    <button
                        className="admin-paginacion-btn"
                        onClick={() => onCambiarPagina(pagina + 1)}
                        disabled={deshabilitado || pagina >= totalPaginas - 1}
                        aria-label="Página siguiente"
                    >
                        ›
                    </button>
                </nav>
            )}
        </div>
    );
}

export default AdminPaginacion;
