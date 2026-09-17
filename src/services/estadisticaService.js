import axios from 'axios';

const API_URL = 'http://localhost:8080/api/estadisticas';

// dias=0 significa "todo el tiempo" (ver EstadisticaService en el backend).
export const obtenerEstadisticaGastos = async (dias = 30) => {
    const response = await axios.get(`${API_URL}/gastos`, { params: { dias } });
    return response.data;
};
