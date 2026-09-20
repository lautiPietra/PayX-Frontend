// Que numeros de pagina mostrar sin importar cuantas haya (con 50.000 paginas no se
// pueden dibujar todas): siempre la primera, la ultima y las vecinas a la actual,
// con un marcador "salto-N" (string) donde se omiten paginas. Las paginas se numeran
// desde 0, como el backend.
export function paginasVisibles(actual, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);

    const visibles = new Set([0, total - 1, actual - 1, actual, actual + 1]);
    if (actual <= 2) [1, 2, 3].forEach((i) => visibles.add(i));
    if (actual >= total - 3) [total - 2, total - 3, total - 4].forEach((i) => visibles.add(i));

    const ordenadas = [...visibles].filter((i) => i >= 0 && i < total).sort((a, b) => a - b);
    const resultado = [];
    ordenadas.forEach((pagina, i) => {
        if (i > 0 && pagina - ordenadas[i - 1] > 1) resultado.push(`salto-${pagina}`);
        resultado.push(pagina);
    });
    return resultado;
}
