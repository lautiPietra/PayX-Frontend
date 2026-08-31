import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Splash.css';

// Debe coincidir con el delay del fade-out final definido en Splash.css
const REDIRECT_DELAY_MS = 2550;

function Splash() {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/login');
        }, REDIRECT_DELAY_MS);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="splash-screen">
            <div className="splash-logo">
                <span className="splash-letra">P</span>
                <span className="splash-letra">a</span>
                <span className="splash-letra">y</span>
                <span className="splash-letra splash-letra-x">X</span>
            </div>
            <p className="splash-tagline">Tu billetera digital</p>
        </div>
    );
}

export default Splash;
