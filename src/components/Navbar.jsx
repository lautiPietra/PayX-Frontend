import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import logoPayX from '../assets/payx-logo.png';
import { IconHome, IconSettings, IconLogOut, IconBell } from './icons/Icons';
import './Navbar.css';

// Notificaciones de ejemplo: todavia no existe un endpoint para traer las notificaciones
// del usuario logueado, asi que se usan solo para mostrar como va a quedar el panel.
const NOTIFICACIONES_INICIALES = [
    { id: 1, titulo: 'Transferencia recibida', detalle: 'Recibiste $ 11.500,00 de María Clara Aslan', hora: 'Hace 10 min', leida: false },
    { id: 2, titulo: 'Pago de servicio', detalle: 'Se debitaron $ 8.300,00 para el pago de Edenor', hora: 'Hace 2 h', leida: false },
    { id: 3, titulo: 'Nuevo inicio de sesión', detalle: 'Detectamos un inicio de sesión desde un nuevo dispositivo', hora: 'Ayer', leida: true },
    { id: 4, titulo: 'Plazo fijo constituido', detalle: 'Tu plazo fijo se constituyó correctamente', hora: '29/08', leida: true },
];

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [notificaciones, setNotificaciones] = useState(NOTIFICACIONES_INICIALES);
    const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
    const notificacionesRef = useRef(null);

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const noLeidas = notificaciones.filter((n) => !n.leida).length;

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

    const marcarTodasComoLeidas = () => {
        setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
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
                                        {notificaciones.map((n) => (
                                            <div key={n.id} className={`navbar-notificacion-item ${n.leida ? '' : 'no-leida'}`}>
                                                {!n.leida && <span className="navbar-notificacion-punto" />}
                                                <div className="navbar-notificacion-texto">
                                                    <p className="navbar-notificacion-titulo">{n.titulo}</p>
                                                    <p className="navbar-notificacion-detalle">{n.detalle}</p>
                                                    <span className="navbar-notificacion-hora">{n.hora}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link to="/perfil" className="navbar-usuario" title="Ir a mi perfil">
                            <div className="navbar-avatar">
                                {usuario.nombreCompleto?.charAt(0)?.toUpperCase() || 'U'}
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
                            {usuario.nombreCompleto?.charAt(0)?.toUpperCase() || 'U'}
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
                            {notificaciones.map((n) => (
                                <div key={n.id} className={`navbar-notificacion-item ${n.leida ? '' : 'no-leida'}`}>
                                    {!n.leida && <span className="navbar-notificacion-punto" />}
                                    <div className="navbar-notificacion-texto">
                                        <p className="navbar-notificacion-titulo">{n.titulo}</p>
                                        <p className="navbar-notificacion-detalle">{n.detalle}</p>
                                        <span className="navbar-notificacion-hora">{n.hora}</span>
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