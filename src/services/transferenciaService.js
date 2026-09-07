import axios from 'axios';

const API_URL = 'http://localhost:8080/api/transferencias';

// Crea una transferencia. datos: { destinatario, moneda, monto, concepto, tipo }
// tipo: 'DIRECTA' (mueve la plata al instante) o 'PENDIENTE' (queda a la espera de confirmacion).
export const crearTransferencia = async (datos) => {
    const response = await axios.post(API_URL, datos);
    return response.data;
};

// Todas las transferencias del usuario logueado (enviadas y recibidas), mas recientes primero.
export const listarTransferencias = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const obtenerTransferencia = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

// Solo puede hacerlo quien envio la transferencia.
export const actualizarConceptoTransferencia = async (id, concepto) => {
    const response = await axios.patch(`${API_URL}/${id}/concepto`, { concepto });
    return response.data;
};

// Confirma una transferencia pendiente: recien ahi se mueve la plata. Solo el emisor.
export const confirmarTransferencia = async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/confirmar`);
    return response.data;
};

// Cancela una transferencia pendiente (nunca se movio plata). Solo el emisor.
export const cancelarTransferencia = async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/cancelar`);
    return response.data;
};
