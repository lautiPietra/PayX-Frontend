import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verificarCodigo, reenviarCodigo } from '../services/authService';
import logoPayX from '../assets/payx-logo.png';
import './Verificacion.css';

function Verificacion() {
    const location = useLocation();
    const navigate = useNavigate();

    // El email viene desde la pantalla de registro (state)
    // Si alguien entra directo a /verificacion sin venir de registro, lo mandamos de vuelta
    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/registro');
        }
    }, [email, navigate]);

    // Estado: los 6 digitos del codigo, cada uno en un input separado
    const [codigo, setCodigo] = useState(['', '', '', '', '', '']);

    // Estados de UI
    const [mensajeGlobal, setMensajeGlobal] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [reenviando, setReenviando] = useState(false);

    // Referencias a cada input para poder moverse entre ellos automaticamente
    const inputRefs = useRef([]);

    // Focus en el primer input al cargar la pantalla
    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    // Maneja el input de cada digito
    const handleChange = (index, valor) => {
        // Solo permitir digitos
        if (!/^[0-9]?$/.test(valor)) return;

        const nuevoCodigo = [...codigo];
        nuevoCodigo[index] = valor;
        setCodigo(nuevoCodigo);

        // Si el usuario escribio un digito, pasar al siguiente input
        if (valor && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Maneja el borrado (Backspace): si el input esta vacio, ir al anterior
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !codigo[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Maneja el pegado (ej: el usuario copia los 6 digitos del email)
    const handlePaste = (e) => {
        e.preventDefault();
        const textoPegado = e.clipboardData.getData('text').trim();

        // Si son exactamente 6 digitos, llenar todos los inputs
        if (/^[0-9]{6}$/.test(textoPegado)) {
            const nuevoCodigo = textoPegado.split('');
            setCodigo(nuevoCodigo);
            // Focus en el ultimo input
            inputRefs.current[5]?.focus();
        }
    };

    // Enviar el codigo al backend
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
            await verificarCodigo(email, codigoCompleto);
            setMensajeGlobal({ tipo: 'exito', texto: 'Email verificado correctamente!' });

            // Despues de 1.5 seg redirigir al login (que todavia no existe, por ahora al registro)
            setTimeout(() => {
                navigate('/login');
            }, 1500);

        } catch (error) {
            const mensajeError = error.response?.data?.error || 'Error al verificar. Intenta de nuevo.';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });
            // Limpiar el codigo y poner focus en el primero
            setCodigo(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setCargando(false);
        }
    };

    // Reenviar el codigo
    const handleReenviar = async () => {
        setMensajeGlobal(null);
        setReenviando(true);

        try {
            await reenviarCodigo(email);
            setMensajeGlobal({ tipo: 'exito', texto: 'Nuevo codigo enviado. Revisa tu email' });
            setCodigo(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error) {
            const mensajeError = error.response?.data?.error || 'Error al reenviar el codigo';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });
        } finally {
            setReenviando(false);
        }
    };

    // Si no hay email, no renderizamos nada (el useEffect redirige)
    if (!email) return null;

    const codigoCompleto = codigo.every(d => d !== '');

    return (
        <div className="verificacion-container">
            <div className="verificacion-card">

                {/* Logo */}
                <div className="verificacion-logo-wrapper">
                    <div className="verificacion-logo">
                        <img src={logoPayX} alt="PayX" />
                    </div>
                </div>

                {/* Escudo de seguridad */}
                <div className="verificacion-escudo">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff6b1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                    </svg>
                </div>

                {/* Titulos */}
                <h1 className="verificacion-titulo">Verificación en 2 pasos</h1>
                <p className="verificacion-subtitulo">
                    Ingresá el código de 6 dígitos que enviamos a <strong>{email}</strong>
                </p>

                {/* Mensaje global */}
                {mensajeGlobal && (
                    <div className={`mensaje-global ${mensajeGlobal.tipo}`}>
                        {mensajeGlobal.texto}
                    </div>
                )}

                {/* Formulario */}
                <form onSubmit={handleSubmit}>

                    {/* 6 inputs separados */}
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

                    <button
                        type="submit"
                        className="boton-verificar"
                        disabled={!codigoCompleto || cargando}
                    >
                        {cargando ? 'Verificando...' : 'Verificar código'}
                    </button>
                </form>

                {/* Reenviar codigo */}
                <div className="verificacion-reenviar">
                    <p>¿No recibiste el código?</p>
                    <button
                        type="button"
                        onClick={handleReenviar}
                        disabled={reenviando}
                        className="link-reenviar"
                    >
                        {reenviando ? 'Reenviando...' : 'Reenviar código'}
                    </button>
                </div>

            </div>
        </div>
    );
}

export default Verificacion;