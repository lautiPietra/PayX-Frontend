import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/notificaciones`;

// Devuelve las notificaciones no leidas del usuario logueado, mas recientes primero.
export const obtenerNotificaciones = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const contarSinLeer = async () => {
    const response = await axios.get(`${API_URL}/sin-leer`);
    return response.data.cantidad;
};

// Marca todas las notificaciones del usuario como leidas (dejan de listarse).
export const marcarTodasLeidas = async () => {
    await axios.patch(`${API_URL}/leer`);
};
