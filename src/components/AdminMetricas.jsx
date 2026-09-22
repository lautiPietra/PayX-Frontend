import { useState, useEffect } from 'react';
import { obtenerMetricas } from '../services/adminService';
import { useValorAnimado } from '../hooks/useValorAnimado';
import { formatearNumero, calcularVariacion } from '../utils/formatoMoneda';
import EstadisticaBarras from './EstadisticaBarras';
import EstadisticaDonut from './EstadisticaDonut';
import { IconUsers, IconTrendingUp, IconBarChart, IconClock, IconWallet, IconDollarSign, IconPiggyBank, IconCalendar } from './icons/Icons';
import './AdminMetricas.css';

const PERIODOS = [
    { dias: 7, label: '7 días' },
    { dias: 30, label: '30 días' },
    { dias: 90, label: '90 días' },
];

// Lo ultimo que se cargo de cada periodo. Las metricas viven en una pestaña que se desmonta al cambiar de pestaña: sin esto,
// cada vuelta mostraba el esqueleto hasta que respondia la base. Con esto se muestra lo anterior al instante y se refresca
// en segundo plano (el pedido sale igual).
const ultimoPorPeriodo = new Map();

function formatearEntero(valor) {
    return Math.round(Number(valor)).toLocaleString('es-AR');
}

