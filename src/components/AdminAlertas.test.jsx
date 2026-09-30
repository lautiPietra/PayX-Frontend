import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminAlertas from './AdminAlertas';

// El historial se pide solo: aca no se prueba (ver AdminAlertasHistorial.test.jsx), solo que se abra.
vi.mock('./AdminAlertasHistorial', () => ({ default: () => <div>HISTORIAL ABIERTO</div> }));
vi.mock('./AdminExportar', () => ({ default: () => null }));

const ANA = { id: 'u1', nombreCompleto: 'Ana Gómez', email: 'ana@payx.test', nombreUsuario: 'ana', fotoPerfilUrl: null, activo: true };

function alerta(n, extra = {}) {
    return {
        id: `MONTO_ALTO:${n}`, regla: 'MONTO_ALTO', severidad: 'MEDIA', titulo: `Transferencia de monto alto ${n}`,
        descripcion: `Descripción ${n}`, fecha: '2026-01-15T14:00:00Z', usuario: ANA, monto: 600000, moneda: 'PESOS',
        estado: 'PENDIENTE', revision: null, ...extra,
    };
}

function datos(alertas, extra = {}) {
    return {
        horas: 24, desde: '2026-01-14T15:00:00Z', truncado: false, reglas: ['Una regla'], alertas,
        resumen: { alta: 0, media: alertas.length, baja: 0 }, revisadas: 0, historialDisponible: true, ...extra,
    };
}

function renderizar(datosAlertas, props = {}) {
    const onRevisar = props.onRevisar ?? vi.fn().mockResolvedValue({ revisadas: 1, noVigentes: 0 });
    render(
        <AdminAlertas
            resultado={{ datos: datosAlertas, cargando: false, error: '' }}
            horas={24}
            onCambiarHoras={vi.fn()}
            onActualizar={vi.fn()}
            onExportar={vi.fn()}
            onVerMovimientos={vi.fn()}
            onVerUsuario={vi.fn()}
            onDarDeBaja={vi.fn()}
            onRevisar={onRevisar}
            onCambioHistorial={vi.fn()}
            {...props}
        />
    );
    return { onRevisar };
}

