import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/asistente`;

// Le manda un mensaje al asistente junto con la conversacion hasta ahora (el backend no la
// guarda: se manda completa en cada pedido). historial: [{ rol: 'USUARIO'|'ASISTENTE', texto }].
// Devuelve { texto, accionSugerida } - accionSugerida viene null salvo que el asistente haya
// preparado una accion concreta (por ahora, una transferencia) en esta misma respuesta.
export const enviarMensajeAsistente = async (mensaje, historial) => {
    const response = await axios.post(`${API_URL}/mensaje`, { mensaje, historial });
    return response.data;
};
