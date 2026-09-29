import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AsistenteChat from './AsistenteChat';
import { CLAVE_CHAT_MENSAJES, CLAVE_CHAT_ABIERTO, limpiarConversacionAsistente } from '../utils/asistenteStorage';

vi.mock('../services/asistenteService', () => ({
    enviarMensajeAsistente: vi.fn(),
}));

const SALUDO_INICIAL_REGEX = /Preguntame lo que quieras sobre tu cuenta/;

function renderChat() {
    return render(
        <MemoryRouter>
            <AsistenteChat />
        </MemoryRouter>
    );
}

describe('AsistenteChat <-> asistenteStorage (mismas claves de sessionStorage)', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('lee la charla guardada bajo las claves exportadas por asistenteStorage (regresion: antes eran constantes locales duplicadas)', () => {
        sessionStorage.setItem(CLAVE_CHAT_ABIERTO, JSON.stringify(true));
        sessionStorage.setItem(CLAVE_CHAT_MENSAJES, JSON.stringify([
            { rol: 'ASISTENTE', texto: 'Charla previa que deberia seguir viendose' },
        ]));

        renderChat();

        expect(screen.getByText('Charla previa que deberia seguir viendose')).toBeInTheDocument();
    });

    it('muestra en negrita lo que el asistente manda entre ** ** en vez de los asteriscos literales', () => {
        sessionStorage.setItem(CLAVE_CHAT_ABIERTO, JSON.stringify(true));
        sessionStorage.setItem(CLAVE_CHAT_MENSAJES, JSON.stringify([
            { rol: 'ASISTENTE', texto: 'Tu saldo es de **$500.000**, todo en orden' },
        ]));

        renderChat();

        expect(screen.getByText('$500.000').tagName).toBe('STRONG');
        expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
        // El resto del mensaje sigue viendose, sin quedar partido de forma rara.
        expect(screen.getByText(/Tu saldo es de/)).toBeInTheDocument();
        expect(screen.getByText(/todo en orden/)).toBeInTheDocument();
    });

    it('despues de un logout (limpiarConversacionAsistente), un chat nuevo arranca con el saludo por defecto y no con datos de la cuenta anterior', async () => {
        const user = userEvent.setup();
        sessionStorage.setItem(CLAVE_CHAT_ABIERTO, JSON.stringify(true));
        sessionStorage.setItem(CLAVE_CHAT_MENSAJES, JSON.stringify([
            { rol: 'ASISTENTE', texto: 'Tu saldo es de $500.000, dato de la cuenta anterior' },
        ]));

        limpiarConversacionAsistente();
        renderChat();

        // El panel arranca cerrado (CLAVE_ABIERTO tambien se borra en el logout): lo abrimos para inspeccionar.
        await user.click(screen.getByLabelText('Abrir asistente'));

        expect(screen.queryByText(/dato de la cuenta anterior/)).not.toBeInTheDocument();
        expect(screen.getByText(SALUDO_INICIAL_REGEX)).toBeInTheDocument();
    });
});
