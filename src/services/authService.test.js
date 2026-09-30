import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logout, manejarRespuestaConError, guardarTokenRenovado, agregarToken } from './authService';
import { API_BASE_URL } from '../config';
import { CLAVE_CHAT_MENSAJES, CLAVE_CHAT_ABIERTO, CLAVE_CHAT_ACCION_PENDIENTE } from '../utils/asistenteStorage';

// Deja la sesion Y la charla del asistente como si el usuario ya hubiera usado la app un rato.
function simularSesionYCharlaActivas() {
    localStorage.setItem('token', 'un-jwt-cualquiera');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombreCompleto: 'Ana' }));
    sessionStorage.setItem(CLAVE_CHAT_MENSAJES, JSON.stringify([{ rol: 'USUARIO', texto: 'hola' }]));
    sessionStorage.setItem(CLAVE_CHAT_ABIERTO, 'true');
    sessionStorage.setItem(CLAVE_CHAT_ACCION_PENDIENTE, JSON.stringify({ tipo: 'TRANSFERENCIA' }));
}

function esperarTodoLimpio() {
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
    expect(sessionStorage.getItem(CLAVE_CHAT_MENSAJES)).toBeNull();
    expect(sessionStorage.getItem(CLAVE_CHAT_ABIERTO)).toBeNull();
    expect(sessionStorage.getItem(CLAVE_CHAT_ACCION_PENDIENTE)).toBeNull();
}

describe('logout', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('borra la sesion (localStorage) y la charla del asistente (sessionStorage)', () => {
        simularSesionYCharlaActivas();

        logout();

        esperarTodoLimpio();
    });
});

describe('manejarRespuestaConError (interceptor de 401)', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('con un 401 en una pagina privada, cierra la sesion, borra la charla y redirige a /login', async () => {
        simularSesionYCharlaActivas();
        vi.stubGlobal('location', { pathname: '/inicio', href: '' });

        await expect(manejarRespuestaConError({ response: { status: 401 } })).rejects.toBeTruthy();

        esperarTodoLimpio();
        expect(location.href).toBe('/login');
    });

    it('con un 401 estando ya en una pagina publica (ej: /login), limpia pero no fuerza la redireccion', async () => {
        simularSesionYCharlaActivas();
        vi.stubGlobal('location', { pathname: '/login', href: '' });

        await expect(manejarRespuestaConError({ response: { status: 401 } })).rejects.toBeTruthy();

        esperarTodoLimpio();
        expect(location.href).toBe('');
    });

    it('con un error que no es 401 (ej: 400 de validacion), no toca ni la sesion ni la charla', async () => {
        simularSesionYCharlaActivas();
        vi.stubGlobal('location', { pathname: '/inicio', href: '' });

        await expect(manejarRespuestaConError({ response: { status: 400 } })).rejects.toBeTruthy();

        expect(localStorage.getItem('token')).toBe('un-jwt-cualquiera');
        expect(sessionStorage.getItem(CLAVE_CHAT_MENSAJES)).not.toBeNull();
        expect(location.href).toBe('');
    });

    it('siempre rechaza la promesa con el error original, para que el .catch() de quien llamo lo siga viendo', async () => {
        vi.stubGlobal('location', { pathname: '/inicio', href: '' });
        const errorOriginal = { response: { status: 500 }, message: 'boom' };

        await expect(manejarRespuestaConError(errorOriginal)).rejects.toBe(errorOriginal);
    });
});

describe('guardarTokenRenovado (sesion deslizante)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('si la respuesta trae el header del token renovado, reemplaza el token guardado', () => {
        localStorage.setItem('token', 'token-viejo');
        const respuesta = { headers: { 'x-renewed-token': 'token-nuevo' } };

        const resultado = guardarTokenRenovado(respuesta);

        expect(localStorage.getItem('token')).toBe('token-nuevo');
        expect(resultado).toBe(respuesta);
    });

    it('sin el header, deja el token guardado tal como estaba', () => {
        localStorage.setItem('token', 'token-viejo');

        guardarTokenRenovado({ headers: {} });

        expect(localStorage.getItem('token')).toBe('token-viejo');
    });

    it('no rompe si la respuesta no trae headers', () => {
        localStorage.setItem('token', 'token-viejo');

        expect(() => guardarTokenRenovado({})).not.toThrow();
        expect(localStorage.getItem('token')).toBe('token-viejo');
    });
});

describe('agregarToken (interceptor de pedidos)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('agrega el token a los pedidos al backend de PayX', () => {
        localStorage.setItem('token', 'jwt-de-ana');

        const config = agregarToken({ url: `${API_BASE_URL}/api/perfil`, headers: {} });

        expect(config.headers.Authorization).toBe('Bearer jwt-de-ana');
    });

    it('NO le manda el token de la sesion a otras APIs', () => {
        localStorage.setItem('token', 'jwt-de-ana');

        const config = agregarToken({ url: 'https://api.otro-sitio.com/v1/datos', headers: {} });

        expect(config.headers.Authorization).toBeUndefined();
    });

    it('tampoco a un dominio que solo "empieza parecido" al del backend', () => {
        // "http://localhost:8080.evil.com" empieza con "http://localhost:8080" pero es otro sitio.
        localStorage.setItem('token', 'jwt-de-ana');

        const config = agregarToken({ url: `${API_BASE_URL}.evil.com/robar`, headers: {} });

        expect(config.headers.Authorization).toBeUndefined();
    });

    it('sin sesion no agrega nada', () => {
        const config = agregarToken({ url: `${API_BASE_URL}/api/auth/login`, headers: {} });

        expect(config.headers.Authorization).toBeUndefined();
    });
});
