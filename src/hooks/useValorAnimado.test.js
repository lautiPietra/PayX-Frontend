import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useValorAnimado } from './useValorAnimado';

// Evita correr 60 cuadros reales por test: el mock de requestAnimationFrame salta el reloj mockeado
// bien por delante de cualquier duracionMs usada, asi el primer (y unico) cuadro ya ve progreso >= 1.
function stubearAnimacionInstantanea() {
    let ahora = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => ahora);
    vi.stubGlobal('requestAnimationFrame', (cb) => {
        ahora += 10000;
        return setTimeout(() => cb(ahora), 0);
    });
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
}

describe('useValorAnimado', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        stubearAnimacionInstantanea();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('arranca mostrando el valor inicial, sin flash de color (no hay "cambio" que animar en el primer render)', () => {
        const { result } = renderHook(() => useValorAnimado(100));

        expect(result.current[0]).toBe(100);
        expect(result.current[1]).toBeNull();
    });

    it('cuando el valor sube, termina en el nuevo valor y marca la direccion "sube"', async () => {
        const { result, rerender } = renderHook(({ valor }) => useValorAnimado(valor), { initialProps: { valor: 100 } });

        rerender({ valor: 150 });
        await act(async () => { await vi.runOnlyPendingTimersAsync(); });

        expect(result.current[0]).toBe(150);
        expect(result.current[1]).toBe('sube');
    });

    it('cuando el valor baja, marca la direccion "baja"', async () => {
        const { result, rerender } = renderHook(({ valor }) => useValorAnimado(valor), { initialProps: { valor: 100 } });

        rerender({ valor: 50 });
        await act(async () => { await vi.runOnlyPendingTimersAsync(); });

        expect(result.current[0]).toBe(50);
        expect(result.current[1]).toBe('baja');
    });

    it('el color se mantiene "sube"/"baja" durante sostenerColorMs y despues vuelve a null (sin movimiento)', async () => {
        const { result, rerender } = renderHook(
            ({ valor }) => useValorAnimado(valor, 900, 2500),
            { initialProps: { valor: 100 } },
        );

        rerender({ valor: 150 });
        await act(async () => { await vi.runOnlyPendingTimersAsync(); });
        expect(result.current[1]).toBe('sube');

        // Todavia no paso el tiempo de sostenerColorMs: sigue coloreado.
        await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
        expect(result.current[1]).toBe('sube');

        await act(async () => { await vi.advanceTimersByTimeAsync(600); });
        expect(result.current[1]).toBeNull();
    });

    it('un cambio minimo (ruido de punto flotante entre dos cotizaciones "iguales") no dispara ningun flash', () => {
        const { result, rerender } = renderHook(({ valor }) => useValorAnimado(valor), { initialProps: { valor: 61234 } });

        rerender({ valor: 61234.0001 });

        expect(result.current[1]).toBeNull();
    });

    it('un valor null (todavia sin cotizacion cargada) no rompe nada y no anima', () => {
        const { result } = renderHook(() => useValorAnimado(null));

        expect(result.current[0]).toBeNull();
        expect(result.current[1]).toBeNull();
    });
});
