import axios from 'axios';

const API_URL = 'http://localhost:8080/api/auth';

// Interceptor: agrega el token JWT automaticamente a cada peticion
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor de respuesta: si recibimos 401 (token expirado), cerramos sesion
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            // Solo redirigimos si no estamos en una pagina publica
            const rutasPublicas = ['/login', '/registro', '/verificacion', '/olvide-password', '/verificar-codigo-reset', '/nueva-password'];
            if (!rutasPublicas.includes(window.location.pathname)) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

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

export const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('usuario', JSON.stringify({
        id: response.data.id,
        nombreCompleto: response.data.nombreCompleto,
        email: response.data.email,
        nombreUsuario: response.data.nombreUsuario,
        rol: response.data.rol
    }));
    return response.data;
};

export const esAdmin = () => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario.rol === 'ADMIN';
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
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