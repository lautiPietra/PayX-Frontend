import axios from 'axios';

const API_URL = 'http://localhost:8080/api/notificaciones';

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
