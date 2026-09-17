import axios from 'axios';

const API_URL = 'http://localhost:8080/api/facturas';

export const listarServicios = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const listarHistorialFacturas = async () => {
    const response = await axios.get(`${API_URL}/historial`);
    return response.data;
};

export const pagarFactura = async (id) => {
    const response = await axios.post(`${API_URL}/${id}/pagar`);
    return response.data;
};
