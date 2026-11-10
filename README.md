# PayX Frontend

Cliente web de PayX, una billetera virtual simulada: transferencias, dólares, cripto, plazos fijos, cajas de ahorro y panel de administración. Es un proyecto de práctica y no mueve dinero real.

## Demo

Todavía no hay una versión publicada.

<!-- Agregar las capturas en docs/ y descomentar las líneas:
![Captura](docs/captura-1.png)
![Captura](docs/captura-2.png)
-->

## Funcionalidades

Usuario
- Registro con código de verificación por email, login con email o con Google y recuperación de contraseña.
- Saldos en pesos, dólares y cripto, con la cotización del dólar oficial y de seis criptomonedas.
- Transferencias directas o pendientes de confirmación. Se pueden confirmar, cancelar y editar el concepto.
- Compra y venta de dólares y de cripto, plazos fijos, cajas de ahorro (depósitos y retiros), tarjeta virtual y pago de servicios.
- Mis movimientos: historial unificado de seis tipos, con filtros por tipo y fecha, subfiltros de transferencias (dirección, estado y moneda) y paginado de a 30.
- Estadísticas de gastos por categoría y por día, notificaciones y perfil con foto y cambio de contraseña.
- Asistente de IA en un chat flotante.

Administrador
- Métricas con comparación contra el período anterior y gráficos.
- Usuarios (rol, baja, reactivación y ficha), monitor de transacciones con filtros, alertas con historial, auditoría, configuración y plantillas de notificación.
- Exportación a CSV de usuarios, transacciones, auditoría y alertas.

## Stack

- Frontend: React 19, React Router 7, Axios, Vite 8, CSS por componente.
- Calidad: Vitest, React Testing Library, jsdom, ESLint.
- Backend: API REST en el repositorio aparte PayX-backend (Spring Boot).
- Base de datos: PostgreSQL en Supabase, accedida solo desde el backend.
- Infraestructura: sin despliegue todavía. Incluye `vercel.json` y `public/_redirects` para servirlo como SPA.

## Arquitectura

Es una SPA con React Router. `src/App.jsx` define las rutas públicas, las privadas (`RutaPrivada`) y las de administrador (`RutaAdmin`). Las pantallas están en `src/pages`, los componentes en `src/components`, el acceso a la API en `src/services` (un archivo por módulo, con Axios) y la lógica sin React en `src/utils`. No hay Redux ni Context: cada pantalla maneja su estado y consulta la API. Inicio, Mis movimientos, Plazos fijos y la campana de notificaciones se refrescan cada 5 segundos. El JWT se guarda en `localStorage` y un interceptor de Axios lo agrega a cada pedido.

## Decisiones técnicas

- **Interceptores de Axios** (`src/services/authService.js`): agregan el token, guardan el que renueva el backend en `X-Renewed-Token` y cierran la sesión ante un 401. Así ninguna pantalla maneja el token.
- **Lógica sin React** (`src/utils/actividad.js`, `montos.js`): los filtros y conteos de movimientos y el control de decimales de los montos son funciones puras. Se testean sin renderizar nada.
- **URL del backend por variable** (`VITE_API_URL`): antes estaba escrita en cada servicio y, con el sitio publicado, el navegador le pegaba a la máquina de cada usuario.
- **Asistente solo en rutas privadas de usuario**: consulta la cuenta personal de quien está logueado, por eso no aparece en el panel de administración.

## Cómo correrlo

Requisitos: Node.js (probado con Node 24) y el backend corriendo en `http://localhost:8080`.

```
npm install
npm run dev
```

Abre en `http://localhost:5173`. Otros comandos: `npm run build`, `npm run preview`, `npm run lint`.

Variable de entorno (ver `.env.example`):
- `VITE_API_URL`: URL pública del backend, sin barra final. Si no se define, usa `http://localhost:8080`. No es un secreto: termina dentro del JS que baja el navegador.

El Client ID de Google está en `src/config.js` (no es un secreto). El login con Google solo funciona desde los orígenes autorizados en el proyecto de Google Cloud del autor.

## Tests

```
npm test
```

Hay 102 tests en 11 archivos (Vitest y React Testing Library). Cubren utilidades (`actividad`, `montos`, almacenamiento del asistente), el servicio de autenticación, algunos componentes y la pantalla Mis movimientos. La mayoría de las pantallas no tiene tests y no hay tests end to end.

## Próximos pasos

- Publicar el frontend y el backend (hosting, `VITE_API_URL`, CORS y origen autorizado de Google).
- Tests de más pantallas y un flujo end to end.

## Autor

Lautaro Pietrantonio. [LinkedIn](https://www.linkedin.com/in/lautaro-pietrantonio-803731365/)

Repositorios relacionados: PayX-backend (API) y [PayXMobile](https://github.com/lautiPietra/PayXMobile) (app Android).
