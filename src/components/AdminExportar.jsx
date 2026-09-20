import { useState, useEffect, useRef } from 'react';
import { descargarArchivo, nombreArchivoCsv, mensajeExportacion } from '../utils/descargas';
import { IconDownload } from './icons/Icons';
import './AdminExportar.css';

// Boton "Exportar CSV" de una lista del panel de admin, con su aviso al terminar (o si fallo).
// Se pone dentro de una fila de filtros con flex-wrap: el boton queda en la fila y el aviso ocupa la siguiente.
//  - tipo: nombre del archivo ("usuarios" -> payx-usuarios-2026-09-19.csv)
//  - exportar: pide el archivo al backend con los filtros que se estan viendo; devuelve { blob, filas, truncada }
//  - deshabilitado: por ejemplo mientras la lista carga o si no hay nada para exportar
//  - sugerencia: como acotar la busqueda si habia mas filas que el tope
function AdminExportar({ tipo, exportar, deshabilitado = false, sugerencia = '' }) {
    const [estado, setEstado] = useState({ exportando: false, aviso: null }); // aviso: { clase, texto } | null
    const montado = useRef(true);
    const enCurso = useRef(false);

    // El "true" al montar es lo que hace que funcione en StrictMode (monta, desmonta y vuelve a montar).
    useEffect(() => {
        montado.current = true;
        return () => { montado.current = false; };
    }, []);

    async function manejarClic() {
        // El estado tarda un render en deshabilitar el boton: la referencia frena un doble clic inmediato.
        if (enCurso.current) return;
        enCurso.current = true;
        setEstado({ exportando: true, aviso: null });
        try {
            const { blob, filas, truncada } = await exportar();
            const nombre = nombreArchivoCsv(tipo);
            descargarArchivo(blob, nombre);
            if (montado.current) {
                setEstado({
                    exportando: false,
                    aviso: { clase: truncada ? 'aviso' : 'exito', texto: mensajeExportacion({ nombre, filas, truncada, sugerencia }) },
                });
            }
        } catch (error) {
            if (montado.current) {
                setEstado({
                    exportando: false,
                    aviso: { clase: 'error', texto: error.response?.data?.error || 'No se pudo exportar. Probá de nuevo en un momento.' },
                });
            }
        } finally {
            enCurso.current = false;
        }
    }

    return (
        <>
            <button
                type="button"
                className={`admin-exportar-boton ${estado.exportando ? 'exportando' : ''}`}
                onClick={manejarClic}
                disabled={deshabilitado || estado.exportando}
                title="Descarga un archivo CSV (se abre en Excel) con lo que estás viendo, sin paginar"
            >
                <IconDownload size={15} /> {estado.exportando ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <p className={`admin-exportar-aviso ${estado.aviso?.clase ?? ''}`} role="status">
                {estado.aviso?.texto}
            </p>
        </>
    );
}

export default AdminExportar;
