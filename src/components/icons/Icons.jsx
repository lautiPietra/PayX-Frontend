// Iconos SVG (estilo trazo, consistentes) usados en toda la app.
// Reemplazan a los emojis para dar una apariencia mas profesional.

function IconBase({ children, size = 18, className, ...props }) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {children}
        </svg>
    );
}

export function IconMail(props) {
    return (
        <IconBase {...props}>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </IconBase>
    );
}

export function IconLock(props) {
    return (
        <IconBase {...props}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </IconBase>
    );
}

export function IconEye(props) {
    return (
        <IconBase {...props}>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </IconBase>
    );
}

export function IconEyeOff(props) {
    return (
        <IconBase {...props}>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
        </IconBase>
    );
}

export function IconUser(props) {
    return (
        <IconBase {...props}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </IconBase>
    );
}

export function IconPhone(props) {
    return (
        <IconBase {...props}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
        </IconBase>
    );
}

export function IconAtSign(props) {
    return (
        <IconBase {...props}>
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 9 0 1 0-4 8" />
        </IconBase>
    );
}

export function IconIdCard(props) {
    return (
        <IconBase {...props}>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <circle cx="8.5" cy="12" r="2" />
            <path d="M13.5 10.5h5M13.5 13.5h3.5" />
        </IconBase>
    );
}

export function IconArrowLeft(props) {
    return (
        <IconBase {...props}>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
        </IconBase>
    );
}

export function IconFileText(props) {
    return (
        <IconBase {...props}>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
        </IconBase>
    );
}

export function IconCheck(props) {
    return (
        <IconBase {...props}>
            <polyline points="20 6 9 17 4 12" />
        </IconBase>
    );
}

export function IconSettings(props) {
    return (
        <IconBase {...props}>
            <path d="M12 2a1 1 0 0 1 1 1v1.09c.73.17 1.41.46 2.03.84l.77-.77a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 0 1 0 1.41l-.77.77c.38.62.67 1.3.84 2.03H21a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1.09a7.94 7.94 0 0 1-.84 2.03l.77.77a1 1 0 0 1 0 1.41l-1.42 1.42a1 1 0 0 1-1.41 0l-.77-.77c-.62.38-1.3.67-2.03.84V21a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.09a7.94 7.94 0 0 1-2.03-.84l-.77.77a1 1 0 0 1-1.41 0l-1.42-1.42a1 1 0 0 1 0-1.41l.77-.77A7.94 7.94 0 0 1 4.09 14H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1.09c.17-.73.46-1.41.84-2.03l-.77-.77a1 1 0 0 1 0-1.41l1.42-1.42a1 1 0 0 1 1.41 0l.77.77c.62-.38 1.3-.67 2.03-.84V3a1 1 0 0 1 1-1z" />
            <circle cx="12" cy="12" r="3" />
        </IconBase>
    );
}

export function IconLogOut(props) {
    return (
        <IconBase {...props}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </IconBase>
    );
}

export function IconUsers(props) {
    return (
        <IconBase {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </IconBase>
    );
}

export function IconBell(props) {
    return (
        <IconBase {...props}>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </IconBase>
    );
}

export function IconSearch(props) {
    return (
        <IconBase {...props}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </IconBase>
    );
}

export function IconRefreshCw(props) {
    return (
        <IconBase {...props}>
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
        </IconBase>
    );
}

export function IconUserX(props) {
    return (
        <IconBase {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="17" y1="8" x2="22" y2="13" />
            <line x1="22" y1="8" x2="17" y2="13" />
        </IconBase>
    );
}

export function IconAlertTriangle(props) {
    return (
        <IconBase {...props}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </IconBase>
    );
}

export function IconEdit(props) {
    return (
        <IconBase {...props}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
        </IconBase>
    );
}

export function IconPlus(props) {
    return (
        <IconBase {...props}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </IconBase>
    );
}

export function IconTrash(props) {
    return (
        <IconBase {...props}>
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
        </IconBase>
    );
}

export function IconHome(props) {
    return (
        <IconBase {...props}>
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </IconBase>
    );
}

export function IconSend(props) {
    return (
        <IconBase {...props}>
            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
            <path d="m21.854 2.147-10.94 10.939" />
        </IconBase>
    );
}

export function IconQrCode(props) {
    return (
        <IconBase {...props}>
            <rect x="3" y="3" width="5" height="5" rx="1" />
            <rect x="16" y="3" width="5" height="5" rx="1" />
            <rect x="3" y="16" width="5" height="5" rx="1" />
            <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
            <path d="M21 21v.01" />
            <path d="M12 7v3a2 2 0 0 1-2 2H7" />
            <path d="M3 12h.01" />
            <path d="M12 3h.01" />
            <path d="M12 16v.01" />
            <path d="M16 12h1" />
            <path d="M21 12v.01" />
            <path d="M12 21v-1" />
        </IconBase>
    );
}

export function IconPiggyBank(props) {
    return (
        <IconBase {...props}>
            <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" />
            <path d="M2 9v1c0 1.1.9 2 2 2h1" />
            <path d="M16 11h.01" />
        </IconBase>
    );
}

export function IconDollarSign(props) {
    return (
        <IconBase {...props}>
            <line x1="12" y1="2" x2="12" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </IconBase>
    );
}

export function IconArrowDownCircle(props) {
    return (
        <IconBase {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8" />
            <path d="m8 12 4 4 4-4" />
        </IconBase>
    );
}

export function IconArrowUpCircle(props) {
    return (
        <IconBase {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16V8" />
            <path d="m8 12 4-4 4 4" />
        </IconBase>
    );
}

export function IconCoins(props) {
    return (
        <IconBase {...props}>
            <circle cx="8" cy="8" r="6" />
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
            <path d="M7 6h1v4" />
            <path d="m16.71 13.88.7.71-2.82 2.82" />
        </IconBase>
    );
}

export function IconInbox(props) {
    return (
        <IconBase {...props}>
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </IconBase>
    );
}

export function IconCreditCard(props) {
    return (
        <IconBase {...props}>
            <rect x="1" y="4" width="22" height="16" rx="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
        </IconBase>
    );
}

export function IconTrendingUp(props) {
    return (
        <IconBase {...props}>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </IconBase>
    );
}

export function IconWallet(props) {
    return (
        <IconBase {...props}>
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </IconBase>
    );
}

export function IconClock(props) {
    return (
        <IconBase {...props}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </IconBase>
    );
}

export function IconCalendar(props) {
    return (
        <IconBase {...props}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </IconBase>
    );
}

export function IconPercent(props) {
    return (
        <IconBase {...props}>
            <line x1="19" y1="5" x2="5" y2="19" />
            <circle cx="6.5" cy="6.5" r="2.5" />
            <circle cx="17.5" cy="17.5" r="2.5" />
        </IconBase>
    );
}

export function IconChevronDown(props) {
    return (
        <IconBase {...props}>
            <path d="m6 9 6 6 6-6" />
        </IconBase>
    );
}

export function IconX(props) {
    return (
        <IconBase {...props}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </IconBase>
    );
}

export function IconGoogle({ size = 18, className }) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
        </svg>
    );
}
