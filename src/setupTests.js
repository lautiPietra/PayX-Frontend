// Se carga antes de cada archivo de test (ver "test.setupFiles" en vite.config.js).
// Agrega matchers como toBeInTheDocument()/toHaveTextContent() a expect().
import '@testing-library/jest-dom/vitest';

// Testing Library desmonta solo despues de cada test SI detecta un "afterEach" global, y como
// no usamos "globals: true" (ver vite.config.js) no lo encuentra: sin esto, lo que se renderiza
// en un test queda pegado en el DOM del siguiente dentro del mismo archivo (ej: dos botones
// "Cerrar sesion" en vez de uno) y las queries de getBy* explotan por ambiguas.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
});
