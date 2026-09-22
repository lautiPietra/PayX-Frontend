import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { logout } from '../services/authService';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/authService', () => ({
    logout: vi.fn(),
}));

vi.mock('../services/notificacionService', () => ({
    obtenerNotificaciones: vi.fn().mockResolvedValue([]),
    marcarTodasLeidas: vi.fn().mockResolvedValue(),
}));

function renderNavbar() {
    return render(
        <MemoryRouter initialEntries={['/inicio']}>
            <Navbar />
        </MemoryRouter>
    );
}

describe('Navbar - confirmacion antes de cerrar sesion', () => {
    beforeEach(() => {
        localStorage.setItem('usuario', JSON.stringify({
            id: 1, nombreCompleto: 'Ana Gomez', email: 'ana@test.com', rol: 'USUARIO',
        }));
    });

    afterEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('el boton de logout de escritorio pide confirmacion y NO cierra la sesion todavia', async () => {
        const user = userEvent.setup();
        renderNavbar();

        await user.click(screen.getByTitle('Cerrar sesion'));

        expect(screen.getByText('¿Cerrar sesión?')).toBeInTheDocument();
        expect(logout).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('"Cancelar" cierra el cartel sin cerrar la sesion', async () => {
        const user = userEvent.setup();
        renderNavbar();
        await user.click(screen.getByTitle('Cerrar sesion'));

        await user.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByText('¿Cerrar sesión?')).not.toBeInTheDocument();
        expect(logout).not.toHaveBeenCalled();
    });

    it('hacer click afuera del cartel (fondo oscuro) tambien cancela, sin cerrar sesion', async () => {
        const user = userEvent.setup();
        const { container } = renderNavbar();
        await user.click(screen.getByTitle('Cerrar sesion'));

        await user.click(container.querySelector('.navbar-logout-overlay'));

        expect(screen.queryByText('¿Cerrar sesión?')).not.toBeInTheDocument();
        expect(logout).not.toHaveBeenCalled();
    });

    it('hacer click ADENTRO del cartel no lo cierra (no se propaga al fondo)', async () => {
        const user = userEvent.setup();
        renderNavbar();
        await user.click(screen.getByTitle('Cerrar sesion'));

        await user.click(screen.getByText('¿Cerrar sesión?'));

        expect(screen.getByText('¿Cerrar sesión?')).toBeInTheDocument();
        expect(logout).not.toHaveBeenCalled();
    });

    it('confirmar en el cartel recien ahi cierra la sesion y redirige a /login', async () => {
        const user = userEvent.setup();
        renderNavbar();
        await user.click(screen.getByTitle('Cerrar sesion'));

        await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

        expect(logout).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/login');
        expect(screen.queryByText('¿Cerrar sesión?')).not.toBeInTheDocument();
    });

    it('el boton de logout del menu mobile tambien pide confirmacion, y de paso cierra el menu hamburguesa', async () => {
        const user = userEvent.setup();
        const { container } = renderNavbar();

        await user.click(screen.getByLabelText('Menu'));
        expect(container.querySelector('.navbar-menu-mobile')).toHaveClass('abierto');

        await user.click(container.querySelector('.navbar-menu-logout'));

        expect(screen.getByText('¿Cerrar sesión?')).toBeInTheDocument();
        expect(logout).not.toHaveBeenCalled();
        expect(container.querySelector('.navbar-menu-mobile')).not.toHaveClass('abierto');
    });
});
