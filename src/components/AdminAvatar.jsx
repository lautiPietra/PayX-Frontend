import { useState } from 'react';

// Las fotos de perfil viven en Cloudinary (400x400). Para una lista con muchos
// usuarios no hace falta bajar cada una a tamaño completo: se pide una miniatura
// recortada a la cara, en el formato y calidad que el navegador banque mejor.
function miniatura(url) {
    const marca = '/image/upload/';
    if (!url || !url.includes('res.cloudinary.com') || !url.includes(marca)) return url;
    return url.replace(marca, `${marca}c_fill,g_face,w_96,h_96,f_auto,q_auto/`);
}

// Foto de perfil del usuario; si no tiene, o si la imagen falla al cargar, la
// inicial del nombre. Si la miniatura falla se prueba la URL original antes de
// rendirse. Usar con key={usuario.fotoPerfilUrl}: si cambia la foto, se reinicia el intento.
function AdminAvatar({ usuario }) {
    const [intento, setIntento] = useState(0);

    const fuentes = [miniatura(usuario.fotoPerfilUrl), usuario.fotoPerfilUrl]
        .filter((url, i, todas) => url && todas.indexOf(url) === i);
    const src = fuentes[intento];

    return (
        <div className="admin-avatar">
            {src
                ? <img src={src} alt="" loading="lazy" draggable={false} onError={() => setIntento((n) => n + 1)} />
                : usuario.nombreCompleto?.charAt(0)?.toUpperCase()}
        </div>
    );
}

export default AdminAvatar;
