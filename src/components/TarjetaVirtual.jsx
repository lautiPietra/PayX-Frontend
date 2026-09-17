import { useState } from 'react';
import { IconCreditCard, IconEye, IconEyeOff, IconCopy, IconCheck } from './icons/Icons';
import { obtenerTarjeta } from '../services/tarjetaService';
import './TarjetaVirtual.css';

// El backend manda la fecha como "yyyy-MM-dd" (LocalDate): se parsea a mano en
// vez de con `new Date(...)` para no correrse de mes por interpretarla en UTC
// (mismo motivo que ya se documentó para las fechas de plazo fijo).
function formatearVencimiento(fechaIso) {
    if (!fechaIso) return '--/--';
    const [anio, mes] = fechaIso.split('-');
    return `${mes}/${anio.slice(2)}`;
}

function formatearNumero(numero) {
    return numero.replace(/(.{4})/g, '$1 ').trim();
}

// Tarjeta virtual de PayX: el backend le crea una a cada usuario automáticamente
// (la primera vez que hace falta, ver TarjetaService), así que esto siempre tiene
// algo real para mostrar. Por defecto solo se ven los últimos 4 dígitos (ya vienen
// en el perfil); el número completo y el CVV recién se piden a /api/tarjeta cuando
// el usuario toca "Ver número completo" — revelar el dato sensible es una acción
// explícita, no algo que se traiga de antemano sin que se use.
function TarjetaVirtual({ perfil }) {
    const [revelada, setRevelada] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [detalle, setDetalle] = useState(null); // { numero, titular, cvv, vencimiento }
    const [error, setError] = useState('');
    const [copiado, setCopiado] = useState(false);

    if (!perfil) return null;

    async function alternarRevelado() {
        setError('');
        if (revelada) {
            setRevelada(false);
            return;
        }
        if (detalle) {
            setRevelada(true);
            return;
        }
        setCargando(true);
        try {
            const datos = await obtenerTarjeta();
            setDetalle(datos);
            setRevelada(true);
        } catch (err) {
            setError(err.response?.data?.error || 'No pudimos obtener los datos de tu tarjeta.');
        } finally {
            setCargando(false);
        }
    }

    async function copiarNumero() {
        if (!detalle) return;
        try {
            await navigator.clipboard.writeText(detalle.numero);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
        } catch {
            // clipboard puede no estar disponible (permisos, contexto no seguro); no es crítico
        }
    }

    const numeroMostrado = revelada && detalle
        ? formatearNumero(detalle.numero)
        : `•••• •••• •••• ${perfil.tarjetaUltimosCuatro || '----'}`;

    return (
        <div className="tarjeta-virtual">
            <div className="tarjeta-virtual-top">
                <span className="tarjeta-virtual-marca">
                    <IconCreditCard size={20} /> PayX
                </span>
                <span className="tarjeta-virtual-tipo">Virtual</span>
            </div>

            <div className="tarjeta-virtual-numero">{numeroMostrado}</div>

            <div className="tarjeta-virtual-bottom">
                <div className="tarjeta-virtual-dato">
                    <span className="tarjeta-virtual-label">Titular</span>
                    <p className="tarjeta-virtual-valor">{perfil.nombreCompleto?.toUpperCase()}</p>
                </div>
                <div className="tarjeta-virtual-dato">
                    <span className="tarjeta-virtual-label">Vence</span>
                    <p className="tarjeta-virtual-valor">{formatearVencimiento(perfil.tarjetaVencimiento)}</p>
                </div>
                {revelada && detalle && (
                    <div className="tarjeta-virtual-dato">
                        <span className="tarjeta-virtual-label">CVV</span>
                        <p className="tarjeta-virtual-valor">{detalle.cvv}</p>
                    </div>
                )}
            </div>

            <div className="tarjeta-virtual-acciones">
                <button className="tarjeta-virtual-btn" onClick={alternarRevelado} disabled={cargando}>
                    {revelada ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                    {cargando ? 'Cargando...' : (revelada ? 'Ocultar' : 'Ver número completo')}
                </button>
                {revelada && detalle && (
                    <button className="tarjeta-virtual-btn" onClick={copiarNumero}>
                        {copiado ? <IconCheck size={15} /> : <IconCopy size={15} />}
                        {copiado ? 'Copiado' : 'Copiar número'}
                    </button>
                )}
            </div>

            {error && <p className="tarjeta-virtual-error">{error}</p>}
        </div>
    );
}

export default TarjetaVirtual;
