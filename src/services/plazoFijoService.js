import axios from 'axios';

const API_URL = 'http://localhost:8080/api/plazos-fijos';

// Tasas disponibles por plazo, monto minimo y maximo de plazos fijos activos.
// Viene del backend para no duplicar (y poder desincronizar) las tasas del lado del cliente.
export const obtenerTasasPlazoFijo = async () => {
    const response = await axios.get(`${API_URL}/tasas`);
    return response.data;
};

// Constituye un plazo fijo. datos: { monto, plazoDias }
export const crearPlazoFijo = async (datos) => {
    const response = await axios.post(API_URL, datos);
    return response.data;
};

// Todos los plazos fijos del usuario logueado (activos y vencidos), mas recientes primero.
export const listarPlazosFijos = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};
