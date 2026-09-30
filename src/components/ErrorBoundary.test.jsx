import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function PantallaQueRompe() {
    throw new Error('dato inesperado');
}

describe('ErrorBoundary', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sin errores muestra la pantalla normalmente', () => {
        render(<ErrorBoundary><p>Hola Ana</p></ErrorBoundary>);

        expect(screen.getByText('Hola Ana')).toBeInTheDocument();
    });

    it('si una pantalla tira un error, muestra un aviso con salida en vez de una pagina en blanco', () => {
        // React y el propio componente loguean el error: se silencia para no ensuciar la salida del test.
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<ErrorBoundary><PantallaQueRompe /></ErrorBoundary>);

        expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal');
        expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeInTheDocument();
    });
});
