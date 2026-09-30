import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/estadisticas`;

// dias=0 significa "todo el tiempo" (ver EstadisticaService en el backend).
export const obtenerEstadisticaGastos = async (dias = 30) => {
    const response = await axios.get(`${API_URL}/gastos`, { params: { dias } });
    return response.data;
};
