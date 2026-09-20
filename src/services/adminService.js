import axios from 'axios';

const API_URL = 'http://localhost:8080/api/admin';

// Pagina de usuarios con busqueda y filtros resueltos en el backend. Los filtros
// vacios ('') no se mandan. Devuelve { contenido, pagina, tamanio, totalElementos, totalPaginas }.
export const listarUsuarios = async ({ pagina = 0, tamanio = 20, termino = '', rol = '', estado = '', orden = 'recientes' } = {}) => {
    const params = { pagina, tamanio, orden };
    if (termino) params.termino = termino;
    if (rol) params.rol = rol;
    if (estado) params.estado = estado;
    const response = await axios.get(`${API_URL}/usuarios`, { params });
    return response.data;
};

export const cambiarRol = async (usuarioId, nuevoRol) => {
    const response = await axios.put(`${API_URL}/usuarios/${usuarioId}/rol`, { nuevoRol });
    return response.data;
};

export const darDeBaja = async (usuarioId) => {
    const response = await axios.put(`${API_URL}/usuarios/${usuarioId}/baja`);
    return response.data;
};

export const reactivarUsuario = async (usuarioId) => {
    const response = await axios.put(`${API_URL}/usuarios/${usuarioId}/reactivar`);
    return response.data;
};

// Pagina de logs de auditoria, del mas reciente al mas viejo.
export const obtenerLogs = async ({ pagina = 0, tamanio = 20 } = {}) => {
    const response = await axios.get(`${API_URL}/auditoria`, { params: { pagina, tamanio } });
    return response.data;
};

// Metricas del dashboard para los ultimos "dias" (hoy incluido), con el periodo anterior de igual largo para comparar.
export const obtenerMetricas = async (dias = 30) => {
    const response = await axios.get(`${API_URL}/metricas`, { params: { dias } });
    return response.data;
};

// Monitor global de transacciones, paginado. desde/hasta son dias "yyyy-MM-dd", ambos incluidos.
// Los filtros vacios ('') no se mandan. Devuelve { contenido, pagina, tamanio, totalElementos, totalPaginas }.
export const listarTransacciones = async ({ pagina = 0, tamanio = 20, tipo = '', estado = '', desde = '', hasta = '', termino = '', usuarioId = '' } = {}) => {
    const params = { pagina, tamanio };
    if (tipo) params.tipo = tipo;
    if (estado) params.estado = estado;
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (termino) params.termino = termino;
    if (usuarioId) params.usuarioId = usuarioId;
    const response = await axios.get(`${API_URL}/transacciones`, { params });
    return response.data;
};

// Alertas de actividad sospechosa detectadas en las ultimas "horas" (1 a 168).
export const obtenerAlertas = async (horas = 24) => {
    const response = await axios.get(`${API_URL}/alertas`, { params: { horas } });
    return response.data;
};

// Ficha completa de un usuario: datos, saldos, productos, actividad, ultimas transacciones, alertas e historial de acciones de admins.
export const obtenerFicha = async (usuarioId) => {
    const response = await axios.get(`${API_URL}/usuarios/${usuarioId}/ficha`);
    return response.data;
};

// Exportaciones a CSV: el backend arma el archivo con los mismos filtros de cada lista (sin pagina).
// Devuelve { blob, filas, truncada }: "truncada" es true si con esos filtros habia mas filas que el tope y
// solo vienen las mas recientes. Con responseType 'blob' hasta el error JSON del backend llega como Blob:
// se lo lee y se deja en error.response.data, asi quien llama usa error.response.data.error como siempre.
async function pedirCsv(ruta, params) {
    try {
        const response = await axios.get(`${API_URL}/exportar/${ruta}`, { params, responseType: 'blob' });
        const filas = Number.parseInt(response.headers['x-filas-exportadas'], 10);
        return {
            blob: response.data,
            filas: Number.isFinite(filas) ? filas : null,
            truncada: response.headers['x-exportacion-truncada'] === 'true',
        };
    } catch (error) {
        if (error.response?.data instanceof Blob) {
            try {
                error.response.data = JSON.parse(await error.response.data.text());
            } catch {
                error.response.data = {};
            }
        }
        throw error;
    }
}

// Mismos filtros que listarUsuarios (sin pagina ni tamaño); los vacios ('') no se mandan.
export const exportarUsuarios = ({ termino = '', rol = '', estado = '', orden = 'recientes' } = {}) => {
    const params = { orden };
    if (termino) params.termino = termino;
    if (rol) params.rol = rol;
    if (estado) params.estado = estado;
    return pedirCsv('usuarios', params);
};

// Mismos filtros que listarTransacciones (sin pagina ni tamaño); los vacios ('') no se mandan.
export const exportarTransacciones = ({ tipo = '', estado = '', desde = '', hasta = '', termino = '', usuarioId = '' } = {}) => {
    const params = {};
    if (tipo) params.tipo = tipo;
    if (estado) params.estado = estado;
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (termino) params.termino = termino;
    if (usuarioId) params.usuarioId = usuarioId;
    return pedirCsv('transacciones', params);
};

export const exportarAuditoria = () => pedirCsv('auditoria', {});

export const exportarAlertas = (horas = 24) => pedirCsv('alertas', { horas });

// Configuracion editable (TNA de plazos fijos, montos y limites): valores vigentes, por defecto, limites e historial.
export const obtenerConfiguracion = async () => {
    const response = await axios.get(`${API_URL}/configuracion`);
    return response.data;
};

// Guarda cambios: { "plazo_fijo.tna.30": "38", ... } (los valores van como texto). Devuelve la configuracion actualizada.
export const guardarConfiguracion = async (cambios) => {
    const response = await axios.put(`${API_URL}/configuracion`, { cambios });
    return response.data;
};
