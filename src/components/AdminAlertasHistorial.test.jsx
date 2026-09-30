import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminAlertasHistorial from './AdminAlertasHistorial';
import { obtenerHistorialAlertas, cambiarRevisionAlerta, volverAlertaAPendiente } from '../services/adminService';

vi.mock('../services/adminService', () => ({
    obtenerHistorialAlertas: vi.fn(),
    cambiarRevisionAlerta: vi.fn(),
    volverAlertaAPendiente: vi.fn(),
}));

const ANA = { id: 'u1', nombreCompleto: 'Ana Gómez', email: 'ana@payx.test', nombreUsuario: 'ana', fotoPerfilUrl: null, activo: true };

function fila(n, estado, extra = {}) {
    return {
        id: `MONTO_ALTO:${n}`, regla: 'MONTO_ALTO', severidad: 'ALTA', titulo: `Alerta guardada ${n}`,
        descripcion: `Descripción guardada ${n}`, fecha: '2026-01-14T10:00:00Z', usuario: ANA, monto: 900000, moneda: 'PESOS',
        estado, revision: {
            id: `rev-${n}`, estado, nota: estado === 'ANALIZADA' ? 'Hablé con el cliente' : null,
            adminNombre: 'Carla Admin', adminEmail: 'carla@payx.test', fecha: '2026-01-15T13:00:00Z',
        },
        ...extra,
    };
}

function pagina(contenido, extra = {}) {
    return {
        contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1, totalAproximado: false,
        disponible: true, ahora: '2026-01-15T15:00:00Z', ...extra,
    };
}

function renderizar(props = {}) {
    const onCambio = props.onCambio ?? vi.fn();
    render(<AdminAlertasHistorial onVerMovimientos={vi.fn()} onVerUsuario={vi.fn()} onCambio={onCambio} {...props} />);
    return { onCambio };
}

function ultimaConsulta() {
    return obtenerHistorialAlertas.mock.calls.at(-1)[0];
}

