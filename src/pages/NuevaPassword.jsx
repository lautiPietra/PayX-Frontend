import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetearPassword } from '../services/authService';
import logoPayX from '../assets/payx-logo.png';
import { IconLock, IconEye, IconEyeOff } from '../components/icons/Icons';
import './Recuperar.css';

function NuevaPassword() {
    const location = useLocation();
    const navigate = useNavigate();

    const email = location.state?.email;
    const codigo = location.state?.codigo;

    useEffect(() => {
        if (!email || !codigo) {
            navigate('/olvide-password');
        }
    }, [email, codigo, navigate]);

    const [password, setPassword] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [errores, setErrores] = useState({});
    const [mensajeGlobal, setMensajeGlobal] = useState(null);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);

    const validar = () => {
        const nuevosErrores = {};

        if (!password) {
            nuevosErrores.password = 'La contrasena es obligatoria';
        } else if (password.length < 8) {
            nuevosErrores.password = 'Minimo 8 caracteres';
        }

        if (!confirmacion) {
            nuevosErrores.confirmacion = 'Debes confirmar la contrasena';
        } else if (password !== confirmacion) {
            nuevosErrores.confirmacion = 'Las contrasenas no coinciden';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensajeGlobal(null);

        if (!validar()) return;

        setCargando(true);

        try {
            await resetearPassword(email, codigo, password);
            setMensajeGlobal({
                tipo: 'exito',
                texto: 'Contrasena actualizada correctamente. Redirigiendo al login...'
            });

            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (error) {
            const mensajeError = error.response?.data?.error
                || 'Error al cambiar la contrasena';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });
        } finally {
            setCargando(false);
        }
    };

    if (!email || !codigo) return null;

    return (
        <div className="recuperar-container">
            <div className="recuperar-card">

                <div className="recuperar-logo-wrapper">
                    <div className="recuperar-logo">
                        <img src={logoPayX} alt="PayX" />
                    </div>
                </div>

                <h1 className="recuperar-titulo">Nueva contrasena</h1>
                <p className="recuperar-subtitulo">
                    Crea una contrasena segura para tu cuenta
                </p>

                {mensajeGlobal && (
                    <div className={`mensaje-global ${mensajeGlobal.tipo}`}>
                        {mensajeGlobal.texto}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="campo">
                        <div className="input-group">
                            <IconLock className="input-icon" />
                            <input
                                type={mostrarPassword ? 'text' : 'password'}
                                className="password-input"
                                placeholder="Nueva contrasena"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errores.password) setErrores({ ...errores, password: null });
                                }}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setMostrarPassword(!mostrarPassword)}
                            >
                                {mostrarPassword ? <IconEyeOff /> : <IconEye />}
                            </button>
                        </div>
                        {errores.password && <p className="campo-error">{errores.password}</p>}
                    </div>

                    <div className="campo">
                        <div className="input-group">
                            <IconLock className="input-icon" />
                            <input
                                type={mostrarPassword ? 'text' : 'password'}
                                className="password-input"
                                placeholder="Confirmar contrasena"
                                value={confirmacion}
                                onChange={(e) => {
                                    setConfirmacion(e.target.value);
                                    if (errores.confirmacion) setErrores({ ...errores, confirmacion: null });
                                }}
                            />
                        </div>
                        {errores.confirmacion && <p className="campo-error">{errores.confirmacion}</p>}
                    </div>

                    <button type="submit" className="boton-recuperar" disabled={cargando}>
                        {cargando ? 'Guardando...' : 'Cambiar contrasena'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default NuevaPassword;