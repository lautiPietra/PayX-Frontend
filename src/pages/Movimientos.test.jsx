import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Movimientos from './Movimientos';
import { listarTransferencias } from '../services/transferenciaService';

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../services/transferenciaService', () => ({ listarTransferencias: vi.fn() }));
vi.mock('../services/plazoFijoService', () => ({ listarPlazosFijos: vi.fn().mockResolvedValue([]) }));
vi.mock('../services/cambioDolaresService', () => ({ listarCambiosDolares: vi.fn().mockResolvedValue([]) }));
vi.mock('../services/criptoService', () => ({ listarOperacionesCripto: vi.fn().mockResolvedValue([]) }));
vi.mock('../services/facturaService', () => ({ listarHistorialFacturas: vi.fn().mockResolvedValue([]) }));
vi.mock('../services/cajaAhorroService', () => ({ listarMovimientosCajas: vi.fn().mockResolvedValue([]) }));

let n = 0;
// Cada transferencia lleva un nombre de contraparte propio ("Contraparte 3") para poder reconocerla en pantalla.
function t(direccion, estado, moneda) {
    n += 1;
    return {
        id: `t${n}`, direccion, estado, moneda, monto: 100, concepto: '', esEmisor: direccion === 'ENVIADA',
        fecha: '2026-10-01T15:00:00-03:00', fechaConfirmacion: null,
        contraparteNombre: `Contraparte ${n}`, contraparteAlias: `alias.${n}`,
    };
}

// 1 ENVIADA COMPLETADA PESOS · 2 RECIBIDA COMPLETADA USD · 3 ENVIADA PENDIENTE BTC
// 4 RECIBIDA PENDIENTE PESOS · 5 ENVIADA CANCELADA USD · 6 RECIBIDA COMPLETADA ETH
function transferenciasDePrueba() {
    n = 0;
    return [
        t('ENVIADA', 'COMPLETADA', 'PESOS'),
        t('RECIBIDA', 'COMPLETADA', 'USD'),
        t('ENVIADA', 'PENDIENTE', 'BTC'),
        t('RECIBIDA', 'PENDIENTE', 'PESOS'),
        t('ENVIADA', 'CANCELADA', 'USD'),
        t('RECIBIDA', 'COMPLETADA', 'ETH'),
    ];
}

async function abrir(transferencias = transferenciasDePrueba()) {
    listarTransferencias.mockResolvedValue(transferencias);
    const user = userEvent.setup();
    render(
        <MemoryRouter>
            <Movimientos />
        </MemoryRouter>
    );
    await screen.findByRole('button', { name: /Todos los tipos/ });
    return user;
}

const chipTransferencias = () => screen.getByRole('button', { name: /^Transferencias/ });
const select = (nombre) => screen.getByLabelText(nombre);
const visible = (numero) => screen.queryByText(new RegExp(`Contraparte ${numero}$`));

async function elegirTransferencias(user) {
    await user.click(chipTransferencias());
}