describe('AdminAlertasHistorial', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // jsdom no implementa scrollIntoView (el paginador lo usa para subir al principio de la lista).
        Element.prototype.scrollIntoView = vi.fn();
        obtenerHistorialAlertas.mockResolvedValue(pagina([fila(1, 'LEIDA'), fila(2, 'ANALIZADA')]));
    });

    it('muestra cada alerta con la copia guardada, su estado, quién la revisó y la nota', async () => {
        renderizar();

        expect(await screen.findByText('Alerta guardada 1')).toBeInTheDocument();
        expect(screen.getByText('Descripción guardada 2')).toBeInTheDocument();
        expect(screen.getByText('Leída')).toBeInTheDocument();
        expect(screen.getByText('Analizada')).toBeInTheDocument();
        expect(screen.getAllByText(/por Carla Admin/)).toHaveLength(2);
        expect(screen.getByText('“Hablé con el cliente”')).toBeInTheDocument();
        expect(screen.getByText('2 alertas')).toBeInTheDocument();
    });

    it('la primera consulta es la primera página, más recientes primero y sin filtros', async () => {
        renderizar();
        await screen.findByText('Alerta guardada 1');

        expect(ultimaConsulta()).toMatchObject({ pagina: 0, tamanio: 20, estado: '', severidad: '', regla: '', desde: '', hasta: '', termino: '', orden: 'recientes' });
    });

    it('filtrar por estado pide solo ese estado y vuelve a la primera página', async () => {
        renderizar();
        await screen.findByText('Alerta guardada 1');

        await userEvent.click(screen.getByRole('tab', { name: 'Analizadas' }));

        await waitFor(() => expect(ultimaConsulta().estado).toBe('ANALIZADA'));
        expect(ultimaConsulta().pagina).toBe(0);
        expect(screen.getByRole('tab', { name: 'Analizadas' })).toHaveAttribute('aria-selected', 'true');
    });

    it('filtra por gravedad, tipo y orden', async () => {
        renderizar();
        await screen.findByText('Alerta guardada 1');

        await userEvent.selectOptions(screen.getByLabelText('Filtrar por gravedad'), 'ALTA');
        await userEvent.selectOptions(screen.getByLabelText('Filtrar por tipo de alerta'), 'RAFAGA');
        await userEvent.selectOptions(screen.getByLabelText('Ordenar'), 'gravedad');

        await waitFor(() => expect(ultimaConsulta()).toMatchObject({ severidad: 'ALTA', regla: 'RAFAGA', orden: 'gravedad' }));
    });

    it('filtra por rango de fechas de revisión', async () => {
        renderizar();
        await screen.findByText('Alerta guardada 1');

        await userEvent.type(screen.getByLabelText('Revisadas desde'), '2026-01-10');
        await userEvent.type(screen.getByLabelText('hasta'), '2026-01-12');

        await waitFor(() => expect(ultimaConsulta()).toMatchObject({ desde: '2026-01-10', hasta: '2026-01-12' }));
    });

    it('con el rango invertido avisa y no le pregunta nada al backend', async () => {
        renderizar();
        await screen.findByText('Alerta guardada 1');
        const llamadasAntes = obtenerHistorialAlertas.mock.calls.length;

        await userEvent.type(screen.getByLabelText('hasta'), '2026-01-05');
        // El max/min del input ya frena la mayoria; se fuerza el caso escribiendo un "desde" posterior.
        const desde = screen.getByLabelText('Revisadas desde');
        desde.removeAttribute('max');
        await userEvent.type(desde, '2026-01-09');

        expect(await screen.findByText(/no puede ser posterior/)).toBeInTheDocument();
        expect(obtenerHistorialAlertas.mock.calls.length).toBe(llamadasAntes + 1 /* solo la del "hasta" solo */);
    });

    it('la búsqueda espera a que se deje de escribir y manda el texto sin espacios de más', async () => {
        renderizar();
        await screen.findByText('Alerta guardada 1');
        const llamadasAntes = obtenerHistorialAlertas.mock.calls.length;

        await userEvent.type(screen.getByLabelText('Buscar en el historial'), '  carla ');

        await waitFor(() => expect(ultimaConsulta().termino).toBe('carla'));
        // Escribir 7 caracteres no hizo 7 pedidos.
        expect(obtenerHistorialAlertas.mock.calls.length - llamadasAntes).toBeLessThanOrEqual(2);
    });

    it('"Limpiar" vuelve a los filtros de origen', async () => {
        renderizar();
        await screen.findByText('Alerta guardada 1');
        await userEvent.click(screen.getByRole('tab', { name: 'Leídas' }));
        await userEvent.selectOptions(screen.getByLabelText('Filtrar por gravedad'), 'BAJA');

        await userEvent.click(screen.getByRole('button', { name: /Limpiar/ }));

        await waitFor(() => expect(ultimaConsulta()).toMatchObject({ estado: '', severidad: '', orden: 'recientes' }));
        expect(screen.queryByRole('button', { name: /Limpiar/ })).not.toBeInTheDocument();
    });

    it('pasar una leída a analizada manda el estado y la nota, y recarga el historial y avisa al panel', async () => {
        cambiarRevisionAlerta.mockResolvedValue({});
        const { onCambio } = renderizar();
        const tarjeta = (await screen.findByText('Alerta guardada 1')).closest('.admin-alerta');
        const llamadasAntes = obtenerHistorialAlertas.mock.calls.length;

        await userEvent.click(within(tarjeta).getByRole('button', { name: 'Marcar como analizada' }));
        await userEvent.type(within(tarjeta).getByLabelText(/Nota/), 'Revisé los movimientos');
        await userEvent.click(within(tarjeta).getAllByRole('button', { name: 'Marcar como analizada' })[0]);

        await waitFor(() => expect(cambiarRevisionAlerta).toHaveBeenCalledWith('rev-1', 'ANALIZADA', 'Revisé los movimientos'));
        await waitFor(() => expect(obtenerHistorialAlertas.mock.calls.length).toBeGreaterThan(llamadasAntes));
        expect(onCambio).toHaveBeenCalled();
    });

    it('una analizada deja editar su nota (con la actual ya cargada)', async () => {
        cambiarRevisionAlerta.mockResolvedValue({});
        renderizar();
        const tarjeta = (await screen.findByText('Alerta guardada 2')).closest('.admin-alerta');

        await userEvent.click(within(tarjeta).getByRole('button', { name: 'Editar nota' }));
        const campo = within(tarjeta).getByLabelText(/Nota/);
        expect(campo).toHaveValue('Hablé con el cliente');
        await userEvent.clear(campo);
        await userEvent.type(campo, 'Nota corregida');
        await userEvent.click(within(tarjeta).getByRole('button', { name: 'Guardar nota' }));

        await waitFor(() => expect(cambiarRevisionAlerta).toHaveBeenCalledWith('rev-2', 'ANALIZADA', 'Nota corregida'));
    });

    it('"Volver a pendiente" pide confirmar y recién ahí la saca del historial', async () => {
        volverAlertaAPendiente.mockResolvedValue();
        const { onCambio } = renderizar();
        const tarjeta = (await screen.findByText('Alerta guardada 1')).closest('.admin-alerta');

        await userEvent.click(within(tarjeta).getByRole('button', { name: 'Volver a pendiente' }));
        expect(volverAlertaAPendiente).not.toHaveBeenCalled();
        await userEvent.click(within(tarjeta).getByRole('button', { name: 'Sí, volver a pendiente' }));

        await waitFor(() => expect(volverAlertaAPendiente).toHaveBeenCalledWith('rev-1'));
        expect(onCambio).toHaveBeenCalled();
    });

    it('cancelar el "volver a pendiente" no toca nada', async () => {
        renderizar();
        const tarjeta = (await screen.findByText('Alerta guardada 1')).closest('.admin-alerta');

        await userEvent.click(within(tarjeta).getByRole('button', { name: 'Volver a pendiente' }));
        await userEvent.click(within(tarjeta).getByRole('button', { name: 'Cancelar' }));

        expect(volverAlertaAPendiente).not.toHaveBeenCalled();
        expect(within(tarjeta).getByRole('button', { name: 'Volver a pendiente' })).toBeInTheDocument();
    });

    it('si una acción falla muestra el error en esa alerta y no avisa de un cambio que no hubo', async () => {
        volverAlertaAPendiente.mockRejectedValue({ response: { data: { error: 'La alerta no esta en el historial' } } });
        const { onCambio } = renderizar();
        const tarjeta = (await screen.findByText('Alerta guardada 1')).closest('.admin-alerta');

        await userEvent.click(within(tarjeta).getByRole('button', { name: 'Volver a pendiente' }));
        await userEvent.click(within(tarjeta).getByRole('button', { name: 'Sí, volver a pendiente' }));

        expect(await within(tarjeta).findByRole('alert')).toHaveTextContent('no esta en el historial');
        expect(onCambio).not.toHaveBeenCalled();
    });

    it('la paginación pide la página siguiente', async () => {
        obtenerHistorialAlertas.mockResolvedValue(pagina([fila(1, 'LEIDA')], { totalElementos: 45, totalPaginas: 3 }));
        renderizar();
        await screen.findByText('Alerta guardada 1');

        await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));

        await waitFor(() => expect(ultimaConsulta().pagina).toBe(1));
    });

    it('ir a la página 2 enseguida de abrir no vuelve a la 1 cuando vence el temporizador de la búsqueda', async () => {
        obtenerHistorialAlertas.mockResolvedValue(pagina([fila(1, 'LEIDA')], { totalElementos: 45, totalPaginas: 3 }));
        renderizar();
        await screen.findByText('Alerta guardada 1');

        await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
        // Pasa de sobra el tiempo de espera de la busqueda (350 ms) sin que nadie la haya tocado.
        await new Promise((resolver) => setTimeout(resolver, 600));

        expect(ultimaConsulta().pagina).toBe(1);
    });

    it('un cambio de filtro vuelve a la primera página', async () => {
        obtenerHistorialAlertas.mockResolvedValue(pagina([fila(1, 'LEIDA')], { totalElementos: 45, totalPaginas: 3 }));
        renderizar();
        await screen.findByText('Alerta guardada 1');
        await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
        await waitFor(() => expect(ultimaConsulta().pagina).toBe(1));

        await userEvent.click(screen.getByRole('tab', { name: 'Leídas' }));

        await waitFor(() => expect(ultimaConsulta()).toMatchObject({ estado: 'LEIDA', pagina: 0 }));
    });

    it('sin nada revisado explica de dónde sale el historial', async () => {
        obtenerHistorialAlertas.mockResolvedValue(pagina([]));
        renderizar();

        expect(await screen.findByText('Todavía no revisaste ninguna alerta')).toBeInTheDocument();
    });

    it('con filtros que no encuentran nada lo dice', async () => {
        obtenerHistorialAlertas.mockResolvedValue(pagina([]));
        renderizar();
        await screen.findByText('Todavía no revisaste ninguna alerta');

        await userEvent.click(screen.getByRole('tab', { name: 'Leídas' }));

        expect(await screen.findByText('No se encontraron alertas con esos filtros')).toBeInTheDocument();
    });

    it('sin la tabla en la base avisa qué hay que correr en vez de mostrar una lista vacía engañosa', async () => {
        obtenerHistorialAlertas.mockResolvedValue(pagina([], { disponible: false }));
        renderizar();

        expect(await screen.findByText(/sql\/alertas-revisadas\.sql/)).toBeInTheDocument();
        expect(screen.queryByText('Todavía no revisaste ninguna alerta')).not.toBeInTheDocument();
    });

    it('si falla la carga muestra el mensaje del backend', async () => {
        obtenerHistorialAlertas.mockRejectedValue({ response: { data: { error: 'Estado invalido' } } });
        renderizar();

        expect(await screen.findByText('Estado invalido')).toBeInTheDocument();
    });

    it('una alerta sin usuario ni fecha se muestra igual, sin romper', async () => {
        obtenerHistorialAlertas.mockResolvedValue(pagina([fila(1, 'LEIDA', { usuario: null, fecha: null })]));
        renderizar();

        expect(await screen.findByText('Alerta guardada 1')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Ver ficha' })).not.toBeInTheDocument();
    });
});
