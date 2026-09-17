import { useState, useRef, useEffect, createElement } from 'react';
import { IconEdit, IconTrash, IconMoreVertical } from './icons/Icons';
import { ICONOS_CAJA } from '../utils/cajaAhorroTemas';
import './CajaAhorroCard.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const RADIO = 26;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

function AnilloProgreso({ pct, color }) {
    const offset = CIRCUNFERENCIA * (1 - Math.min(1, pct));
    return (
        <div className="caja-card-anillo">
            <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={RADIO} fill="none" stroke="#f3f4f6" strokeWidth="6" />
                <circle
                    cx="32" cy="32" r={RADIO} fill="none"
                    stroke={color} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={CIRCUNFERENCIA}
                    strokeDashoffset={offset}
                    transform="rotate(-90 32 32)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <span className="caja-card-anillo-texto">{Math.round(Math.min(1, pct) * 100)}%</span>
        </div>
    );
}

function CajaAhorroCard({ caja, onEditar, onEliminar, onDepositar, onRetirar }) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menuAbierto) return;
        function manejarClickAfuera(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false);
        }
        document.addEventListener('mousedown', manejarClickAfuera);
        return () => document.removeEventListener('mousedown', manejarClickAfuera);
    }, [menuAbierto]);

    const temaCaja = ICONOS_CAJA.find((i) => i.key === caja.icono) || ICONOS_CAJA[0];
    const tieneMeta = caja.montoObjetivo != null;
    const metaCumplida = tieneMeta && Number(caja.saldo) >= Number(caja.montoObjetivo);
    const pct = tieneMeta ? Number(caja.saldo) / Number(caja.montoObjetivo) : 0;
    const restante = tieneMeta ? Math.max(0, Number(caja.montoObjetivo) - Number(caja.saldo)) : 0;

    return (
        <div className="caja-card">
            <div className="caja-card-header">
                <span className="caja-card-icono" style={{ backgroundColor: caja.color }}>
                    {createElement(temaCaja.Icon, { size: 20 })}
                </span>

                <div className="caja-card-menu" ref={menuRef}>
                    <button className="caja-card-menu-boton" onClick={() => setMenuAbierto((v) => !v)} aria-label="Más opciones">
                        <IconMoreVertical size={16} />
                    </button>
                    {menuAbierto && (
                        <div className="caja-card-menu-panel">
                            <button onClick={() => { setMenuAbierto(false); onEditar(caja); }}>
                                <IconEdit size={14} /> Editar
                            </button>
                            <button className="peligro" onClick={() => { setMenuAbierto(false); onEliminar(caja); }}>
                                <IconTrash size={14} /> Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <h3 className="caja-card-nombre">{caja.nombre}</h3>
            <p className="caja-card-saldo">$ {formatearMonto(caja.saldo)}</p>

            {tieneMeta ? (
                <div className="caja-card-meta-fila">
                    <AnilloProgreso pct={pct} color={caja.color} />
                    <div className="caja-card-meta-texto">
                        <span className="caja-card-meta-label">Meta</span>
                        <span className="caja-card-meta-valor">$ {formatearMonto(caja.montoObjetivo)}</span>
                        <span className={`caja-card-meta-restante ${metaCumplida ? 'cumplida' : ''}`}>
                            {metaCumplida ? '¡Meta cumplida! 🎉' : `Faltan $ ${formatearMonto(restante)}`}
                        </span>
                    </div>
                </div>
            ) : (
                <p className="caja-card-sin-meta">Sin meta definida</p>
            )}

            <div className="caja-card-acciones">
                <button className="caja-card-btn" onClick={() => onDepositar(caja)}>
                    Agregar
                </button>
                <button className="caja-card-btn secundario" onClick={() => onRetirar(caja)} disabled={Number(caja.saldo) <= 0}>
                    Retirar
                </button>
            </div>
        </div>
    );
}

export default CajaAhorroCard;
