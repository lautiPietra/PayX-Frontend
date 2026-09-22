import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { enviarMensajeAsistente } from '../services/asistenteService';
import { CLAVE_CHAT_MENSAJES as CLAVE_MENSAJES, CLAVE_CHAT_ABIERTO as CLAVE_ABIERTO, CLAVE_CHAT_ACCION_PENDIENTE as CLAVE_ACCION_PENDIENTE } from '../utils/asistenteStorage';
import { IconSparkles, IconX, IconSend } from './icons/Icons';
import './AsistenteChat.css';

const MAX_HISTORIAL_ENVIADO = 30; // tiene que coincidir con @Size(max=30) de AsistenteMensajeRequest
const MAX_CARACTERES_MENSAJE = 1000; // idem @Size(max=1000) del mensaje nuevo

const MONEDAS_CRIPTO = new Set(['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP']);

const SALUDO_INICIAL = {
    rol: 'ASISTENTE',
    texto: '¡Hola! Preguntame lo que quieras sobre tu cuenta (saldo, movimientos, gastos) o sobre PayX en general. '
        + 'También puedo dejarte lista una transferencia para que la confirmes vos.',
};

function formatearMontoAccion(monto, moneda) {
    const numero = Number(monto);
    if (MONEDAS_CRIPTO.has(moneda)) {
        return `${numero.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${moneda}`;
    }
    const simbolo = moneda === 'USD' ? 'US$' : '$';
    return `${simbolo} ${numero.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function leerDeSessionStorage(clave, porDefecto) {
    try {
        const crudo = sessionStorage.getItem(clave);
        return crudo ? JSON.parse(crudo) : porDefecto;
    } catch {
        return porDefecto;
    }
}

// Chat flotante con el asistente de IA, disponible en todas las paginas privadas (ver App.jsx). La
// conversacion vive en sessionStorage (no en el backend, que no la guarda) para sobrevivir a la
// navegacion entre paginas sin quedar pegada entre sesiones distintas del navegador.
// "Preparar" una transferencia nunca la ejecuta: deja los datos en sessionStorage y en un evento
// para que Home.jsx abra el formulario de siempre, ya completado, a la espera de que el usuario
// lo revise y confirme el mismo (ver Home.jsx).
function AsistenteChat() {
    const navigate = useNavigate();
    const location = useLocation();
    const [abierto, setAbierto] = useState(() => leerDeSessionStorage(CLAVE_ABIERTO, false));
    const [mensajes, setMensajes] = useState(() => leerDeSessionStorage(CLAVE_MENSAJES, [SALUDO_INICIAL]));
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const listaRef = useRef(null);

    useEffect(() => {
        sessionStorage.setItem(CLAVE_ABIERTO, JSON.stringify(abierto));
    }, [abierto]);

    useEffect(() => {
        sessionStorage.setItem(CLAVE_MENSAJES, JSON.stringify(mensajes));
        if (listaRef.current) {
            listaRef.current.scrollTop = listaRef.current.scrollHeight;
        }
    }, [mensajes]);

    async function enviar(evento) {
        evento.preventDefault();
        const mensaje = texto.trim();
        if (!mensaje || enviando) return;

        const propios = mensajes.filter((m) => m !== SALUDO_INICIAL);
        const historial = propios.slice(-MAX_HISTORIAL_ENVIADO).map((m) => ({ rol: m.rol, texto: m.texto.slice(0, 4000) }));

        setMensajes((prev) => [...prev, { rol: 'USUARIO', texto: mensaje }]);
        setTexto('');
        setError('');
        setEnviando(true);
        try {
            const respuesta = await enviarMensajeAsistente(mensaje, historial);
            setMensajes((prev) => [...prev, { rol: 'ASISTENTE', texto: respuesta.texto, accionSugerida: respuesta.accionSugerida }]);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo consultar al asistente. Probá de nuevo en un momento.');
        } finally {
            setEnviando(false);
        }
    }

    function completarAccion(accion) {
        // Home.jsx es quien realmente abre el formulario (los modales de transferencia viven ahi). Se
        // manda por los dos canales: el evento por si Home ya esta montado, sessionStorage por si hay
        // que navegar primero y Home todavia no existe para escucharlo.
        sessionStorage.setItem(CLAVE_ACCION_PENDIENTE, JSON.stringify(accion));
        window.dispatchEvent(new CustomEvent('payx-accion-asistente', { detail: accion }));
        setAbierto(false);
        if (location.pathname !== '/inicio') navigate('/inicio');
    }

    function limpiarConversacion() {
        setMensajes([SALUDO_INICIAL]);
        setError('');
    }

    return (
        <div className="asistente-chat">
            {abierto && (
                <div className="asistente-panel" role="dialog" aria-label="Asistente de PayX">
                    <div className="asistente-cabecera">
                        <span className="asistente-cabecera-titulo"><IconSparkles size={16} /> Asistente PayX</span>
                        <div className="asistente-cabecera-acciones">
                            <button type="button" className="asistente-btn-limpiar" onClick={limpiarConversacion}>
                                Nueva charla
                            </button>
                            <button type="button" className="asistente-btn-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">
                                <IconX size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="asistente-mensajes" ref={listaRef}>
                        {mensajes.map((m, i) => (
                            <div key={i} className={`asistente-fila ${m.rol === 'USUARIO' ? 'usuario' : 'asistente'}`}>
                                <div className="asistente-burbuja">{m.texto}</div>
                                {m.accionSugerida?.tipo === 'TRANSFERENCIA' && (
                                    <div className="asistente-accion">
                                        <p className="asistente-accion-titulo">Transferencia preparada</p>
                                        <p className="asistente-accion-detalle">
                                            <strong>{formatearMontoAccion(m.accionSugerida.monto, m.accionSugerida.moneda)}</strong>
                                            {' a '}
                                            <strong>{m.accionSugerida.nombreResuelto}</strong>
                                        </p>
                                        {m.accionSugerida.motivo && <p className="asistente-accion-motivo">{m.accionSugerida.motivo}</p>}
                                        <button type="button" className="asistente-btn-completar" onClick={() => completarAccion(m.accionSugerida)}>
                                            <IconSend size={14} /> Completar transferencia
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {enviando && (
                            <div className="asistente-fila asistente">
                                <div className="asistente-burbuja asistente-escribiendo">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}
                    </div>

                    {error && <p className="asistente-error">{error}</p>}

                    <form className="asistente-form" onSubmit={enviar}>
                        <textarea
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) enviar(e);
                            }}
                            placeholder="Preguntale algo al asistente..."
                            maxLength={MAX_CARACTERES_MENSAJE}
                            rows={1}
                            disabled={enviando}
                        />
                        <button type="submit" className="asistente-btn-enviar" disabled={enviando || !texto.trim()} aria-label="Enviar">
                            <IconSend size={16} />
                        </button>
                    </form>
                </div>
            )}

            <button
                type="button"
                className={`asistente-burbuja-boton ${abierto ? 'activo' : ''}`}
                onClick={() => setAbierto((a) => !a)}
                aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
            >
                {abierto ? <IconX size={22} /> : <IconSparkles size={22} />}
            </button>
        </div>
    );
}

export default AsistenteChat;
