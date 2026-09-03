import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerPerfil, actualizarPerfil, actualizarFotoPerfil, cambiarPassword } from '../services/perfilService';
import { actualizarUsuarioGuardado } from '../services/authService';
import Navbar from '../components/Navbar';
import { IconFileText, IconUser, IconLock, IconPhone, IconAtSign, IconEye, IconEyeOff, IconCheck, IconArrowLeft, IconIdCard, IconAlertTriangle, IconEdit } from '../components/icons/Icons';
import './Perfil.css';

const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024; // 5MB, igual que el limite del backend

function Perfil() {
    const navigate = useNavigate();

    const [perfil, setPerfil] = useState(null);
    const [cargandoPerfil, setCargandoPerfil] = useState(true);
    const [errorCarga, setErrorCarga] = useState(null);

    // Estados de la foto de perfil
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [errorFoto, setErrorFoto] = useState(null);
    const inputFotoRef = useRef(null);

    // Estados de la card de Informacion
    const [formInfo, setFormInfo] = useState({ nombreUsuario: '', alias: '', telefono: '', dni: '' });
    const [erroresInfo, setErroresInfo] = useState({});
    const [mensajeInfo, setMensajeInfo] = useState(null);
    const [guardandoInfo, setGuardandoInfo] = useState(false);

    // Estados de la card de Password
    const [formPassword, setFormPassword] = useState({
        passwordActual: '',
        nuevaPassword: '',
        confirmacion: ''
    });
    const [erroresPassword, setErroresPassword] = useState({});
    const [mensajePassword, setMensajePassword] = useState(null);
    const [cambiandoPassword, setCambiandoPassword] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState({
        actual: false, nueva: false, confirmacion: false
    });

    // Cargar el perfil al montar el componente
    useEffect(() => {
        cargarPerfil();
    }, []);

    const cargarPerfil = async () => {
        setErrorCarga(null);
        try {
            const datos = await obtenerPerfil();
            setPerfil(datos);
            setFormInfo({
                nombreUsuario: datos.nombreUsuario,
                alias: datos.alias,
                telefono: datos.telefono || '',
                dni: datos.dni || ''
            });
        } catch (error) {
            console.error('Error al cargar perfil', error);
            setErrorCarga(error.response?.data?.error || 'No pudimos cargar tu perfil. Intenta de nuevo.');
        } finally {
            setCargandoPerfil(false);
        }
    };

    // ========= FOTO DE PERFIL =========

    const handleSeleccionarFoto = () => {
        setErrorFoto(null);
        inputFotoRef.current?.click();
    };

    const handleArchivoSeleccionado = async (e) => {
        const archivo = e.target.files?.[0];
        e.target.value = ''; // permite volver a elegir el mismo archivo despues
        if (!archivo) return;

        if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
            setErrorFoto('Formato invalido. Usá una imagen JPG, PNG o WEBP');
            return;
        }
        if (archivo.size > TAMANO_MAXIMO_FOTO) {
            setErrorFoto('La imagen no puede pesar más de 5MB');
            return;
        }

        setErrorFoto(null);
        setSubiendoFoto(true);
        try {
            const actualizado = await actualizarFotoPerfil(archivo);
            setPerfil(actualizado);
            actualizarUsuarioGuardado({ fotoPerfilUrl: actualizado.fotoPerfilUrl });
        } catch (error) {
            setErrorFoto(error.response?.data?.error || 'No pudimos subir la imagen. Intenta de nuevo');
        } finally {
            setSubiendoFoto(false);
        }
    };

    // ========= INFO =========

    const validarInfo = () => {
        const e = {};

        // El DNI solo se pide (y se puede cargar) si todavia no esta seteado en la cuenta
        // (ej: cuentas creadas con Google). Una vez guardado, queda inmutable.
        if (!perfil.dni) {
            if (!formInfo.dni.trim()) e.dni = 'Obligatorio';
            else if (!/^[0-9]{7,10}$/.test(formInfo.dni)) e.dni = 'Debe tener entre 7 y 10 digitos';
        }

        if (!formInfo.nombreUsuario.trim()) e.nombreUsuario = 'Obligatorio';
        else if (formInfo.nombreUsuario.length < 3 || formInfo.nombreUsuario.length > 20)
            e.nombreUsuario = 'Entre 3 y 20 caracteres';

        if (!formInfo.alias.trim()) e.alias = 'Obligatorio';
        else if (!/^[a-zA-Z0-9._-]{6,30}$/.test(formInfo.alias))
            e.alias = 'Solo letras, numeros, puntos, guiones (6-30 caracteres)';

        if (!formInfo.telefono.trim()) e.telefono = 'Obligatorio';
        else if (!/^[0-9+\-\s()]{8,20}$/.test(formInfo.telefono))
            e.telefono = 'Telefono invalido';

        setErroresInfo(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmitInfo = async (e) => {
        e.preventDefault();
        setMensajeInfo(null);
        if (!validarInfo()) return;

        setGuardandoInfo(true);
        try {
            const actualizado = await actualizarPerfil(formInfo);
            setPerfil(actualizado);
            setMensajeInfo({ tipo: 'exito', texto: 'Perfil actualizado correctamente' });
        } catch (error) {
            setMensajeInfo({
                tipo: 'error',
                texto: error.response?.data?.error || 'Error al actualizar'
            });
        } finally {
            setGuardandoInfo(false);
        }
    };

    // ========= PASSWORD =========

    const validarPassword = () => {
        const e = {};
        if (!formPassword.passwordActual) e.passwordActual = 'Obligatorio';
        if (!formPassword.nuevaPassword) e.nuevaPassword = 'Obligatorio';
        else if (formPassword.nuevaPassword.length < 8) e.nuevaPassword = 'Minimo 8 caracteres';
        if (!formPassword.confirmacion) e.confirmacion = 'Obligatorio';
        else if (formPassword.nuevaPassword !== formPassword.confirmacion)
            e.confirmacion = 'Las contrasenas no coinciden';

        setErroresPassword(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmitPassword = async (e) => {
        e.preventDefault();
        setMensajePassword(null);
        if (!validarPassword()) return;

        setCambiandoPassword(true);
        try {
            await cambiarPassword(formPassword.passwordActual, formPassword.nuevaPassword);
            setMensajePassword({ tipo: 'exito', texto: 'Contrasena actualizada correctamente' });
            setFormPassword({ passwordActual: '', nuevaPassword: '', confirmacion: '' });
        } catch (error) {
            setMensajePassword({
                tipo: 'error',
                texto: error.response?.data?.error || 'Error al cambiar la contrasena'
            });
        } finally {
            setCambiandoPassword(false);
        }
    };

    if (cargandoPerfil) {
        return (
            <>
                <Navbar />
                <div className="perfil-loading">Cargando perfil...</div>
            </>
        );
    }

    if (errorCarga || !perfil) {
        return (
            <>
                <Navbar />
                <div className="perfil-container">
                    <button className="perfil-volver" onClick={() => navigate(-1)}>
                        <IconArrowLeft size={16} /> Volver
                    </button>
                    <div className="perfil-card">
                        <p className="mensaje-perfil error">
                            {errorCarga || 'No pudimos cargar tu perfil.'}
                        </p>
                        <button className="boton-perfil" onClick={cargarPerfil}>
                            Reintentar
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="perfil-container">

                <button className="perfil-volver" onClick={() => navigate(-1)}>
                    <IconArrowLeft size={16} /> Volver
                </button>

                <div className="perfil-encabezado">
                    <div className="perfil-avatar-wrapper">
                        <div className="perfil-avatar-grande">
                            {perfil.fotoPerfilUrl ? (
                                <img src={perfil.fotoPerfilUrl} alt="Foto de perfil" />
                            ) : (
                                perfil.nombreCompleto?.charAt(0)?.toUpperCase() || 'U'
                            )}
                            {subiendoFoto && <div className="perfil-avatar-cargando">Subiendo...</div>}
                        </div>
                        <button
                            type="button"
                            className="perfil-avatar-cambiar"
                            onClick={handleSeleccionarFoto}
                            disabled={subiendoFoto}
                            title="Cambiar foto de perfil"
                            aria-label="Cambiar foto de perfil"
                        >
                            <IconEdit size={14} />
                        </button>
                        <input
                            ref={inputFotoRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            onChange={handleArchivoSeleccionado}
                        />
                    </div>
                    <div>
                        <h1 className="perfil-titulo-principal">Mi Perfil</h1>
                        <p className="perfil-subtitulo-principal">
                            Actualiza tu informacion personal y configuracion de seguridad
                        </p>
                        {errorFoto && <p className="campo-error">{errorFoto}</p>}
                    </div>
                </div>

                {(!perfil.dni || !perfil.telefono) && (
                    <div className="perfil-alerta-incompleto">
                        <IconAlertTriangle size={20} />
                        <span>
                            Para operar con tu cuenta necesitás completar tu{' '}
                            {!perfil.dni && !perfil.telefono
                                ? 'DNI y tu número de teléfono'
                                : !perfil.dni ? 'DNI' : 'número de teléfono'}
                            {' '}en "Información del perfil".
                        </span>
                    </div>
                )}

                {/* ===== Datos NO editables ===== */}
                <div className="perfil-card">
                    <div className="perfil-card-header">
                        <span className="perfil-card-icon"><IconFileText size={18} /></span>
                        <h2 className="perfil-card-titulo">Datos personales</h2>
                    </div>
                    <p className="perfil-card-subtitulo">
                        Informacion verificada (no se puede modificar)
                    </p>

                    <div className="perfil-datos-grid">
                        <div className="perfil-dato">
                            <label>Nombre completo</label>
                            <div className="perfil-dato-valor">{perfil.nombreCompleto}</div>
                        </div>
                        <div className="perfil-dato">
                            <label>Email</label>
                            <div className="perfil-dato-valor">{perfil.email}</div>
                        </div>
                        <div className="perfil-dato">
                            <label>DNI</label>
                            <div className={`perfil-dato-valor ${!perfil.dni ? 'pendiente' : ''}`}>
                                {perfil.dni || 'Pendiente de completar'}
                            </div>
                        </div>
                        
                        <div className="perfil-dato perfil-dato-full">
                            <label>CVU</label>
                            <div className="perfil-dato-valor mono">{perfil.cvu}</div>
                        </div>
                    </div>
                </div>

                {/* ===== Informacion del perfil (editable) ===== */}
                <div className="perfil-card">
                    <div className="perfil-card-header">
                        <span className="perfil-card-icon naranja"><IconUser size={18} /></span>
                        <h2 className="perfil-card-titulo">Informacion del perfil</h2>
                    </div>
                    <p className="perfil-card-subtitulo">
                        Modifica tu nombre de usuario y alias
                    </p>

                    {mensajeInfo && (
                        <div className={`mensaje-perfil ${mensajeInfo.tipo}`}>
                            {mensajeInfo.texto}
                        </div>
                    )}

                    <form onSubmit={handleSubmitInfo} noValidate>
                        {!perfil.dni && (
                            <div className="perfil-campo">
                                <label>DNI</label>
                                <div className="perfil-input-group">
                                    <IconIdCard className="perfil-input-icon" size={16} />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Tu numero de DNI"
                                        value={formInfo.dni}
                                        onChange={(e) => setFormInfo({ ...formInfo, dni: e.target.value.replace(/\D/g, '') })}
                                        maxLength={10}
                                    />
                                </div>
                                {erroresInfo.dni && <p className="campo-error">{erroresInfo.dni}</p>}
                                <p className="perfil-ayuda">Una vez guardado no se podrá modificar</p>
                            </div>
                        )}

                        <div className="perfil-campo">
                            <label>Nombre de usuario</label>
                            <div className="perfil-input-group">
                                <IconUser className="perfil-input-icon" size={16} />
                                <input
                                    type="text"
                                    value={formInfo.nombreUsuario}
                                    onChange={(e) => setFormInfo({ ...formInfo, nombreUsuario: e.target.value })}
                                />
                            </div>
                            {erroresInfo.nombreUsuario && <p className="campo-error">{erroresInfo.nombreUsuario}</p>}
                        </div>

                        <div className="perfil-campo">
                            <label>Alias</label>
                            <div className="perfil-input-group">
                                <IconAtSign className="perfil-input-icon" size={16} />
                                <input
                                    type="text"
                                    value={formInfo.alias}
                                    onChange={(e) => setFormInfo({ ...formInfo, alias: e.target.value })}
                                />
                            </div>
                            {erroresInfo.alias && <p className="campo-error">{erroresInfo.alias}</p>}
                            <p className="perfil-ayuda">
                                Este es el identificador unico que otros usuarios pueden usar para enviarte dinero
                            </p>
                        </div>
                        <div className="perfil-campo">
                            <label>Telefono</label>
                            <div className="perfil-input-group">
                                <IconPhone className="perfil-input-icon" size={16} />
                                <input
                                    type="tel"
                                    value={formInfo.telefono}
                                    onChange={(e) => setFormInfo({ ...formInfo, telefono: e.target.value })}
                                />
                            </div>
                            {erroresInfo.telefono && <p className="campo-error">{erroresInfo.telefono}</p>}
                        </div>

                        <button type="submit" className="boton-perfil" disabled={guardandoInfo}>
                            {!guardandoInfo && <IconCheck size={16} />}
                            {guardandoInfo ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </form>
                </div>

                {/* ===== Cambiar contraseña ===== */}
                <div className="perfil-card">
                    <div className="perfil-card-header">
                        <span className="perfil-card-icon naranja"><IconLock size={18} /></span>
                        <h2 className="perfil-card-titulo">Cambiar contrasena</h2>
                    </div>
                    <p className="perfil-card-subtitulo">
                        Actualiza tu contrasena para mantener tu cuenta segura
                    </p>

                    {mensajePassword && (
                        <div className={`mensaje-perfil ${mensajePassword.tipo}`}>
                            {mensajePassword.texto}
                        </div>
                    )}

                    <form onSubmit={handleSubmitPassword} noValidate>
                        {[
                            { name: 'passwordActual', label: 'Contrasena actual', placeholder: 'Tu contrasena actual', toggleKey: 'actual' },
                            { name: 'nuevaPassword', label: 'Nueva contrasena', placeholder: 'Tu nueva contrasena', toggleKey: 'nueva' },
                            { name: 'confirmacion', label: 'Confirmar nueva contrasena', placeholder: 'Confirma tu nueva contrasena', toggleKey: 'confirmacion' }
                        ].map((campo) => (
                            <div className="perfil-campo" key={campo.name}>
                                <label>{campo.label}</label>
                                <div className="perfil-input-group">
                                    <IconLock className="perfil-input-icon" size={16} />
                                    <input
                                        type={mostrarPassword[campo.toggleKey] ? 'text' : 'password'}
                                        placeholder={campo.placeholder}
                                        value={formPassword[campo.name]}
                                        onChange={(e) => setFormPassword({ ...formPassword, [campo.name]: e.target.value })}
                                        className="con-toggle"
                                    />
                                    <button
                                        type="button"
                                        className="perfil-password-toggle"
                                        onClick={() => setMostrarPassword({
                                            ...mostrarPassword,
                                            [campo.toggleKey]: !mostrarPassword[campo.toggleKey]
                                        })}
                                    >
                                        {mostrarPassword[campo.toggleKey] ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                                    </button>
                                </div>
                                {erroresPassword[campo.name] && <p className="campo-error">{erroresPassword[campo.name]}</p>}
                            </div>
                        ))}

                        <button type="submit" className="boton-perfil" disabled={cambiandoPassword}>
                            {!cambiandoPassword && <IconLock size={16} />}
                            {cambiandoPassword ? 'Cambiando...' : 'Cambiar contrasena'}
                        </button>
                    </form>
                </div>

            </div>
        </>
    );
}

export default Perfil;