describe('Movimientos - filtros de transferencias', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        listarTransferencias.mockReset();
    });

    it('los desplegables solo aparecen al elegir "Transferencias"', async () => {
        const user = await abrir();
        expect(screen.queryByLabelText('Dirección')).not.toBeInTheDocument();

        await elegirTransferencias(user);
        expect(select('Dirección')).toBeInTheDocument();
        expect(select('Estado')).toBeInTheDocument();
        expect(select('Moneda')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /^Todos los tipos/ }));
        expect(screen.queryByLabelText('Dirección')).not.toBeInTheDocument();
    });

    it('con otro tipo elegido tampoco aparecen', async () => {
        const user = await abrir();
        await user.click(screen.getByRole('button', { name: /^Dólares/ }));
        expect(screen.queryByLabelText('Estado')).not.toBeInTheDocument();
    });

    it('al abrirlos muestran todas las transferencias', async () => {
        const user = await abrir();
        await elegirTransferencias(user);
        for (const numero of [1, 2, 3, 4, 5, 6]) expect(visible(numero)).toBeInTheDocument();
    });

    it('"Enviadas" deja solo las enviadas y "Recibidas" solo las recibidas', async () => {
        const user = await abrir();
        await elegirTransferencias(user);

        await user.selectOptions(select('Dirección'), 'ENVIADA');
        expect([1, 3, 5].every((x) => visible(x))).toBe(true);
        expect([2, 4, 6].some((x) => visible(x))).toBe(false);

        await user.selectOptions(select('Dirección'), 'RECIBIDA');
        expect([2, 4, 6].every((x) => visible(x))).toBe(true);
        expect([1, 3, 5].some((x) => visible(x))).toBe(false);
    });

    it('estado: pendientes, completadas y canceladas', async () => {
        const user = await abrir();
        await elegirTransferencias(user);

        await user.selectOptions(select('Estado'), 'PENDIENTE');
        expect([3, 4].every((x) => visible(x))).toBe(true);
        expect([1, 2, 5, 6].some((x) => visible(x))).toBe(false);

        await user.selectOptions(select('Estado'), 'COMPLETADA');
        expect([1, 2, 6].every((x) => visible(x))).toBe(true);
        expect([3, 4, 5].some((x) => visible(x))).toBe(false);

        await user.selectOptions(select('Estado'), 'CANCELADA');
        expect(visible(5)).toBeInTheDocument();
        expect([1, 2, 3, 4, 6].some((x) => visible(x))).toBe(false);
    });

    it('moneda: pesos, dolares y cripto', async () => {
        const user = await abrir();
        await elegirTransferencias(user);

        await user.selectOptions(select('Moneda'), 'pesos');
        expect([1, 4].every((x) => visible(x))).toBe(true);
        expect([2, 3, 5, 6].some((x) => visible(x))).toBe(false);

        await user.selectOptions(select('Moneda'), 'dolares');
        expect([2, 5].every((x) => visible(x))).toBe(true);
        expect([1, 3, 4, 6].some((x) => visible(x))).toBe(false);

        await user.selectOptions(select('Moneda'), 'cripto');
        expect([3, 6].every((x) => visible(x))).toBe(true);
        expect([1, 2, 4, 5].some((x) => visible(x))).toBe(false);
    });

    it('los tres desplegables se combinan entre si', async () => {
        const user = await abrir();
        await elegirTransferencias(user);

        await user.selectOptions(select('Dirección'), 'ENVIADA');
        await user.selectOptions(select('Estado'), 'COMPLETADA');
        await user.selectOptions(select('Moneda'), 'pesos');

        expect(visible(1)).toBeInTheDocument();
        expect([2, 3, 4, 5, 6].some((x) => visible(x))).toBe(false);
    });

    it('cada opcion muestra cuantas transferencias trae, respetando lo ya elegido', async () => {
        const user = await abrir();
        await elegirTransferencias(user);

        expect(within(select('Dirección')).getByRole('option', { name: 'Enviadas · 3' })).toBeInTheDocument();
        expect(within(select('Estado')).getByRole('option', { name: 'Pendientes · 2' })).toBeInTheDocument();
        expect(within(select('Moneda')).getByRole('option', { name: 'Cripto · 2' })).toBeInTheDocument();

        await user.selectOptions(select('Estado'), 'PENDIENTE');
        // entre las 2 pendientes: 1 enviada y 1 recibida; 1 en pesos y 1 cripto
        expect(within(select('Dirección')).getByRole('option', { name: 'Enviadas · 1' })).toBeInTheDocument();
        expect(within(select('Moneda')).getByRole('option', { name: 'Dólares · 0' })).toBeInTheDocument();
    });

    it('el resumen dice cuantos movimientos se muestran del total', async () => {
        const user = await abrir();
        await elegirTransferencias(user);
        await user.selectOptions(select('Estado'), 'PENDIENTE');
        expect(screen.getByText('2 de 6 movimientos')).toBeInTheDocument();
    });

    it('una combinacion sin resultados lo avisa y "Ver todos" limpia todo', async () => {
        const user = await abrir();
        await elegirTransferencias(user);
        await user.selectOptions(select('Dirección'), 'ENVIADA');
        await user.selectOptions(select('Estado'), 'PENDIENTE');
        await user.selectOptions(select('Moneda'), 'dolares');

        expect(screen.getByText('No hay transferencias que coincidan con esos filtros.')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Ver todos los movimientos' }));
        expect(screen.queryByLabelText('Dirección')).not.toBeInTheDocument();
        for (const numero of [1, 2, 3, 4, 5, 6]) expect(visible(numero)).toBeInTheDocument();
    });

    it('cambiar a otro tipo y volver deja los desplegables en "Todas" (no quedan filtros ocultos)', async () => {
        const user = await abrir();
        await elegirTransferencias(user);
        await user.selectOptions(select('Estado'), 'PENDIENTE');

        await user.click(screen.getByRole('button', { name: /^Dólares/ }));
        await elegirTransferencias(user);

        expect(select('Estado')).toHaveValue('');
        for (const numero of [1, 2, 3, 4, 5, 6]) expect(visible(numero)).toBeInTheDocument();
    });

    it('volver a tocar "Transferencias" estando elegida NO borra lo que ya se filtro', async () => {
        const user = await abrir();
        await elegirTransferencias(user);
        await user.selectOptions(select('Moneda'), 'cripto');

        await user.click(chipTransferencias());

        expect(select('Moneda')).toHaveValue('cripto');
        expect([3, 6].every((x) => visible(x))).toBe(true);
        expect([1, 2, 4, 5].some((x) => visible(x))).toBe(false);
    });

    it('"Limpiar filtros" borra los desplegables, el tipo y los oculta', async () => {
        const user = await abrir();
        await elegirTransferencias(user);
        await user.selectOptions(select('Dirección'), 'RECIBIDA');

        await user.click(screen.getByRole('button', { name: /Limpiar filtros/ }));

        expect(screen.queryByLabelText('Dirección')).not.toBeInTheDocument();
        for (const numero of [1, 2, 3, 4, 5, 6]) expect(visible(numero)).toBeInTheDocument();
    });

    it('un desplegable con valor elegido se marca como activo', async () => {
        const user = await abrir();
        await elegirTransferencias(user);
        expect(select('Estado')).not.toHaveClass('activo');

        await user.selectOptions(select('Estado'), 'COMPLETADA');
        expect(select('Estado')).toHaveClass('activo');

        await user.selectOptions(select('Estado'), '');
        expect(select('Estado')).not.toHaveClass('activo');
    });

    it('cambiar un desplegable vuelve a la primera pagina', async () => {
        // 70 enviadas + 40 recibidas = 110 movimientos (4 paginas de 30). Al elegir "Enviadas" quedan 70 (3 paginas):
        // sin volver a la pagina 1 se quedaria en la ultima (3) en vez de arrancar de nuevo.
        n = 0;
        const muchas = [
            ...Array.from({ length: 70 }, () => t('ENVIADA', 'COMPLETADA', 'PESOS')),
            ...Array.from({ length: 40 }, () => t('RECIBIDA', 'COMPLETADA', 'PESOS')),
        ];
        const user = await abrir(muchas);
        await elegirTransferencias(user);

        await user.click(screen.getByRole('button', { name: '4' }));
        expect(screen.getByText('Página 4 de 4')).toBeInTheDocument();

        await user.selectOptions(select('Dirección'), 'ENVIADA');
        expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    });

    it('sin ningun movimiento no se muestran filtros, solo el aviso', async () => {
        listarTransferencias.mockResolvedValue([]);
        render(
            <MemoryRouter>
                <Movimientos />
            </MemoryRouter>
        );
        expect(await screen.findByText('Todavía no tenés movimientos')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Transferencias/ })).not.toBeInTheDocument();
    });
});
