import axios from 'axios';

const API_URL = 'http://localhost:8080/api/cambio-dolares';

// Compra o vende dolares al instante. datos: { tipo: 'COMPRA' | 'VENTA', monto }
// Si tipo=COMPRA, monto son los pesos a destinar; si tipo=VENTA, son los dolares a vender.
export const crearCambioDolares = async (datos) => {
    const response = await axios.post(API_URL, datos);
    return response.data;
};

// Todas las compras/ventas de dolares del usuario logueado, mas recientes primero.
export const listarCambiosDolares = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};
