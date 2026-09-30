// Client ID de Google OAuth (Google Cloud Console). No es un dato secreto:
// el Client ID viaja al navegador de todos modos para iniciar el flujo de Google Identity Services.
export const GOOGLE_CLIENT_ID = '343739360282-1k277j9fbr1ent38lcd7t8qlsqgaf703.apps.googleusercontent.com';

// URL del backend. Antes estaba escrita a mano ("http://localhost:8080") en cada servicio y pagina: publicado
// el frontend, el navegador de cada usuario le pegaba a SU PROPIA maquina y no funcionaba nada. En produccion
// se define VITE_API_URL al hacer el build (ej. VITE_API_URL=https://payx-backend.onrender.com); en desarrollo,
// sin definirla, sigue usando el backend local de siempre. No es un secreto: termina dentro del JS publicado.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
