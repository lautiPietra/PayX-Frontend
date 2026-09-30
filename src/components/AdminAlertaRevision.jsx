import { useState } from 'react';
import AdminAvatar from './AdminAvatar';
import './AdminAlertas.css';

const MAX_NOTA = 500;

const ETIQUETA_ESTADO = { LEIDA: 'Leída', ANALIZADA: 'Analizada' };

function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// El usuario protagonista de una alerta (avatar, nombre y email). Lo usan la lista de pendientes y el historial.
export function BloqueUsuarioAlerta({ usuario }) {
    return (
        <div className="admin-alerta-usuario">
            <AdminAvatar key={usuario.fotoPerfilUrl || 'sin-foto'} usuario={usuario} />
            <div>
                <p className="admin-alerta-usuario-nombre">
                    {usuario.nombreCompleto}
                    {!usuario.activo && <span className="admin-badge inactivo">Inactivo</span>}
                </p>
                <p className="admin-alerta-usuario-email">{usuario.email}</p>
            </div>
        </div>
    );
}

// Quien marco la alerta, cuando, en que estado y con que nota (lo que muestra cada fila del historial).
export function InfoRevision({ revision }) {
    return (
        <div className="admin-alerta-revision">
            <span className={`admin-alerta-estado ${revision.estado.toLowerCase()}`}>
                {ETIQUETA_ESTADO[revision.estado] || revision.estado}
            </span>
            <span className="admin-alerta-revision-quien">
                por {revision.adminNombre} · {formatFecha(revision.fecha)}
            </span>
            {revision.nota && <p className="admin-alerta-nota">“{revision.nota}”</p>}
        </div>
    );
}

// Campo para escribir la nota de una revision (opcional) con su boton de confirmar. "onConfirmar" recibe el texto
// (sin espacios de mas). Es un formulario: Enter en el textarea no envia, pero el boton si.
export function EditorNota({ inicial = '', etiquetaConfirmar, onConfirmar, onCancelar, enviando }) {
    const [nota, setNota] = useState(inicial);

    return (
        <form
            className="admin-alerta-editor"
            onSubmit={(e) => { e.preventDefault(); onConfirmar(nota.trim()); }}
        >
            <label>
                Nota (opcional)
                <textarea
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    maxLength={MAX_NOTA}
                    rows={2}
                    placeholder="Qué encontraste, qué decidiste..."
                    autoFocus
                />
            </label>
            <div className="admin-alerta-editor-pie">
                <span className="admin-alerta-editor-contador">{nota.length}/{MAX_NOTA}</span>
                <button type="button" className="secundario" onClick={onCancelar} disabled={enviando}>Cancelar</button>
                <button type="submit" className="primario" disabled={enviando}>
                    {enviando ? 'Guardando...' : etiquetaConfirmar}
                </button>
            </div>
        </form>
    );
}