describe('AdminAlertas: marcar como leída / analizada', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('cada alerta pendiente tiene sus botones y "Marcar como leída" la marca al instante, sin nota', async () => {
        const { onRevisar } = renderizar(datos([alerta(1)]));

        await userEvent.click(screen.getByRole('button', { name: /Marcar como leída/ }));

        expect(onRevisar).toHaveBeenCalledWith(['MONTO_ALTO:1'], 'LEIDA', null);
    });

    it('"Marcar como analizada" pide una nota opcional y la manda al confirmar', async () => {
        const { onRevisar } = renderizar(datos([alerta(1)]));

        await userEvent.click(screen.getByRole('button', { name: 'Marcar como analizada' }));
        await userEvent.type(screen.getByLabelText(/Nota/), '  Es una compra de auto  ');
        await userEvent.click(screen.getAllByRole('button', { name: 'Marcar como analizada' })[0]);

        expect(onRevisar).toHaveBeenCalledWith(['MONTO_ALTO:1'], 'ANALIZADA', 'Es una compra de auto');
    });

    it('se puede marcar como analizada sin escribir ninguna nota', async () => {
        const { onRevisar } = renderizar(datos([alerta(1)]));

        await userEvent.click(screen.getByRole('button', { name: 'Marcar como analizada' }));
        await userEvent.click(screen.getByRole('button', { name: 'Marcar como analizada' }));

        expect(onRevisar).toHaveBeenCalledWith(['MONTO_ALTO:1'], 'ANALIZADA', '');
    });

    it('cancelar la nota no marca nada y vuelve a los botones', async () => {
        const { onRevisar } = renderizar(datos([alerta(1)]));

        await userEvent.click(screen.getByRole('button', { name: 'Marcar como analizada' }));
        await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onRevisar).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /Marcar como leída/ })).toBeInTheDocument();
    });

    it('si el backend falla muestra el error en esa alerta y deja volver a intentar', async () => {
        const onRevisar = vi.fn().mockRejectedValue({ response: { data: { error: 'El historial de alertas todavia no esta habilitado' } } });
        renderizar(datos([alerta(1)]), { onRevisar });

        await userEvent.click(screen.getByRole('button', { name: /Marcar como leída/ }));

        expect(await screen.findByRole('alert')).toHaveTextContent('todavia no esta habilitado');
        expect(screen.getByRole('button', { name: /Marcar como leída/ })).toBeEnabled();
    });

    it('si la alerta ya no estaba vigente avisa en vez de hacer de cuenta que se marcó', async () => {
        const onRevisar = vi.fn().mockResolvedValue({ revisadas: 0, noVigentes: 1 });
        renderizar(datos([alerta(1)]), { onRevisar });

        await userEvent.click(screen.getByRole('button', { name: /Marcar como leída/ }));

        expect(await screen.findByRole('alert')).toHaveTextContent('ya no está vigente');
    });

    it('"Marcar todas como leídas" pide confirmación y manda los ids de todas las de la lista', async () => {
        const onRevisar = vi.fn().mockResolvedValue({ revisadas: 3, noVigentes: 0 });
        renderizar(datos([alerta(1), alerta(2), alerta(3)]), { onRevisar });

        await userEvent.click(screen.getByRole('button', { name: /Marcar todas como leídas \(3\)/ }));
        expect(onRevisar).not.toHaveBeenCalled(); // todavia falta confirmar
        expect(screen.getByText(/¿Marcar las 3 alertas de la lista como leídas\?/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Sí, marcar' }));

        expect(onRevisar).toHaveBeenCalledWith(['MONTO_ALTO:1', 'MONTO_ALTO:2', 'MONTO_ALTO:3'], 'LEIDA', null);
        expect(await screen.findByRole('status')).toHaveTextContent('3 alertas marcadas como leídas');
    });

    it('cancelar la confirmación masiva no marca nada', async () => {
        const { onRevisar } = renderizar(datos([alerta(1), alerta(2)]));

        await userEvent.click(screen.getByRole('button', { name: /Marcar todas como leídas/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onRevisar).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /Marcar todas como leídas/ })).toBeInTheDocument();
    });

    it('con una sola alerta no ofrece "marcar todas"', () => {
        renderizar(datos([alerta(1)]));

        expect(screen.queryByRole('button', { name: /Marcar todas/ })).not.toBeInTheDocument();
    });

    it('el aviso de la marca masiva cuenta las que ya no estaban vigentes', async () => {
        const onRevisar = vi.fn().mockResolvedValue({ revisadas: 1, noVigentes: 2 });
        renderizar(datos([alerta(1), alerta(2), alerta(3)]), { onRevisar });

        await userEvent.click(screen.getByRole('button', { name: /Marcar todas como leídas/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Sí, marcar' }));

        expect(await screen.findByRole('status')).toHaveTextContent('1 alerta marcada como leída. 2 ya no estaban vigentes');
    });

    it('sin la tabla del historial no ofrece marcar nada y explica qué falta', () => {
        renderizar(datos([alerta(1), alerta(2)], { historialDisponible: false }));

        expect(screen.queryByRole('button', { name: /Marcar como leída/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Marcar todas/ })).not.toBeInTheDocument();
        expect(screen.getByText(/sql\/alertas-revisadas\.sql/)).toBeInTheDocument();
        // Las alertas y sus otras acciones siguen andando igual que siempre.
        expect(screen.getAllByRole('button', { name: 'Ver ficha' })).toHaveLength(2);
    });
});

describe('AdminAlertas: vistas Pendientes / Historial', () => {
    it('muestra cuántas hay pendientes y las revisadas de la ventana con un acceso al historial', async () => {
        renderizar(datos([alerta(1), alerta(2)], { revisadas: 3 }));

        expect(screen.getByRole('tab', { name: 'Pendientes (2)' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText(/3 alertas de esta ventana ya están revisadas/)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Ver historial' }));

        expect(screen.getByText('HISTORIAL ABIERTO')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true');
    });

    it('se puede ir y volver entre pendientes e historial', async () => {
        renderizar(datos([alerta(1)]));

        await userEvent.click(screen.getByRole('tab', { name: 'Historial' }));
        expect(screen.getByText('HISTORIAL ABIERTO')).toBeInTheDocument();
        expect(screen.queryByText('Transferencia de monto alto 1')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: /Pendientes/ }));
        expect(screen.getByText('Transferencia de monto alto 1')).toBeInTheDocument();
    });

    it('cuando ya revisó todas lo dice, en vez de "Todo tranquilo"', () => {
        renderizar(datos([], { revisadas: 4 }));

        expect(screen.getByText('No quedan alertas pendientes')).toBeInTheDocument();
        expect(screen.queryByText('Todo tranquilo')).not.toBeInTheDocument();
    });

    it('sin nada revisado y sin alertas sigue diciendo "Todo tranquilo"', () => {
        renderizar(datos([]));

        expect(screen.getByText('Todo tranquilo')).toBeInTheDocument();
    });

    it('cada alerta conserva sus acciones de siempre junto a las de revisar', () => {
        renderizar(datos([alerta(1)]));

        const tarjeta = screen.getByText('Transferencia de monto alto 1').closest('.admin-alerta');
        expect(within(tarjeta).getByRole('button', { name: 'Ver movimientos' })).toBeInTheDocument();
        expect(within(tarjeta).getByRole('button', { name: 'Ver ficha' })).toBeInTheDocument();
        expect(within(tarjeta).getByRole('button', { name: 'Dar de baja' })).toBeInTheDocument();
    });
});
