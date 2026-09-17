import { IconZap, IconFlame, IconDroplet, IconWifi, IconTv, IconPhone } from '../components/icons/Icons';

// Icono y color por servicio, para mostrar el catalogo que ya viene armado
// desde el backend (FacturaService.SERVICIOS) - el codigo debe coincidir.
export const TEMA_POR_SERVICIO = {
    LUZ: { Icon: IconZap, color: '#f59e0b' },
    GAS: { Icon: IconFlame, color: '#ff6b1a' },
    AGUA: { Icon: IconDroplet, color: '#0ea5e9' },
    INTERNET: { Icon: IconWifi, color: '#8b5cf6' },
    CABLE: { Icon: IconTv, color: '#ec4899' },
    TELEFONIA: { Icon: IconPhone, color: '#16a34a' },
};

export const TEMA_DEFAULT = { Icon: IconZap, color: '#64748b' };
