import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/facturas`;

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
