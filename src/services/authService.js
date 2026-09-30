import axios from 'axios';
import { API_BASE_URL } from '../config';
import { limpiarConversacionAsistente } from '../utils/asistenteStorage';

const API_URL = `${API_BASE_URL}/api/auth`;

// Agrega el token JWT a cada peticion AL BACKEND DE PAYX. Antes lo agregaba a cualquier pedido hecho con axios:
// el dia que alguna pantalla le pegara con axios a otra API (una de cotizaciones, un CDN), le estaria mandando
// la sesion del usuario a un tercero. Separada del .use() de abajo para poder testearla sola.
export const agregarToken = (config) => {
    const token = localStorage.getItem('token');
    if (token && esPedidoAlBackend(config.url)) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
};

const esPedidoAlBackend = (url = '') => url.startsWith(`${API_BASE_URL}/`) || url.startsWith('/api/');

axios.interceptors.request.use(agregarToken);

// Nombre del header tal cual lo expone el backend (JwtFilter.HEADER_TOKEN_RENOVADO); axios entrega
// los headers de respuesta en minuscula sin importar como los mando el servidor.
const HEADER_TOKEN_RENOVADO = 'x-renewed-token';

// Sesion deslizante: si al token que mandamos le quedaba poco tiempo, el backend contesta con uno
// nuevo en este header (ver JwtFilter). Lo guardamos sin que el usuario note nada: mientras siga
// activo (mandando pedidos) la sesion se va renovando sola. Si deja de usar la app, no hay mas
// respuestas que traigan un token nuevo y la sesion vence sola a las 2hs, como corresponde.
export const guardarTokenRenovado = (response) => {
    const tokenRenovado = response?.headers?.[HEADER_TOKEN_RENOVADO];
    if (tokenRenovado) {
        localStorage.setItem('token', tokenRenovado);
    }
    return response;
};

// Si recibimos 401 (token expirado), cerramos sesion. Separada del .use() de abajo (en vez de
// una funcion anonima inline) para poder testearla sola, sin pelear con los internos de axios.
export const manejarRespuestaConError = (error) => {
    // Un @Valid que falla en el backend responde {"error":"Datos invalidos","campos":{"monto":"El monto tiene mas
    // decimales..."}}. Todas las pantallas muestran data.error: sin esto el usuario leia solo "Datos invalidos",
    // sin saber que corregir. Se reemplaza por el mensaje del primer campo con problemas.
    const campos = error.response?.data?.campos;
    if (campos && typeof campos === 'object') {
        const primero = Object.values(campos).find(Boolean);
        if (primero) {
            error.response.data.error = primero;
        }
    }

    if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        limpiarConversacionAsistente();
        // Solo redirigimos si no estamos en una pagina publica
        const rutasPublicas = ['/login', '/registro', '/verificacion', '/olvide-password', '/verificar-codigo-reset', '/nueva-password'];
        if (!rutasPublicas.includes(window.location.pathname)) {
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
};

axios.interceptors.response.use(guardarTokenRenovado, manejarRespuestaConError);

export const registrarUsuario = async (datos) => {
    const response = await axios.post(`${API_URL}/register`, datos);
    return response.data;
};

export const verificarCodigo = async (email, codigo) => {
    const response = await axios.post(`${API_URL}/verify-email`, { email, codigo });
    return response.data;
};

export const reenviarCodigo = async (email) => {
    const response = await axios.post(`${API_URL}/resend-code`, { email });
    return response.data;
};

// Guarda el token y los datos basicos del usuario logueado en localStorage.
const guardarSesion = (datos) => {
    localStorage.setItem('token', datos.token);
    localStorage.setItem('usuario', JSON.stringify({
        id: datos.id,
        nombreCompleto: datos.nombreCompleto,
        email: datos.email,
        nombreUsuario: datos.nombreUsuario,
        rol: datos.rol,
        fotoPerfilUrl: datos.fotoPerfilUrl
    }));
};

// Actualiza campos puntuales del usuario guardado (ej: foto de perfil nueva) y
// avisa al resto de la app (Navbar) para que se refresque sin recargar la pagina.
export const actualizarUsuarioGuardado = (cambios) => {
    const actual = JSON.parse(localStorage.getItem('usuario') || '{}');
    localStorage.setItem('usuario', JSON.stringify({ ...actual, ...cambios }));
    window.dispatchEvent(new Event('usuario-actualizado'));
};

export const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    guardarSesion(response.data);
    return response.data;
};

export const loginConGoogle = async (idToken) => {
    const response = await axios.post(`${API_URL}/google`, { idToken });
    guardarSesion(response.data);
    return response.data;
};

// Id del usuario logueado (null si no hay sesion): sirve para no ofrecerle acciones sobre su propia cuenta.
export const idUsuarioActual = () => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario.id ?? null;
};

export const esAdmin = () => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario.rol === 'ADMIN';
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    limpiarConversacionAsistente();
};

export const estaLogueado = () => {
    return localStorage.getItem('token') !== null;
};

export const solicitarResetPassword = async (email) => {
    const response = await axios.post(`${API_URL}/forgot-password`, { email });
    return response.data;
};

export const validarCodigoReset = async (email, codigo) => {
    const response = await axios.post(`${API_URL}/validate-reset-code`, { email, codigo });
    return response.data;
};

export const resetearPassword = async (email, codigo, nuevaPassword) => {
    const response = await axios.post(`${API_URL}/reset-password`, {
        email,
        codigo,
        nuevaPassword
    });
    return response.data;
};