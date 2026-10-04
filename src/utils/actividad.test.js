import { describe, it, expect } from 'vitest';
import {
    construirActividades, categoriaMoneda, filtrarTransferencias, contarTransferencias, hayFiltrosTransferencia,
    filtrarPorTipo, SIN_FILTROS_TRANSFERENCIA, FILTROS_TRANSFERENCIA,
} from './actividad';

let contador = 0;
function transferencia(direccion, estado, moneda) {
    contador += 1;
    return {
        id: `t${contador}`, direccion, estado, moneda, monto: 10, concepto: '',
        fecha: `2026-10-0${(contador % 9) + 1}T12:00:00-03:00`, contraparteNombre: `Contraparte ${contador}`,
    };
}

// 6 transferencias que cubren las tres facetas:
//   t1 ENVIADA   COMPLETADA PESOS     t2 RECIBIDA COMPLETADA USD     t3 ENVIADA   PENDIENTE BTC
//   t4 RECIBIDA  PENDIENTE  PESOS     t5 ENVIADA  CANCELADA  USD     t6 RECIBIDA  COMPLETADA ETH
function armar() {
    contador = 0;
    const lista = [
        transferencia('ENVIADA', 'COMPLETADA', 'PESOS'),
        transferencia('RECIBIDA', 'COMPLETADA', 'USD'),
        transferencia('ENVIADA', 'PENDIENTE', 'BTC'),
        transferencia('RECIBIDA', 'PENDIENTE', 'PESOS'),
        transferencia('ENVIADA', 'CANCELADA', 'USD'),
        transferencia('RECIBIDA', 'COMPLETADA', 'ETH'),
    ];
    const items = filtrarPorTipo(construirActividades(lista, []), 'transferencias');
    return { lista, items };
}

const ids = (items) => items.map((i) => i.transferencia.id).sort();

describe('categoriaMoneda', () => {
    it('agrupa pesos, dolares y cualquier cripto; lo desconocido no cae en ninguna', () => {
        expect(categoriaMoneda('PESOS')).toBe('pesos');
        expect(categoriaMoneda('USD')).toBe('dolares');
        for (const cripto of ['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP']) {
            expect(categoriaMoneda(cripto)).toBe('cripto');
        }
        expect(categoriaMoneda('EUR')).toBeNull();
        expect(categoriaMoneda(undefined)).toBeNull();
    });
});

describe('filtrarTransferencias', () => {
    it('sin filtros devuelve la misma lista, sin recorrerla', () => {
        const { items } = armar();
        expect(filtrarTransferencias(items, SIN_FILTROS_TRANSFERENCIA)).toBe(items);
    });

    it('por direccion', () => {
        const { items } = armar();
        expect(ids(filtrarTransferencias(items, { ...SIN_FILTROS_TRANSFERENCIA, direccion: 'ENVIADA' }))).toEqual(['t1', 't3', 't5']);
        expect(ids(filtrarTransferencias(items, { ...SIN_FILTROS_TRANSFERENCIA, direccion: 'RECIBIDA' }))).toEqual(['t2', 't4', 't6']);
    });

    it('por estado: pendientes, completadas y canceladas son excluyentes', () => {
        const { items } = armar();
        expect(ids(filtrarTransferencias(items, { ...SIN_FILTROS_TRANSFERENCIA, estado: 'PENDIENTE' }))).toEqual(['t3', 't4']);
        expect(ids(filtrarTransferencias(items, { ...SIN_FILTROS_TRANSFERENCIA, estado: 'COMPLETADA' }))).toEqual(['t1', 't2', 't6']);
        expect(ids(filtrarTransferencias(items, { ...SIN_FILTROS_TRANSFERENCIA, estado: 'CANCELADA' }))).toEqual(['t5']);
    });

    it('por moneda: pesos, dolares y cripto (BTC y ETH juntas)', () => {
        const { items } = armar();
        expect(ids(filtrarTransferencias(items, { ...SIN_FILTROS_TRANSFERENCIA, moneda: 'pesos' }))).toEqual(['t1', 't4']);
        expect(ids(filtrarTransferencias(items, { ...SIN_FILTROS_TRANSFERENCIA, moneda: 'dolares' }))).toEqual(['t2', 't5']);
        expect(ids(filtrarTransferencias(items, { ...SIN_FILTROS_TRANSFERENCIA, moneda: 'cripto' }))).toEqual(['t3', 't6']);
    });

    it('las tres facetas se combinan con AND', () => {
        const { items } = armar();
        expect(ids(filtrarTransferencias(items, { direccion: 'ENVIADA', estado: 'COMPLETADA', moneda: 'pesos' }))).toEqual(['t1']);
        expect(ids(filtrarTransferencias(items, { direccion: 'RECIBIDA', estado: 'PENDIENTE', moneda: '' }))).toEqual(['t4']);
        expect(ids(filtrarTransferencias(items, { direccion: 'ENVIADA', estado: 'PENDIENTE', moneda: 'dolares' }))).toEqual([]);
    });

    it('un valor que no existe no deja pasar nada', () => {
        const { items } = armar();
        expect(filtrarTransferencias(items, { ...SIN_FILTROS_TRANSFERENCIA, estado: 'INEXISTENTE' })).toEqual([]);
    });
});

