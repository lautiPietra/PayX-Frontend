import axios from 'axios';

const API_URL = 'http://localhost:8080/api/cajas-ahorro';

export const listarCajasAhorro = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const crearCajaAhorro = async (datos) => {
    const response = await axios.post(API_URL, datos);
    return response.data;
};

export const editarCajaAhorro = async (id, datos) => {
    const response = await axios.put(`${API_URL}/${id}`, datos);
    return response.data;
};

export const depositarEnCajaAhorro = async (id, monto) => {
    const response = await axios.post(`${API_URL}/${id}/depositar`, { monto });
    return response.data;
};

export const retirarDeCajaAhorro = async (id, monto) => {
    const response = await axios.post(`${API_URL}/${id}/retirar`, { monto });
    return response.data;
};

export const eliminarCajaAhorro = async (id) => {
    await axios.delete(`${API_URL}/${id}`);
};
