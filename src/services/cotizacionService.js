import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/cotizacion`;

// Cotizacion oficial del dolar { compra, venta, fechaActualizacion, desactualizada }.
// El backend la cachea hasta 60s, asi que pollear esto seguido no abusa de ninguna API externa.
export const obtenerCotizacionDolar = async () => {
    const response = await axios.get(`${API_URL}/dolar`);
    return response.data;
};