describe('hayFiltrosTransferencia', () => {
    it('es true apenas una faceta tiene valor', () => {
        expect(hayFiltrosTransferencia(SIN_FILTROS_TRANSFERENCIA)).toBe(false);
        expect(hayFiltrosTransferencia({ ...SIN_FILTROS_TRANSFERENCIA, direccion: 'ENVIADA' })).toBe(true);
        expect(hayFiltrosTransferencia({ ...SIN_FILTROS_TRANSFERENCIA, estado: 'PENDIENTE' })).toBe(true);
        expect(hayFiltrosTransferencia({ ...SIN_FILTROS_TRANSFERENCIA, moneda: 'cripto' })).toBe(true);
    });
});

describe('contarTransferencias', () => {
    it('sin filtros cuenta cada opcion sobre el total', () => {
        const { items } = armar();
        const c = contarTransferencias(items, SIN_FILTROS_TRANSFERENCIA);
        expect(c.direccion).toEqual({ '': 6, ENVIADA: 3, RECIBIDA: 3 });
        expect(c.estado).toEqual({ '': 6, PENDIENTE: 2, COMPLETADA: 3, CANCELADA: 1 });
        expect(c.moneda).toEqual({ '': 6, pesos: 2, dolares: 2, cripto: 2 });
    });

    it('cada faceta respeta las OTRAS elegidas pero no la propia', () => {
        const { items } = armar();
        const c = contarTransferencias(items, { direccion: '', estado: 'PENDIENTE', moneda: '' });
        // direccion y moneda se cuentan solo entre las pendientes (t3, t4)
        expect(c.direccion).toEqual({ '': 2, ENVIADA: 1, RECIBIDA: 1 });
        expect(c.moneda).toEqual({ '': 2, pesos: 1, dolares: 0, cripto: 1 });
        // estado NO se ve afectado por si mismo: sigue mostrando cuantas hay de cada estado
        expect(c.estado).toEqual({ '': 6, PENDIENTE: 2, COMPLETADA: 3, CANCELADA: 1 });
    });

    it('el numero de cada opcion es exactamente lo que devuelve el filtro al elegirla', () => {
        const { items } = armar();
        const base = { direccion: 'RECIBIDA', estado: '', moneda: 'pesos' };
        const c = contarTransferencias(items, base);
        for (const [faceta, opciones] of Object.entries(FILTROS_TRANSFERENCIA)) {
            for (const opcion of opciones) {
                const esperado = filtrarTransferencias(items, { ...base, [faceta]: opcion.id }).length;
                expect(c[faceta][opcion.id]).toBe(esperado);
            }
        }
    });

    it('con la lista vacia todo da cero', () => {
        const c = contarTransferencias([], SIN_FILTROS_TRANSFERENCIA);
        for (const faceta of Object.values(c)) {
            for (const n of Object.values(faceta)) expect(n).toBe(0);
        }
    });

    it('ignora los items que no son transferencias', () => {
        const { lista } = armar();
        const mezclados = construirActividades(lista, [{
            id: 'pf1', estado: 'ACTIVO', fechaCreacion: '2026-10-02T10:00:00-03:00', fechaVencimiento: '2026-11-02',
        }]);
        const c = contarTransferencias(mezclados, SIN_FILTROS_TRANSFERENCIA);
        expect(c.direccion['']).toBe(6);
    });
});
