import { describe, it, expect } from 'vitest';
import { excedeDecimales } from './montos';

describe('excedeDecimales', () => {
    it('pesos y dolares: hasta 2 decimales', () => {
        expect(excedeDecimales('100', 2)).toBe(false);
        expect(excedeDecimales('100.5', 2)).toBe(false);
        expect(excedeDecimales('100.55', 2)).toBe(false);
        expect(excedeDecimales('0.005', 2)).toBe(true);
        expect(excedeDecimales('100.001', 2)).toBe(true);
    });

    it('los ceros de mas no son decimales de mas', () => {
        expect(excedeDecimales('10.500', 2)).toBe(false);
        expect(excedeDecimales('10.', 2)).toBe(false);
    });

    it('cripto: hasta 8 decimales', () => {
        expect(excedeDecimales('0.00000001', 8)).toBe(false);
        expect(excedeDecimales('0.000000001', 8)).toBe(true);
    });

    it('notacion cientifica o vacio', () => {
        expect(excedeDecimales('1e-7', 8)).toBe(true);
        expect(excedeDecimales('', 2)).toBe(false);
        expect(excedeDecimales(undefined, 2)).toBe(false);
    });
});
