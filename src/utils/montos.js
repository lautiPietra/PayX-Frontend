// true si el monto escrito en un input tiene mas decimales de los que admite su moneda (2 para pesos y dolares,
// 8 para cripto). El backend los rechaza igual (un saldo en pesos se guarda con 2 decimales: aceptar $ 0,005
// creaba plata de la nada), pero asi el usuario se entera en el formulario y no despues de confirmar.
// Los ceros de mas no cuentan ("10.500" son 10,50). Una notacion como "1e-7" (que el input type=number deja
// escribir) cuenta como invalida: no es algo que alguien escriba a proposito como monto.
export function excedeDecimales(texto, maxDecimales) {
    const limpio = String(texto ?? '').trim();
    if (/e/i.test(limpio)) return true;
    const punto = limpio.indexOf('.');
    if (punto < 0) return false;
    const decimales = limpio.slice(punto + 1).replace(/0+$/, '');
    return decimales.length > maxDecimales;
}
