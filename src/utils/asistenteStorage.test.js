import { describe, it, expect, beforeEach } from 'vitest';
import { CLAVE_CHAT_MENSAJES, CLAVE_CHAT_ABIERTO, CLAVE_CHAT_ACCION_PENDIENTE, limpiarConversacionAsistente } from './asistenteStorage';

describe('limpiarConversacionAsistente', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('borra las tres claves de la charla del asistente', () => {
        sessionStorage.setItem(CLAVE_CHAT_MENSAJES, JSON.stringify([{ rol: 'USUARIO', texto: 'hola' }]));
        sessionStorage.setItem(CLAVE_CHAT_ABIERTO, 'true');
        sessionStorage.setItem(CLAVE_CHAT_ACCION_PENDIENTE, JSON.stringify({ tipo: 'TRANSFERENCIA' }));

        limpiarConversacionAsistente();

        expect(sessionStorage.getItem(CLAVE_CHAT_MENSAJES)).toBeNull();
        expect(sessionStorage.getItem(CLAVE_CHAT_ABIERTO)).toBeNull();
        expect(sessionStorage.getItem(CLAVE_CHAT_ACCION_PENDIENTE)).toBeNull();
    });

    it('no toca otras claves de sessionStorage que no son del asistente', () => {
        sessionStorage.setItem('algo-de-otra-pantalla', 'no me borres');

        limpiarConversacionAsistente();

        expect(sessionStorage.getItem('algo-de-otra-pantalla')).toBe('no me borres');
    });

    it('no rompe si las claves ya estaban vacias (ej: usuario que nunca abrio el chat)', () => {
        expect(() => limpiarConversacionAsistente()).not.toThrow();
    });
});
