import { createElement } from 'react';
import { IconAlertTriangle, IconDollarSign, IconZap, IconUsers, IconShield } from './icons/Icons';
import { haceCuanto } from '../utils/fechas';
import './AdminAlertas.css';

// Icono por regla; los codigos son los de AdminAlertaService.
const TEMA_REGLA = {
    MONTO_ALTO: { Icon: IconDollarSign },
    RAFAGA: { Icon: IconZap },
    CUENTA_NUEVA: { Icon: IconUsers },
    SALDO_NEGATIVO: { Icon: IconAlertTriangle },
    ESCALADA_PRIVILEGIOS: { Icon: IconShield },
};

const ETIQUETA_SEVERIDAD = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };

function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// Una alerta de actividad sospechosa. "ahoraMs" es el "ahora" del servidor (el fin de la ventana que
// analizo), no el reloj de esta computadora. Lo que va debajo de la descripcion (el usuario y sus
// acciones en la pestaña de alertas; nada en la ficha de un usuario) llega como children.
function AdminAlertaItem({ alerta, ahoraMs, children }) {
    const tema = TEMA_REGLA[alerta.regla] || TEMA_REGLA.SALDO_NEGATIVO;
    const severidad = alerta.severidad.toLowerCase();

    return (
        <div className={`admin-alerta ${severidad}`}>
            <span className="admin-alerta-icono">{createElement(tema.Icon, { size: 18 })}</span>
            <div className="admin-alerta-cuerpo">
                <div className="admin-alerta-cabecera">
                    <span className={`admin-alerta-severidad ${severidad}`}>
                        {ETIQUETA_SEVERIDAD[alerta.severidad] || alerta.severidad}
                    </span>
                    <h4 className="admin-alerta-titulo">{alerta.titulo}</h4>
                    {/* Una alerta del historial puede no tener fecha (la copia guardada no la traia). */}
                    {alerta.fecha && (
                        <span className="admin-alerta-hora" title={formatFecha(alerta.fecha)}>{haceCuanto(alerta.fecha, ahoraMs)}</span>
                    )}
                </div>

                <p className="admin-alerta-descripcion">{alerta.descripcion}</p>

                {children}
            </div>
        </div>
    );
}

export default AdminAlertaItem;
