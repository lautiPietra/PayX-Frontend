import axios from 'axios';

const API_URL = 'http://localhost:8080/api/tarjeta';

// Numero completo, titular, cvv y vencimiento de la tarjeta virtual del usuario
// logueado. Se pide aparte de /api/perfil (que solo trae los ultimos 4 digitos)
// para que revelar el numero completo sea una accion explicita, no algo que
// viaje en cada carga del perfil.
export const obtenerTarjeta = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};
