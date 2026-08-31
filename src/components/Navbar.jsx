import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import logoPayX from '../assets/payx-logo.png';
import './Navbar.css';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuAbierto, setMenuAbierto] = useState(false);

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const cerrarMenu = () => setMenuAbierto(false);

    const links = [
        { path: '/perfil', label: 'Mi Perfil', icon: '👤' },
    ];

    // Solo agregar el link de Admin si el usuario tiene rol ADMIN
    if (usuario.rol === 'ADMIN') {
        links.push({ path: '/admin', label: 'Admin', icon: '⚙️' });
    }

    return (
        <>
            <nav className="navbar">
                <div className="navbar-contenedor">

                    {/* Logo */}
                    <Link to="/perfil" className="navbar-logo" onClick={cerrarMenu}>
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
                                <span className="navbar-link-icon">{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Acciones de usuario (desktop) */}
                    <div className="navbar-acciones">
                        <div className="navbar-usuario">
                            <div className="navbar-avatar">
                                {usuario.nombreCompleto?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <span className="navbar-nombre">{usuario.nombreCompleto}</span>
                        </div>
                        <button onClick={handleLogout} className="navbar-logout" title="Cerrar sesion">
                            <span>↗</span>
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

                    <div className="navbar-menu-usuario">
                        <div className="navbar-avatar grande">
                            {usuario.nombreCompleto?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="navbar-menu-nombre">{usuario.nombreCompleto}</p>
                            <p className="navbar-menu-email">{usuario.email}</p>
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
                                <span className="navbar-link-icon">{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        ))}
                    </div>

                    <button onClick={handleLogout} className="navbar-menu-logout">
                        <span>↗</span> Cerrar sesion
                    </button>

                </div>
            </div>

            {/* Backdrop para cerrar el menu mobile al hacer clic afuera */}
            {menuAbierto && <div className="navbar-backdrop" onClick={cerrarMenu}></div>}
        </>
    );
}

export default Navbar;