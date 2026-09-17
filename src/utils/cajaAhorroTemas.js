import {
    IconPiggyBank, IconWallet, IconTrendingUp, IconHome,
    IconTarget, IconShield, IconBriefcase, IconUmbrella,
    IconHeart, IconGift, IconShoppingBag, IconBookOpen,
} from '../components/icons/Icons';

// Deben coincidir exactamente con las listas blancas del backend
// (CajaAhorroService.COLORES_VALIDOS / ICONOS_VALIDOS): si se agrega una acá
// sin agregarla también ahí, el backend la va a rechazar igual.
export const COLORES_CAJA = ['#ff6b1a', '#f59e0b', '#16a34a', '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b', '#dc2626'];

export const ICONOS_CAJA = [
    { key: 'piggy-bank', label: 'Ahorro', Icon: IconPiggyBank },
    { key: 'target', label: 'Meta', Icon: IconTarget },
    { key: 'shield', label: 'Emergencia', Icon: IconShield },
    { key: 'umbrella', label: 'Imprevistos', Icon: IconUmbrella },
    { key: 'briefcase', label: 'Trabajo', Icon: IconBriefcase },
    { key: 'book-open', label: 'Estudio', Icon: IconBookOpen },
    { key: 'heart', label: 'Salud', Icon: IconHeart },
    { key: 'gift', label: 'Regalo', Icon: IconGift },
    { key: 'shopping-bag', label: 'Compras', Icon: IconShoppingBag },
    { key: 'home', label: 'Casa', Icon: IconHome },
    { key: 'wallet', label: 'Billetera', Icon: IconWallet },
    { key: 'trending-up', label: 'Inversión', Icon: IconTrendingUp },
];
