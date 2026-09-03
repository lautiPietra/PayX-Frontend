import axios from 'axios';

const API_URL = 'http://localhost:8080/api/admin';

export const listarUsuarios = async () => {
    const response = await axios.get(`${API_URL}/usuarios`);
    return response.data;
};

export const buscarUsuarios = async (termino) => {
    const response = await axios.get(`${API_URL}/usuarios/buscar`, { params: { termino } });
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

export const obtenerLogs = async () => {
    const response = await axios.get(`${API_URL}/auditoria`);
    return response.data;
};