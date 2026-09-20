import { formatearMontoConMoneda } from './formatoMoneda';

// Tipos y estados del monitor de transacciones del panel de admin; los codigos son los que manda
// AdminTransaccionService del backend. Compartidos por el monitor y la ficha de usuario.
export const TIPOS = [
    { codigo: 'TRANSFERENCIAS', etiqueta: 'Transferencias' },
    { codigo: 'DOLARES', etiqueta: 'Dólares' },
    { codigo: 'CRIPTO', etiqueta: 'Cripto' },
    { codigo: 'PLAZO_FIJO', etiqueta: 'Plazos fijos' },
    { codigo: 'SERVICIOS', etiqueta: 'Servicios' },
];
export const ETIQUETA_TIPO = Object.fromEntries(TIPOS.map((t) => [t.codigo, t.etiqueta]));

export const ESTADOS = [
    { codigo: 'COMPLETADA', etiqueta: 'Completada' },
    { codigo: 'PENDIENTE', etiqueta: 'Pendiente' },
    { codigo: 'CANCELADA', etiqueta: 'Cancelada' },
    { codigo: 'ACTIVO', etiqueta: 'Activo' },
    { codigo: 'VENCIDO', etiqueta: 'Vencido' },
    { codigo: 'PAGADA', etiqueta: 'Pagada' },
];
export const ETIQUETA_ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.codigo, e.etiqueta]));

// Un cambio (dolares/cripto) muestra lo que salio y lo que entro; el resto, un solo monto.
export function textoMonto(t) {
    const principal = formatearMontoConMoneda(t.monto, t.moneda);
    if (t.monedaDestino && t.montoDestino != null) {
        return `${principal} → ${formatearMontoConMoneda(t.montoDestino, t.monedaDestino)}`;
    }
    return principal;
}
