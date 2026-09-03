import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import { obtenerNotificaciones, marcarTodasLeidas } from '../services/notificacionService';
import logoPayX from '../assets/payx-logo.png';
import { IconHome, IconSettings, IconLogOut, IconBell } from './icons/Icons';
import './Navbar.css';

// Titulo corto a mostrar segun el codigo de plantilla de la notificacion.
const TITULOS_PLANTILLA = {
    INICIO_SES: 'Inicio de sesión',
};

function formatearHora(fechaIso) {
    const fecha = new Date(fechaIso);
    return fecha.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [notificaciones, setNotificaciones] = useState([]);
    const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
    const notificacionesRef = useRef(null);

    const [usuario, setUsuario] = useState(() => JSON.parse(localStorage.getItem('usuario') || '{}'));
    const noLeidas = notificaciones.length;

    // Se actualiza cuando cambia algo del usuario guardado (ej: nueva foto de perfil
    // desde la pantalla de Perfil), sin necesidad de recargar la pagina.
    useEffect(() => {
        const refrescarUsuario = () => setUsuario(JSON.parse(localStorage.getItem('usuario') || '{}'));
        window.addEventListener('usuario-actualizado', refrescarUsuario);
        return () => window.removeEventListener('usuario-actualizado', refrescarUsuario);
    }, []);

    // Trae las notificaciones no leidas del usuario al montar el navbar
    useEffect(() => {
        obtenerNotificaciones()
            .then(setNotificaciones)
            .catch(() => {});
    }, []);

    // Cierra el panel de notificaciones al hacer clic afuera
    useEffect(() => {
        if (!notificacionesAbiertas) return;
        function manejarClickAfuera(e) {
            if (notificacionesRef.current && !notificacionesRef.current.contains(e.target)) {
                setNotificacionesAbiertas(false);
            }
        }
        document.addEventListener('mousedown', manejarClickAfuera);
        return () => document.removeEventListener('mousedown', manejarClickAfuera);
    }, [notificacionesAbiertas]);

    const marcarTodasComoLeidas = async () => {
        try {
            await marcarTodasLeidas();
            setNotificaciones([]);
        } catch {
            // Si falla, dejamos las notificaciones como estaban
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const cerrarMenu = () => setMenuAbierto(false);

    const links = [
        { path: '/inicio', label: 'Inicio', Icon: IconHome },
    ];

    // Solo agregar el link de Admin si el usuario tiene rol ADMIN
    if (usuario.rol === 'ADMIN') {
        links.push({ path: '/admin', label: 'Admin', Icon: IconSettings });
    }

    return (
        <>
            <nav className="navbar">
                <div className="navbar-contenedor">

                    {/* Logo */}
                    <Link to="/inicio" className="navbar-logo" onClick={cerrarMenu}>
                        <div className="navbar-logo-box">
                            <img src={logoPayX} alt="PayX" />
                        </div>
                        <span className="navbar-marca">PayX</span>
                    </Link>

                    {/* Links centrales (desktop) */}
                    <div className="navbar-links">
                        {links.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`navbar-link ${location.pathname === link.path ? 'activo' : ''}`}
                            >
                                <link.Icon className="navbar-link-icon" size={16} />
                                <span>{link.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Acciones de usuario (desktop) */}
                    <div className="navbar-acciones">
                        <div className="navbar-notificaciones" ref={notificacionesRef}>
                            <button
                                className="navbar-notificaciones-boton"
                                onClick={() => setNotificacionesAbiertas((abierto) => !abierto)}
                                title="Notificaciones"
                                aria-label="Notificaciones"
                            >
                                <IconBell size={19} />
                                {noLeidas > 0 && <span className="navbar-notificaciones-badge">{noLeidas}</span>}
                            </button>

                            {notificacionesAbiertas && (
                                <div className="navbar-notificaciones-panel">
                                    <div className="navbar-notificaciones-header">
                                        <h3>Notificaciones</h3>
                                        {noLeidas > 0 && (
                                            <button className="navbar-notificaciones-marcar" onClick={marcarTodasComoLeidas}>
                                                Marcar todas como leídas
                                            </button>
                                        )}
                                    </div>
                                    <div className="navbar-notificaciones-lista">
                                        {notificaciones.length === 0 && (
                                            <p className="navbar-notificaciones-vacio">No tenés notificaciones nuevas</p>
                                        )}
                                        {notificaciones.map((n) => (
                                            <div key={n.id} className="navbar-notificacion-item no-leida">
                                                <span className="navbar-notificacion-punto" />
                                                <div className="navbar-notificacion-texto">
                                                    <p className="navbar-notificacion-titulo">{TITULOS_PLANTILLA[n.plantillaCodigo] || 'Notificación'}</p>
                                                    <p className="navbar-notificacion-detalle">{n.mensaje}</p>
                                                    <span className="navbar-notificacion-hora">{formatearHora(n.fecha)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link to="/perfil" className="navbar-usuario" title="Ir a mi perfil">
                            <div className="navbar-avatar">
                                {usuario.fotoPerfilUrl
                                    ? <img src={usuario.fotoPerfilUrl} alt="" />
                                    : usuario.nombreCompleto?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <span className="navbar-nombre">{usuario.nombreCompleto}</span>
                        </Link>
                        <button onClick={handleLogout} className="navbar-logout" title="Cerrar sesion">
                            <IconLogOut size={17} />
                        </button>
                    </div>

                    {/* Boton hamburguesa (mobile) */}
                    <button
                        className={`navbar-hamburguesa ${menuAbierto ? 'abierto' : ''}`}
                        onClick={() => setMenuAbierto(!menuAbierto)}
                        aria-label="Menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                </div>
            </nav>

            {/* Menu mobile (overlay) */}
            <div className={`navbar-menu-mobile ${menuAbierto ? 'abierto' : ''}`}>
                <div className="navbar-menu-mobile-contenido">

                    <Link to="/perfil" className="navbar-menu-usuario" onClick={cerrarMenu}>
                        <div className="navbar-avatar grande">
                            {usuario.fotoPerfilUrl
                                ? <img src={usuario.fotoPerfilUrl} alt="" />
                                : usuario.nombreCompleto?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="navbar-menu-nombre">{usuario.nombreCompleto}</p>
                            <p className="navbar-menu-email">{usuario.email}</p>
                        </div>
                    </Link>

                    <div className="navbar-menu-notificaciones">
                        <div className="navbar-notificaciones-header">
                            <h3><IconBell size={16} /> Notificaciones</h3>
                            {noLeidas > 0 && (
                                <button className="navbar-notificaciones-marcar" onClick={marcarTodasComoLeidas}>
                                    Marcar todas como leídas
                                </button>
                            )}
                        </div>
                        <div className="navbar-notificaciones-lista">
                            {notificaciones.length === 0 && (
                                <p className="navbar-notificaciones-vacio">No tenés notificaciones nuevas</p>
                            )}
                            {notificaciones.map((n) => (
                                <div key={n.id} className="navbar-notificacion-item no-leida">
                                    <span className="navbar-notificacion-punto" />
                                    <div className="navbar-notificacion-texto">
                                        <p className="navbar-notificacion-titulo">{TITULOS_PLANTILLA[n.plantillaCodigo] || 'Notificación'}</p>
                                        <p className="navbar-notificacion-detalle">{n.mensaje}</p>
                                        <span className="navbar-notificacion-hora">{formatearHora(n.fecha)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="navbar-menu-links">
                        {links.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={cerrarMenu}
                                className={`navbar-menu-link ${location.pathname === link.path ? 'activo' : ''}`}
                            >
                                <link.Icon className="navbar-link-icon" size={16} />
                                <span>{link.label}</span>
                            </Link>
                        ))}
                    </div>

                    <button onClick={handleLogout} className="navbar-menu-logout">
                        <IconLogOut size={17} /> Cerrar sesion
                    </button>

                </div>
            </div>

            {/* Backdrop para cerrar el menu mobile al hacer clic afuera */}
            {menuAbierto && <div className="navbar-backdrop" onClick={cerrarMenu}></div>}
        </>
    );
}

export default Navbar;