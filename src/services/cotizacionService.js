import axios from 'axios';

const API_URL = 'http://localhost:8080/api/cotizacion';

// Cotizacion oficial del dolar { compra, venta, fechaActualizacion, desactualizada }.
// El backend la cachea hasta 60s, asi que pollear esto seguido no abusa de ninguna API externa.
export const obtenerCotizacionDolar = async () => {
    const response = await axios.get(`${API_URL}/dolar`);
    return response.data;
};
