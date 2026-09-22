// Claves de sessionStorage que usa el chat del asistente (ver AsistenteChat.jsx). Viven en un
// archivo aparte, y no en el propio componente, para que authService.js pueda limpiarlas al
// cerrar sesion sin que un service (sin JSX, sin estado de React) dependa de un componente.
export const CLAVE_CHAT_MENSAJES = 'payx-chat-mensajes';
export const CLAVE_CHAT_ABIERTO = 'payx-chat-abierto';
export const CLAVE_CHAT_ACCION_PENDIENTE = 'payx-accion-asistente';

// La conversacion vive en sessionStorage (no en el backend) para sobrevivir a la navegacion entre
// paginas. Eso alcanza para que se borre sola al cerrar la pestaña/navegador, pero NO al cerrar
// sesion sin cerrar la pestaña: si otra persona (u otra cuenta) usa el mismo navegador despues,
// veria la charla de la sesion anterior. Por eso se limpia a mano en cada logout (manual o por
// token vencido, ver authService.js).
export function limpiarConversacionAsistente() {
    sessionStorage.removeItem(CLAVE_CHAT_MENSAJES);
    sessionStorage.removeItem(CLAVE_CHAT_ABIERTO);
    sessionStorage.removeItem(CLAVE_CHAT_ACCION_PENDIENTE);
}
