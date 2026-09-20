const MONEDAS_CRIPTO = new Set(['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP']);

export function formatearNumero(valor, decimales = 2) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

// "$ 1.234,50" para pesos, "US$ 10,00" para dolares y "0,5 BTC" para cripto (sin ceros de
// relleno, con hasta 8 decimales para no perder precision).
export function formatearMontoConMoneda(valor, moneda) {
    if (MONEDAS_CRIPTO.has(moneda)) {
        return `${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${moneda}`;
    }
    const prefijo = moneda === 'USD' ? 'US$' : '$';
    return `${prefijo} ${formatearNumero(valor)}`;
}

// Variacion porcentual entre dos periodos: { tipo: 'porcentaje', valor } | { tipo: 'nuevo' } (habia 0 antes y ahora hay) | null.
export function calcularVariacion(actual, anterior) {
    const a = Number(actual);
    const b = Number(anterior);
    if (b > 0) return { tipo: 'porcentaje', valor: ((a - b) / b) * 100 };
    if (a > 0) return { tipo: 'nuevo' };
    return null;
}
