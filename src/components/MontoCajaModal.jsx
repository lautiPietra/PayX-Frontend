import { useState, useEffect } from 'react';
import { IconX, IconArrowLeft, IconWallet } from './icons/Icons';
import { depositarEnCajaAhorro, retirarDeCajaAhorro } from '../services/cajaAhorroService';
import './TransferModal.css';

function formatearMonto(valor) {
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Deposita o retira plata de una caja de ahorro, segun "modo" ('depositar' |
// 'retirar'). "saldoDisponible" es el limite contra el que se valida en cada
// caso: el saldo de la cuenta principal al depositar, o el saldo de la propia
// caja al retirar.
function MontoCajaModal({ abierto, onCerrar, caja, modo, saldoDisponible, onExito }) {
    const [monto, setMonto] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (!abierto) return;
        setMonto('');
        setError('');
    }, [abierto, caja, modo]);

    if (!abierto || !caja) return null;

    const esDeposito = modo === 'depositar';
    const montoNumero = parseFloat(monto) || 0;

    function usarTodoElSaldo() {
        setMonto(String(saldoDisponible));
        setError('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (montoNumero <= 0) {
            setError('Ingresá un monto válido.');
            return;
        }
        if (montoNumero > saldoDisponible) {
            setError(esDeposito ? 'No tenés saldo suficiente en tu cuenta.' : 'La caja no tiene suficiente saldo.');
            return;
        }

        setEnviando(true);
        try {
            const resultado = esDeposito
                ? await depositarEnCajaAhorro(caja.id, montoNumero)
                : await retirarDeCajaAhorro(caja.id, montoNumero);
            onExito?.(resultado);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo completar la operación. Intentá de nuevo.');
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
                    <h1 className="transfer-page-titulo">{esDeposito ? 'Agregar dinero' : 'Retirar dinero'}</h1>
                    <p className="transfer-page-subtitulo">{caja.nombre}</p>

                    <form onSubmit={handleSubmit} className="transfer-form-col" style={{ maxWidth: 420, margin: '0 auto' }} noValidate>

                        <div className="transfer-modal-saldo">
                            <span className="transfer-modal-saldo-icono"><IconWallet size={16} /></span>
                            <span>{esDeposito ? 'Saldo disponible en tu cuenta' : 'Saldo en la caja'}</span>
                            <strong>$ {formatearMonto(saldoDisponible)}</strong>
                        </div>

                        <div className="transfer-campo">
                            <label>Monto</label>
                            <div className="transfer-monto-group">
                                <span className="transfer-monto-simbolo">$</span>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    placeholder="0,00"
                                    autoFocus
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                />
                                <button type="button" className="transfer-usar-todo" onClick={usarTodoElSaldo}>
                                    Usar todo
                                </button>
                            </div>
                        </div>

                        {error && <div className="transfer-error">{error}</div>}

                        <div className="transfer-modal-botones">
                            <button type="button" className="transfer-btn-cancelar" onClick={onCerrar} disabled={enviando}>
                                Cancelar
                            </button>
                            <button type="submit" className="transfer-btn-continuar" disabled={enviando}>
                                {enviando ? 'Procesando...' : (esDeposito ? 'Agregar' : 'Retirar')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default MontoCajaModal;
