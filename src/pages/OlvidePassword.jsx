import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { solicitarResetPassword } from '../services/authService';
import logoPayX from '../assets/payx-logo.png';
import './Recuperar.css';

function OlvidePassword() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [mensajeGlobal, setMensajeGlobal] = useState(null);
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMensajeGlobal(null);

        if (!email.trim()) {
            setError('El email es obligatorio');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Email invalido');
            return;
        }

        setCargando(true);

        try {
            await solicitarResetPassword(email);
            setMensajeGlobal({
                tipo: 'exito',
                texto: 'Si el email esta registrado, recibiras un codigo. Revisa tu casilla.'
            });

            setTimeout(() => {
                navigate('/verificar-codigo-reset', { state: { email } });
            }, 1500);

        } catch (err) {
            const mensajeError = err.response?.data?.error
                || 'Error al solicitar el codigo. Intenta de nuevo.';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="recuperar-container">
            <div className="recuperar-card">

                <div className="recuperar-logo-wrapper">
                    <div className="recuperar-logo">
                        <img src={logoPayX} alt="PayX" />
                    </div>
                </div>

                <h1 className="recuperar-titulo">Recuperar contrasena</h1>
                <p className="recuperar-subtitulo">
                    Ingresa tu correo electronico y te enviaremos las instrucciones para restablecer tu contrasena
                </p>

                {mensajeGlobal && (
                    <div className={`mensaje-global ${mensajeGlobal.tipo}`}>
                        {mensajeGlobal.texto}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="campo">
                        <div className="input-group">
                            <span className="input-icon">✉️</span>
                            <input
                                type="email"
                                placeholder="Correo electronico"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (error) setError(null);
                                }}
                            />
                        </div>
                        {error && <p className="campo-error">{error}</p>}
                    </div>

                    <button type="submit" className="boton-recuperar" disabled={cargando}>
                        {cargando ? 'Enviando...' : 'Enviar instrucciones'}
                    </button>
                </form>

                <div className="recuperar-volver">
                    <Link to="/login">
                        <span className="flecha-volver">←</span> Volver al inicio de sesion
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default OlvidePassword;