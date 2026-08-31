import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link} from 'react-router-dom';
import { validarCodigoReset, solicitarResetPassword } from '../services/authService';
import logoPayX from '../assets/payx-logo.png';
import './Recuperar.css';

function VerificarCodigoReset() {
    const location = useLocation();
    const navigate = useNavigate();

    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/olvide-password');
        }
    }, [email, navigate]);

    const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
    const [mensajeGlobal, setMensajeGlobal] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [reenviando, setReenviando] = useState(false);

    const inputRefs = useRef([]);

    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (index, valor) => {
        if (!/^[0-9]?$/.test(valor)) return;
        const nuevoCodigo = [...codigo];
        nuevoCodigo[index] = valor;
        setCodigo(nuevoCodigo);
        if (valor && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !codigo[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const textoPegado = e.clipboardData.getData('text').trim();
        if (/^[0-9]{6}$/.test(textoPegado)) {
            const nuevoCodigo = textoPegado.split('');
            setCodigo(nuevoCodigo);
            inputRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensajeGlobal(null);

        const codigoCompleto = codigo.join('');
        if (codigoCompleto.length !== 6) {
            setMensajeGlobal({ tipo: 'error', texto: 'Ingresa los 6 digitos del codigo' });
            return;
        }

        setCargando(true);

        try {
            await validarCodigoReset(email, codigoCompleto);
            navigate('/nueva-password', { state: { email, codigo: codigoCompleto } });
        } catch (error) {
            const mensajeError = error.response?.data?.error || 'Codigo incorrecto';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });
            setCodigo(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setCargando(false);
        }
    };

    const handleReenviar = async () => {
        setMensajeGlobal(null);
        setReenviando(true);

        try {
            await solicitarResetPassword(email);
            setMensajeGlobal({ tipo: 'exito', texto: 'Nuevo codigo enviado. Revisa tu email' });
            setCodigo(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error) {
            const mensajeError = error.response?.data?.error || 'Error al reenviar';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });
        } finally {
            setReenviando(false);
        }
    };

    if (!email) return null;

    const codigoCompleto = codigo.every(d => d !== '');

    return (
        <div className="recuperar-container">
            <div className="recuperar-card">

                <div className="recuperar-logo-wrapper">
                    <div className="recuperar-logo">
                        <img src={logoPayX} alt="PayX" />
                    </div>
                </div>

                <h1 className="recuperar-titulo">Verifica el codigo</h1>
                <p className="recuperar-subtitulo">
                    Ingresa el codigo de 6 digitos que enviamos a <strong>{email}</strong>
                </p>

                {mensajeGlobal && (
                    <div className={`mensaje-global ${mensajeGlobal.tipo}`}>
                        {mensajeGlobal.texto}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="codigo-inputs">
                        {codigo.map((digito, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength="1"
                                value={digito}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className="codigo-input"
                                autoComplete="one-time-code"
                            />
                        ))}
                    </div>

                    <button type="submit" className="boton-recuperar" disabled={!codigoCompleto || cargando}>
                        {cargando ? 'Verificando...' : 'Continuar'}
                    </button>
                </form>

                <div className="reenviar-bloque">
                    <p>¿No recibiste el codigo?</p>
                    <button
                        type="button"
                        onClick={handleReenviar}
                        disabled={reenviando}
                        className="link-reenviar"
                    >
                        {reenviando ? 'Reenviando...' : 'Reenviar codigo'}
                    </button>
                </div>

                <div className="recuperar-volver">
                    <Link to="/login">
                        <span className="flecha-volver">←</span> Volver al inicio de sesion
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default VerificarCodigoReset;