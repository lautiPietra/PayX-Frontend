import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, loginConGoogle, reenviarCodigo } from '../services/authService';
import { GOOGLE_CLIENT_ID } from '../config';
import logoPayX from '../assets/payx-logo.png';
import { IconMail, IconLock, IconEye, IconEyeOff } from '../components/icons/Icons';
import './Login.css';

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errores, setErrores] = useState({});
    const [mensajeGlobal, setMensajeGlobal] = useState(null);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);

    // Estado especial para mostrar el boton de verificar email
    const [emailNoVerificado, setEmailNoVerificado] = useState(false);
    const [reenviando, setReenviando] = useState(false);

    const googleBotonRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errores[name]) {
            setErrores({ ...errores, [name]: null });
        }
        // Si el usuario cambia los datos, ocultamos el boton de verificar
        if (emailNoVerificado) {
            setEmailNoVerificado(false);
        }
    };

    const validar = () => {
        const nuevosErrores = {};

        if (!formData.email.trim()) {
            nuevosErrores.email = 'El email es obligatorio';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            nuevosErrores.email = 'Email invalido';
        }

        if (!formData.password) {
            nuevosErrores.password = 'La contrasena es obligatoria';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensajeGlobal(null);
        setEmailNoVerificado(false);

        if (!validar()) return;

        setCargando(true);

        try {
            const respuesta = await login(formData.email, formData.password);
            setMensajeGlobal({
                tipo: 'exito',
                texto: `¡Bienvenido ${respuesta.nombreCompleto}! Sesion iniciada correctamente.`
            });
            // Por ahora solo mostramos el mensaje. Despues redirigimos al home.
            setTimeout(() => navigate('/inicio'), 1000);
        } catch (error) {
            const mensajeError = error.response?.data?.error
                || 'Error al iniciar sesion. Intenta de nuevo.';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });

            // Detectar el error especifico de email no verificado
            // (depende de que el backend devuelva el mensaje exacto)
            if (mensajeError.toLowerCase().includes('verificar tu email')) {
                setEmailNoVerificado(true);
            }
        } finally {
            setCargando(false);
        }
    };

    // Recibe el credential (JWT) que entrega Google Identity Services al tocar su boton
    const manejarCredencialGoogle = async (respuesta) => {
        setMensajeGlobal(null);
        setEmailNoVerificado(false);
        setCargando(true);

        try {
            const datos = await loginConGoogle(respuesta.credential);
            setMensajeGlobal({
                tipo: 'exito',
                texto: `¡Bienvenido ${datos.nombreCompleto}! Sesion iniciada correctamente.`
            });
            setTimeout(() => navigate('/inicio'), 1000);
        } catch (error) {
            const mensajeError = error.response?.data?.error
                || 'Error al iniciar sesion con Google. Intenta de nuevo.';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });
        } finally {
            setCargando(false);
        }
    };

    // Inicializa el boton oficial de Google en cuanto el script de Google este disponible
    useEffect(() => {
        let intervalo;

        const inicializarGoogle = () => {
            if (!window.google?.accounts?.id || !googleBotonRef.current) return;

            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: manejarCredencialGoogle,
            });
            window.google.accounts.id.renderButton(googleBotonRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                shape: 'rectangular',
                text: 'continue_with',
                width: Math.min(googleBotonRef.current.offsetWidth, 400),
            });
        };

        if (window.google?.accounts?.id) {
            inicializarGoogle();
        } else {
            // El script de Google se carga con async/defer: reintentamos hasta que este listo
            intervalo = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(intervalo);
                    inicializarGoogle();
                }
            }, 200);
        }

        return () => clearInterval(intervalo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reenviar el codigo y redirigir a la pantalla de verificacion
    const handleVerificarAhora = async () => {
        setReenviando(true);
        setMensajeGlobal(null);

        try {
            // Reenviamos el codigo para asegurar que el usuario reciba uno nuevo
            await reenviarCodigo(formData.email);
            // Redirigimos a la pantalla de verificacion con el email
            navigate('/verificacion', { state: { email: formData.email } });
        } catch (error) {
            const mensajeError = error.response?.data?.error
                || 'Error al enviar el codigo. Intenta de nuevo.';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });
        } finally {
            setReenviando(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">

                <div className="login-logo-wrapper">
                    <div className="login-logo">
                        <img src={logoPayX} alt="PayX" />
                    </div>
                </div>

                <h1 className="login-titulo">Bienvenido</h1>
                <p className="login-subtitulo">Inicia sesion en tu cuenta PayX</p>

                {mensajeGlobal && (
                    <div className={`mensaje-global ${mensajeGlobal.tipo}`}>
                        {mensajeGlobal.texto}
                    </div>
                )}

                {/* Boton para verificar email cuando el login falla por email no verificado */}
                {emailNoVerificado && (
                    <button
                        type="button"
                        onClick={handleVerificarAhora}
                        disabled={reenviando}
                        className="boton-verificar-ahora"
                    >
                        <IconMail size={16} />
                        {reenviando ? 'Enviando codigo...' : 'Verificar mi email ahora'}
                    </button>
                )}

                <form className="login-form" onSubmit={handleSubmit} noValidate>

                    <div className="campo">
                        <div className="input-group">
                            <IconMail className="input-icon" />
                            <input
                                type="email"
                                name="email"
                                placeholder="Correo electronico"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        {errores.email && <p className="campo-error">{errores.email}</p>}
                    </div>

                    <div className="campo">
                        <div className="input-group">
                            <IconLock className="input-icon" />
                            <input
                                type={mostrarPassword ? 'text' : 'password'}
                                name="password"
                                className="password-input"
                                placeholder="Contrasena"
                                value={formData.password}
                                onChange={handleChange}
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

                    <div className="olvidaste">
                        <Link to="/olvide-password">¿Olvidaste tu contrasena?</Link>
                    </div>

                    <button type="submit" className="boton-login" disabled={cargando}>
                        {cargando ? 'Iniciando sesion...' : 'Iniciar sesion'}
                    </button>
                </form>

                <div className="login-divider"><span>o continua con</span></div>

                <div ref={googleBotonRef} className="google-boton-contenedor"></div>

                <div className="login-footer">
                    <p>¿No tienes una cuenta? <Link to="/registro">Registrate</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Login;