import axios from 'axios';

const API_URL = 'http://localhost:8080/api/cripto';

// Compra o vende cripto al instante. datos: { tipo: 'COMPRA' | 'VENTA', simbolo: 'BTC'|'ETH'|'SOL', monto }
// Si tipo=COMPRA, monto son los pesos a destinar; si tipo=VENTA, es la cantidad de esa cripto a vender.
export const crearOperacionCripto = async (datos) => {
    const response = await axios.post(API_URL, datos);
    return response.data;
};

// Todas las compras/ventas de cripto del usuario logueado, mas recientes primero.
export const listarOperacionesCripto = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};
