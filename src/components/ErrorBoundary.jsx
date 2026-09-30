import { Component } from 'react';

// Red de seguridad para errores al renderizar. Sin esto, cualquier excepcion en una pantalla (un dato que llega
// distinto de lo esperado, un bug) desmontaba TODA la app y el usuario quedaba mirando una pagina en blanco, sin
// ningun boton para salir. Tiene que ser un componente de clase: React solo atrapa errores de render con
// getDerivedStateFromError/componentDidCatch, no hay equivalente con hooks.
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hayError: false };
    }

    static getDerivedStateFromError() {
        return { hayError: true };
    }

    componentDidCatch(error, info) {
        console.error('Error al mostrar la pantalla', error, info?.componentStack);
    }

    render() {
        if (!this.state.hayError) {
            return this.props.children;
        }
        return (
            <div role="alert" style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center',
                fontFamily: 'Inter, sans-serif', background: '#f5f5f5', color: '#1a1a1a',
            }}>
                <h1 style={{ fontSize: '22px', margin: 0 }}>Algo salió mal</h1>
                <p style={{ color: '#6b7280', margin: 0, maxWidth: '360px' }}>
                    No pudimos mostrar esta pantalla. Tu dinero y tus datos no se vieron afectados.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => window.location.reload()} style={estiloBoton('#ffffff', '#1a1a1a')}>
                        Recargar
                    </button>
                    <button type="button" onClick={() => { window.location.href = '/inicio'; }} style={estiloBoton('#ff6b1a', '#ffffff')}>
                        Ir al inicio
                    </button>
                </div>
            </div>
        );
    }
}

function estiloBoton(fondo, texto) {
    return {
        background: fondo, color: texto, border: '1px solid #e5e7eb', borderRadius: '10px',
        padding: '10px 18px', fontWeight: 600, cursor: 'pointer',
    };
}

export default ErrorBoundary;
