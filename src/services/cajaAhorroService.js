import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/cajas-ahorro`;

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

// Historial de movimientos de las cajas (alta, deposito, retiro), mas recientes primero, para "Ultimas
// actividades" y "Mis movimientos": [{ id, tipo: 'ALTA'|'DEPOSITO'|'RETIRO', cajaNombre, monto (null en el alta), fecha }].
export const listarMovimientosCajas = async () => {
    const response = await axios.get(`${API_URL}/movimientos`);
    return response.data;
};

// Cuantas cajas de ahorro puede tener cada usuario (lo define el admin desde el panel): { maxPorUsuario }.
export const obtenerLimiteCajas = async () => {
    const response = await axios.get(`${API_URL}/limite`);
    return response.data;
};
