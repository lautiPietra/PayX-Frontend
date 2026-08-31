import axios from 'axios';

const API_URL = 'http://localhost:8080/api/perfil';

export const obtenerPerfil = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const actualizarPerfil = async (datos) => {
    const response = await axios.put(API_URL, datos);
    return response.data;
};

export const cambiarPassword = async (passwordActual, nuevaPassword) => {
    const response = await axios.put(`${API_URL}/password`, {
        passwordActual,
        nuevaPassword
    });
    return response.data;
};