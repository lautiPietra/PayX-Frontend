import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Sin "globals: true" a proposito: describe/it/expect/vi se importan explicitos en cada
    // test (mismo estilo del resto del proyecto) para que ESLint los reconozca sin configurar
    // un set de globals aparte solo para los tests.
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
