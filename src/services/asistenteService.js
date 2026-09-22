import axios from 'axios';

const API_URL = 'http://localhost:8080/api/asistente';

// Le manda un mensaje al asistente junto con la conversacion hasta ahora (el backend no la
// guarda: se manda completa en cada pedido). historial: [{ rol: 'USUARIO'|'ASISTENTE', texto }].
// Devuelve { texto, accionSugerida } - accionSugerida viene null salvo que el asistente haya
// preparado una accion concreta (por ahora, una transferencia) en esta misma respuesta.
export const enviarMensajeAsistente = async (mensaje, historial) => {
    const response = await axios.post(`${API_URL}/mensaje`, { mensaje, historial });
    return response.data;
};
