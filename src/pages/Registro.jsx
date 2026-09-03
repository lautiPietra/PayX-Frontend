import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registrarUsuario } from '../services/authService';
import logoPayX from '../assets/payx-logo.png';
import { IconUser, IconMail, IconPhone, IconAtSign, IconIdCard, IconLock, IconEye, IconEyeOff } from '../components/icons/Icons';
import './Registro.css';

function Registro() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nombreCompleto: '',
        email: '',
        telefono: '',
        nombreUsuario: '',
        dni: '',
        password: ''
    });

    const [errores, setErrores] = useState({});
    const [mensajeGlobal, setMensajeGlobal] = useState(null);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errores[name]) {
            setErrores({ ...errores, [name]: null });
        }
    };

    const validar = () => {
        const nuevosErrores = {};

        if (!formData.nombreCompleto.trim()) {
            nuevosErrores.nombreCompleto = 'El nombre completo es obligatorio';
        } else if (formData.nombreCompleto.trim().length < 3) {
            nuevosErrores.nombreCompleto = 'Minimo 3 caracteres';
        }

        if (!formData.email.trim()) {
            nuevosErrores.email = 'El email es obligatorio';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            nuevosErrores.email = 'Email invalido';
        }

        if (!formData.telefono.trim()) {
            nuevosErrores.telefono = 'El telefono es obligatorio';
        } else if (!/^[0-9+\-\s()]{8,20}$/.test(formData.telefono)) {
            nuevosErrores.telefono = 'Telefono invalido';
        }

        if (!formData.nombreUsuario.trim()) {
            nuevosErrores.nombreUsuario = 'El nombre de usuario es obligatorio';
        } else if (formData.nombreUsuario.length < 3 || formData.nombreUsuario.length > 20) {
            nuevosErrores.nombreUsuario = 'Debe tener entre 3 y 20 caracteres';
        }

        if (!formData.dni.trim()) {
            nuevosErrores.dni = 'El DNI es obligatorio';
        } else if (!/^[0-9]{7,10}$/.test(formData.dni)) {
            nuevosErrores.dni = 'DNI invalido (solo numeros, entre 7 y 10 digitos)';
        }

        if (!formData.password) {
            nuevosErrores.password = 'La contrasena es obligatoria';
        } else if (formData.password.length < 8) {
            nuevosErrores.password = 'Minimo 8 caracteres';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensajeGlobal(null);

        if (!validar()) {
            return;
        }

        setCargando(true);

        try {
            const respuesta = await registrarUsuario(formData);
            setMensajeGlobal({
                tipo: 'exito',
                texto: `¡Registro exitoso! Te enviamos un codigo a tu email.`
            });

            // Esperar 1 segundo para que el usuario vea el mensaje, despues redirigir
            setTimeout(() => {
                navigate('/verificacion', { state: { email: respuesta.email } });
            }, 1000);

        } catch (error) {
            const mensajeError = error.response?.data?.error
                || 'Error al registrar. Intenta de nuevo.';
            setMensajeGlobal({ tipo: 'error', texto: mensajeError });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="registro-container">
            <div className="registro-card">

                <div className="registro-logo-wrapper">
                    <div className="registro-logo">
                        <img src={logoPayX} alt="PayX" />
                    </div>
                </div>

                <h1 className="registro-titulo">Crear cuenta</h1>
                <p className="registro-subtitulo">Completa tus datos para registrarte en PayX</p>

                {mensajeGlobal && (
                    <div className={`mensaje-global ${mensajeGlobal.tipo}`}>
                        {mensajeGlobal.texto}
                    </div>
                )}

                <form className="registro-form" onSubmit={handleSubmit} noValidate>

                    <div className="campo">
                        <div className="input-group">
                            <IconUser className="input-icon" />
                            <input
                                type="text"
                                name="nombreCompleto"
                                placeholder="Nombre completo"
                                value={formData.nombreCompleto}
                                onChange={handleChange}
                            />
                        </div>
                        {errores.nombreCompleto && <p className="campo-error">{errores.nombreCompleto}</p>}
                    </div>

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
                            <IconPhone className="input-icon" />
                            <input
                                type="tel"
                                name="telefono"
                                placeholder="Telefono"
                                value={formData.telefono}
                                onChange={handleChange}
                            />
                        </div>
                        {errores.telefono && <p className="campo-error">{errores.telefono}</p>}
                    </div>

                    <div className="campo">
                        <div className="input-group">
                            <IconAtSign className="input-icon" />
                            <input
                                type="text"
                                name="nombreUsuario"
                                placeholder="Nombre de usuario"
                                value={formData.nombreUsuario}
                                onChange={handleChange}
                            />
                        </div>
                        {errores.nombreUsuario && <p className="campo-error">{errores.nombreUsuario}</p>}
                    </div>

                    <div className="campo">
                        <div className="input-group">
                            <IconIdCard className="input-icon" />
                            <input
                                type="text"
                                name="dni"
                                placeholder="DNI"
                                value={formData.dni}
                                onChange={handleChange}
                            />
                        </div>
                        {errores.dni && <p className="campo-error">{errores.dni}</p>}
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

                    <button type="submit" className="boton-registro" disabled={cargando}>
                        {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
                    </button>
                </form>

                <div className="registro-links">
                    <p>¿Ya tienes una cuenta? <Link to="/login">Inicia sesion</Link></p>
                    <p><Link to="/olvide-password">¿Olvidaste tu contrasena?</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Registro;