function formatearFechaLarga(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// En estas metricas "subir" es bueno (mas usuarios, mas actividad): verde si sube, rojo si baja.
function Variacion({ variacion, vacio = 'Sin datos del período anterior' }) {
    if (!variacion) return <span className="admin-delta neutra">{vacio}</span>;
    if (variacion.tipo === 'nuevo') return <span className="admin-delta sube">Nuevo: no había antes</span>;

    const redondeada = Math.round(variacion.valor * 10) / 10;
    if (redondeada === 0) return <span className="admin-delta neutra">Igual que el período anterior</span>;

    const sube = redondeada > 0;
    return (
        <span className={`admin-delta ${sube ? 'sube' : 'baja'}`}>
            <IconTrendingUp size={12} className={sube ? '' : 'invertido'} />
            {Math.abs(redondeada).toLocaleString('es-AR', { maximumFractionDigits: 1 })}% {sube ? 'más' : 'menos'} que el período anterior
        </span>
    );
}

function Esqueleto() {
    return (
        <>
            <div className="admin-metricas-kpis">
                {[0, 1, 2, 3].map((i) => <div key={i} className="admin-skeleton-fila admin-metricas-skeleton-kpi" />)}
            </div>
            <div className="admin-skeleton-fila admin-metricas-skeleton-bloque" />
            <div className="admin-skeleton-fila admin-metricas-skeleton-bloque" />
        </>
    );
}

// Dashboard del admin: cuantos usuarios hay, cuanta plata se movio, donde esta la plata y como
// viene la actividad dia a dia. Reutiliza los graficos hechos a mano de Estadisticas.
function AdminMetricas() {
    const [dias, setDias] = useState(30);
    const [resultado, setResultado] = useState(() => { // { dias, datos, error }
        const guardado = ultimoPorPeriodo.get(30);
        return guardado ? { dias: 30, datos: guardado, error: '' } : null;
    });

    function cambiarPeriodo(nuevo) {
        setDias(nuevo);
        const guardado = ultimoPorPeriodo.get(nuevo);
        if (guardado) setResultado({ dias: nuevo, datos: guardado, error: '' });
    }

    useEffect(() => {
        // Respuestas desordenadas al cambiar rapido de periodo: se ignora la que ya no corresponde.
        let cancelado = false;
        obtenerMetricas(dias)
            .then((datos) => {
                ultimoPorPeriodo.set(dias, datos);
                if (!cancelado) setResultado({ dias, datos, error: '' });
            })
            .catch((error) => {
                if (cancelado) return;
                setResultado((previo) => ({
                    dias,
                    datos: previo?.datos ?? null,
                    error: error.response?.data?.error || 'No se pudieron cargar las métricas. Probá de nuevo en un momento.',
                }));
            });
        return () => { cancelado = true; };
    }, [dias]);

    const datos = resultado?.datos ?? null;
    const cargando = resultado?.dias !== dias;
    const error = cargando ? '' : (resultado?.error ?? '');

    // El volumen "corre" hasta su valor al cargar y al cambiar de periodo.
    const [volumenAnimado] = useValorAnimado(datos ? Number(datos.actividad.volumenPesos) : 0, 1000);

    const kpis = datos ? [
        {
            clave: 'usuarios',
            Icon: IconUsers,
            etiqueta: 'Usuarios',
            valor: formatearEntero(datos.usuarios.total),
            detalle: `${formatearEntero(datos.usuarios.activos)} activos · ${formatearEntero(datos.usuarios.inactivos)} inactivos`,
            variacion: (
                <>
                    <span className="admin-kpi-extra">+{formatearEntero(datos.usuarios.nuevos)} en el período</span>
                    <Variacion variacion={calcularVariacion(datos.usuarios.nuevos, datos.usuarios.nuevosPeriodoAnterior)} />
                </>
            ),
        },
        {
            clave: 'volumen',
            Icon: IconTrendingUp,
            etiqueta: 'Volumen operado',
            valor: `$ ${formatearNumero(volumenAnimado)}`,
            detalle: 'en pesos, todas las operaciones',
            variacion: <Variacion variacion={calcularVariacion(datos.actividad.volumenPesos, datos.actividad.volumenPesosPeriodoAnterior)} />,
        },
        {
            clave: 'operaciones',
            Icon: IconBarChart,
            etiqueta: 'Operaciones',
            valor: formatearEntero(datos.actividad.operaciones),
            detalle: 'transferencias, cambios, plazos y servicios',
            variacion: <Variacion variacion={calcularVariacion(datos.actividad.operaciones, datos.actividad.operacionesPeriodoAnterior)} />,
        },
        {
            clave: 'pendientes',
            Icon: IconClock,
            etiqueta: 'Transferencias pendientes',
            valor: formatearEntero(datos.actividad.transferenciasPendientes),
            detalle: 'esperando confirmación (ahora)',
            variacion: null,
        },
    ] : [];

    const patrimonio = datos ? [
        { clave: 'pesos', Icon: IconWallet, etiqueta: 'Pesos en cuentas', valor: `$ ${formatearNumero(datos.patrimonio.saldoPesos)}` },
        { clave: 'usd', Icon: IconDollarSign, etiqueta: 'Dólares en cuentas', valor: `US$ ${formatearNumero(datos.patrimonio.saldoUsd)}` },
        { clave: 'cajas', Icon: IconPiggyBank, etiqueta: 'En cajas de ahorro', valor: `$ ${formatearNumero(datos.patrimonio.cajasAhorro)}` },
        { clave: 'plazos', Icon: IconCalendar, etiqueta: 'En plazos fijos activos', valor: `$ ${formatearNumero(datos.patrimonio.plazosFijosActivos)}` },
    ] : [];

    const categorias = datos ? datos.operacionesPorTipo.map((t) => ({
        codigo: t.codigo,
        etiqueta: t.etiqueta,
        monto: t.volumenPesos,
        porcentaje: t.porcentaje,
        detalle: `${formatearEntero(t.cantidad)} ${t.cantidad === 1 ? 'operación' : 'operaciones'}`,
    })) : [];

    const claveGraficos = datos ? `${datos.dias}-${datos.desde}` : '';

    return (
        <div className="admin-metricas">
            <div className="admin-metricas-cabecera">
                <p className="admin-metricas-rango">
                    {datos ? `Del ${formatearFechaLarga(datos.desde)} al ${formatearFechaLarga(datos.hasta)}` : 'Resumen de la plataforma'}
                </p>
                <div className="admin-chips" role="tablist" aria-label="Período">
                    {PERIODOS.map((p) => (
                        <button
                            key={p.dias}
                            role="tab"
                            aria-selected={dias === p.dias}
                            className={`admin-chip ${dias === p.dias ? 'activo' : ''}`}
                            onClick={() => cambiarPeriodo(p.dias)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && <div className="admin-mensaje error">{error}</div>}
            {!datos && cargando && <Esqueleto />}

            {datos && (
                <div className={`admin-metricas-contenido ${cargando ? 'cargando' : ''}`}>
                    <div className="admin-metricas-kpis">
                        {kpis.map((k) => (
                            <div key={k.clave} className="admin-kpi">
                                <span className="admin-kpi-icono"><k.Icon size={17} /></span>
                                <p className="admin-kpi-etiqueta">{k.etiqueta}</p>
                                <p className="admin-kpi-valor">{k.valor}</p>
                                <p className="admin-kpi-detalle">{k.detalle}</p>
                                {k.variacion && <div className="admin-kpi-variacion">{k.variacion}</div>}
                            </div>
                        ))}
                    </div>

                    <div className="admin-bloque">
                        <h3 className="admin-bloque-titulo">Plata en la plataforma <span>(ahora)</span></h3>
                        <div className="admin-patrimonio">
                            {patrimonio.map((p) => (
                                <div key={p.clave} className="admin-patrimonio-item">
                                    <span className="admin-patrimonio-icono"><p.Icon size={16} /></span>
                                    <div>
                                        <p className="admin-patrimonio-etiqueta">{p.etiqueta}</p>
                                        <p className="admin-patrimonio-valor">{p.valor}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="admin-bloque">
                        <h3 className="admin-bloque-titulo">Volumen operado por día</h3>
                        <EstadisticaBarras
                            key={`vol-${claveGraficos}`}
                            puntos={datos.serieDiaria.map((p) => ({ fecha: p.fecha, monto: p.volumenPesos }))}
                        />
                    </div>

                    <div className="admin-bloque">
                        <h3 className="admin-bloque-titulo">Operaciones por tipo</h3>
                        <EstadisticaDonut
                            categorias={categorias}
                            total={datos.actividad.volumenPesos}
                            textoVacio="Sin operaciones en este período"
                            etiquetaTotal="Volumen"
                        />
                    </div>

                    <div className="admin-bloque">
                        <h3 className="admin-bloque-titulo">Usuarios nuevos por día</h3>
                        <EstadisticaBarras
                            key={`usr-${claveGraficos}`}
                            puntos={datos.serieDiaria.map((p) => ({ fecha: p.fecha, monto: p.nuevosUsuarios }))}
                            formatoValor={(v) => `${formatearEntero(v)} ${Number(v) === 1 ? 'usuario nuevo' : 'usuarios nuevos'}`}
                            formatoEje={formatearEntero}
                            etiquetaPromedio="Promedio"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminMetricas;
