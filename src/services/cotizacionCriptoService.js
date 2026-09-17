import axios from 'axios';

const API_URL = 'http://localhost:8080/api/cotizacion';

// Precio actual de BTC/ETH/SOL en pesos: [{ simbolo, nombre, precio, desactualizada }].
// Un unico precio por cripto (sin spread compra/venta), cacheado hasta 60s por el backend.
export const obtenerCotizacionesCripto = async () => {
    const response = await axios.get(`${API_URL}/cripto`);
    return response.data;
};
