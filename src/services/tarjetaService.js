import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/tarjeta`;

// Numero completo, titular, cvv y vencimiento de la tarjeta virtual del usuario
// logueado. Se pide aparte de /api/perfil (que solo trae los ultimos 4 digitos)
// para que revelar el numero completo sea una accion explicita, no algo que
// viaje en cada carga del perfil.
export const obtenerTarjeta = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};
