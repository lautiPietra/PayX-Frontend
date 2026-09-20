import { formatearNumero } from './formatoMoneda';

// Funciones puras de la ficha de usuario del panel de admin (separadas del componente para poder probarlas solas).

const MS_POR_DIA = 24 * 3600 * 1000;

// El vencimiento de la tarjeta llega como un DIA ("yyyy-MM-dd"): se lee a mano, sin new Date(), que
// lo interpretaria como medianoche UTC y en Argentina (UTC-3) mostraria el mes anterior si es el dia 1.
export function vencimientoTarjeta(fechaIso) {
    if (!fechaIso) return '';
    const [anio, mes] = fechaIso.split('-');
    return `${mes}/${anio.slice(-2)}`;
}

// Porcentaje (0 a 100) de una caja de ahorro respecto de su meta; null si no tiene meta.
export function progresoCaja(saldo, objetivo) {
    const meta = Number(objetivo);
    if (!objetivo || !(meta > 0)) return null;
    return Math.max(0, Math.min(100, (Number(saldo) / meta) * 100));
}

// "hoy", "hace 3 días", "hace 2 meses", "hace 1 año" para una fecha de registro (un instante).
export function antiguedad(fechaIso, ahoraMs = Date.now()) {
    if (!fechaIso) return '';
    const dias = Math.floor((ahoraMs - new Date(fechaIso).getTime()) / MS_POR_DIA);
    if (dias < 1) return 'hoy';
    if (dias < 30) return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
    if (dias < 365) {
        const meses = Math.floor(dias / 30);
        return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`;
    }
    const anios = Math.floor(dias / 365);
    return anios === 1 ? 'hace 1 año' : `hace ${anios} años`;
}

const ETIQUETA_ACCION = {
    CAMBIO_ROL: 'Cambio de rol',
    BAJA_LOGICA: 'Baja',
    REACTIVACION: 'Reactivación',
};

export function etiquetaAccion(accion) {
    if (ETIQUETA_ACCION[accion]) return ETIQUETA_ACCION[accion];
    const texto = String(accion || '').toLowerCase().replaceAll('_', ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const NOMBRE_MONEDA = { PESOS: 'Pesos', USD: 'Dólares' };

// "1.234" para cantidades enteras.
export function formatearCantidad(valor) {
    return formatearNumero(valor, 0);
}
