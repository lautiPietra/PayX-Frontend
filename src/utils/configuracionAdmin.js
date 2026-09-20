// Funciones puras de la pestaña de configuracion del panel de admin (separadas del componente para poder probarlas solas).
// Las reglas de validacion son un espejo de ConfiguracionService del backend, que es el que decide de verdad:
// aca solo sirven para avisar al instante, antes de mandar.

const FORMA_DECIMAL = /^\d{1,12}(\.\d{1,2})?$/;
const FORMA_ENTERO = /^\d{1,9}$/;

// "36,5" -> "36.5"; sin espacios en los bordes.
export function normalizarTexto(texto) {
    return String(texto ?? '').trim().replace(',', '.');
}

// '' si el texto es un valor valido para ese item; si no, el mensaje para mostrar.
export function validarValor(item, texto) {
    const limpio = normalizarTexto(texto);
    if (limpio === '') return 'Ingresá un valor';
    const esEntero = item.tipo === 'ENTERO';
    if (!(esEntero ? FORMA_ENTERO : FORMA_DECIMAL).test(limpio)) {
        return esEntero ? 'Tiene que ser un número entero' : 'Tiene que ser un número con hasta 2 decimales';
    }
    const numero = Number(limpio);
    if (numero < Number(item.minimo) || numero > Number(item.maximo)) {
        return `Tiene que estar entre ${formatearValor(item.unidad, item.minimo)} y ${formatearValor(item.unidad, item.maximo)}`;
    }
    return '';
}

// Si lo escrito es distinto del valor vigente. Un texto invalido tambien cuenta como cambio: asi se ve su error y no se puede guardar.
export function esCambio(item, texto) {
    if (validarValor(item, texto) !== '') return true;
    return Number(normalizarTexto(texto)) !== Number(item.valor);
}

// "35 %", "$ 1.000", "5": el valor con su unidad para mostrarlo.
export function formatearValor(unidad, valor) {
    const numero = Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 });
    if (unidad === '%') return `${numero} %`;
    if (unidad === '$') return `$ ${numero}`;
    return numero;
}

// El valor vigente como texto editable ("36.5", "1000", "5").
export function textoDeValor(valor) {
    return String(Number(valor));
}
