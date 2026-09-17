import { useState, useEffect, createElement } from 'react';
import { IconX, IconArrowLeft, IconCheck } from './icons/Icons';
import { COLORES_CAJA, ICONOS_CAJA } from '../utils/cajaAhorroTemas';
import { crearCajaAhorro, editarCajaAhorro } from '../services/cajaAhorroService';
import './TransferModal.css';
import './CajaAhorroModal.css';

// Crea o edita una caja de ahorro (nombre, color, icono y meta opcional). El
// mismo componente sirve para las dos acciones: si "cajaExistente" viene con
// datos, edita esa caja; si no, crea una nueva.
function CajaAhorroModal({ abierto, onCerrar, cajaExistente, onExito }) {
    const [nombre, setNombre] = useState('');
    const [color, setColor] = useState(COLORES_CAJA[0]);
    const [icono, setIcono] = useState(ICONOS_CAJA[0].key);
    const [montoObjetivo, setMontoObjetivo] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    const esEdicion = Boolean(cajaExistente);

    useEffect(() => {
        if (!abierto) return;
        if (cajaExistente) {
            setNombre(cajaExistente.nombre);
            setColor(cajaExistente.color);
            setIcono(cajaExistente.icono);
            setMontoObjetivo(cajaExistente.montoObjetivo != null ? String(cajaExistente.montoObjetivo) : '');
        } else {
            setNombre('');
            setColor(COLORES_CAJA[0]);
            setIcono(ICONOS_CAJA[0].key);
            setMontoObjetivo('');
        }
        setError('');
    }, [abierto, cajaExistente]);

    if (!abierto) return null;

    const temaElegido = ICONOS_CAJA.find((i) => i.key === icono) || ICONOS_CAJA[0];

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!nombre.trim()) {
            setError('Ponele un nombre a la caja.');
            return;
        }

        const datos = {
            nombre: nombre.trim(),
            color,
            icono,
            montoObjetivo: montoObjetivo.trim() === '' ? null : parseFloat(montoObjetivo),
        };

        setEnviando(true);
        try {
            const resultado = esEdicion
                ? await editarCajaAhorro(cajaExistente.id, datos)
                : await crearCajaAhorro(datos);
            onExito?.(resultado);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo guardar la caja. Intentá de nuevo.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="transfer-page-overlay">
            <div className="transfer-page">

                <div className="transfer-page-header">
                    <button className="transfer-page-volver" onClick={onCerrar}>
                        <IconArrowLeft size={18} /> Volver
                    </button>
                    <button className="transfer-page-cerrar" onClick={onCerrar} aria-label="Cerrar">
                        <IconX size={20} />
                    </button>
                </div>

                <div className="transfer-page-contenido">
                    <h1 className="transfer-page-titulo">{esEdicion ? 'Editar caja de ahorro' : 'Nueva caja de ahorro'}</h1>
                    <p className="transfer-page-subtitulo">Separá plata de tu saldo principal para un objetivo puntual</p>

                    <div className="caja-modal-contenedor">

                        <div className="caja-modal-preview" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                            <span className="caja-modal-preview-icono">{createElement(temaElegido.Icon, { size: 22 })}</span>
                            <span className="caja-modal-preview-nombre">{nombre.trim() || 'Nombre de la caja'}</span>
                        </div>

                        <form onSubmit={handleSubmit} className="transfer-form-col" noValidate>

                            <div className="transfer-campo">
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    maxLength={40}
                                    placeholder="Ej: Viaje a Bariloche"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                />
                            </div>

                            <div className="transfer-campo">
                                <label>Meta <span className="transfer-opcional">(opcional)</span></label>
                                <div className="transfer-monto-group">
                                    <span className="transfer-monto-simbolo">$</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        placeholder="Sin meta definida"
                                        value={montoObjetivo}
                                        onChange={(e) => setMontoObjetivo(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="transfer-campo">
                                <label>Color</label>
                                <div className="caja-modal-colores">
                                    {COLORES_CAJA.map((c) => (
                                        <button
                                            type="button"
                                            key={c}
                                            className={`caja-modal-color ${color === c ? 'activo' : ''}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setColor(c)}
                                            aria-label={`Color ${c}`}
                                        >
                                            {color === c && <IconCheck size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="transfer-campo">
                                <label>Icono</label>
                                <div className="caja-modal-iconos">
                                    {ICONOS_CAJA.map((entrada) => (
                                        <button
                                            type="button"
                                            key={entrada.key}
                                            className={`caja-modal-icono ${icono === entrada.key ? 'activo' : ''}`}
                                            onClick={() => setIcono(entrada.key)}
                                            title={entrada.label}
                                        >
                                            <entrada.Icon size={18} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && <div className="transfer-error">{error}</div>}

                            <div className="transfer-modal-botones">
                                <button type="button" className="transfer-btn-cancelar" onClick={onCerrar} disabled={enviando}>
                                    Cancelar
                                </button>
                                <button type="submit" className="transfer-btn-continuar" disabled={enviando}>
                                    {enviando ? 'Guardando...' : (esEdicion ? 'Guardar cambios' : 'Crear caja')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CajaAhorroModal;
