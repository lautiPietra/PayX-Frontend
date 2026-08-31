# Changelog — PayX Frontend

Registro de cambios importantes del proyecto. Cada entrada explica **qué** se cambió, **por qué**, y **qué archivos** se tocaron.

---

## 2026-08-31 — Ícono de notificaciones en el Navbar

**Objetivo:** agregar un ícono de notificaciones (campana) a la izquierda del avatar/nombre de usuario, en el Navbar.

### Qué se agregó
- Botón de campana en el Navbar de escritorio, ubicado justo a la izquierda del bloque de perfil, con una **badge roja/naranja** mostrando la cantidad de notificaciones no leídas.
- Al hacer click abre un **panel desplegable** con la lista de notificaciones: las no leídas se destacan con fondo tenue y un punto naranja. Tiene un botón "Marcar todas como leídas" (actualiza el estado en el front, sin backend). El panel se cierra solo al hacer click afuera.
- En el **menú mobile** (hamburguesa) se agregó el mismo bloque de notificaciones, mostrado siempre expandido dentro del panel deslizable, arriba de los links de navegación.
- Como todavía no existe un endpoint para traer las notificaciones del usuario logueado, la lista es de **ejemplo** (transferencia recibida, pago de servicio, inicio de sesión nuevo, plazo fijo constituido) — mismo criterio que el resto de los datos mock ya usados en Home.

### Archivos modificados
- `src/components/Navbar.jsx`
- `src/components/Navbar.css`

### Pendiente / próximos pasos posibles
- Conectar con un endpoint real de notificaciones cuando exista en el backend (por ahora el backend solo tiene `NotificacionController`/`PlantillaController` para las plantillas que arma el admin, no un feed de notificaciones por usuario).

---

## 2026-08-31 — Comprar y vender criptomonedas (BTC, ETH, SOL)

**Objetivo:** que "Comprar criptomonedas" y "Vender criptomonedas" abran una pantalla completa, limitada a las 3 criptomonedas pedidas: Bitcoin, Ethereum y Solana.

Se creó [CriptoModal.jsx](src/components/CriptoModal.jsx) (+ [CriptoModal.css](src/components/CriptoModal.css)), con el mismo patrón de pantalla completa que Transferir/Plazo fijo/Cambio de dólares, sumando un **desplegable para elegir la criptomoneda** (BTC, ETH o SOL) ya que a diferencia de las pantallas anteriores acá hay más de un activo posible.

### Cómo funciona
- Precios de ejemplo con spread compra/venta por cada moneda (no hay endpoint de cotizaciones de cripto todavía): BTC $94.800.000 / $93.200.000, ETH $3.180.000 / $3.110.000, SOL $212.000 / $205.000.
- Tenencias de ejemplo por moneda (tampoco hay endpoint de tenencias): BTC 0,0005 · ETH 0,012 · SOL 6,5 — usadas como saldo disponible al vender.
- **Comprar**: se elige la moneda, se ingresa un monto en pesos (contra el saldo en pesos de la cuenta) y se calcula cuánta cripto se recibe.
- **Vender**: se elige la moneda, el chip de "saldo disponible" pasa a mostrar la tenencia de esa moneda específica, se ingresa cuánto vender de esa cripto y se calcula cuántos pesos se reciben.
- Al cambiar de moneda en el desplegable se resetea el monto ingresado, para no confundir unidades (ej. pasar de "0.0005" BTC a pensar que son 0.0005 SOL).
- Cada moneda usa su propia cantidad de decimales al mostrarse (BTC 8, ETH 6, SOL 3), como es habitual en apps de cripto.
- Resumen en vivo igual al resto de las pantallas: monto, cotización, saldo actual y saldo luego de la operación (en rojo si es negativo). Es una **simulación**: no hay backend de cripto todavía, no se descuenta ni acredita saldo real.

### Archivos nuevos
- `src/components/CriptoModal.jsx`
- `src/components/CriptoModal.css`

### Archivos modificados
- `src/pages/Home.jsx` — "Comprar criptomonedas" y "Vender criptomonedas" ahora abren `CriptoModal` en vez de mostrar el toast de "próximamente".

---

## 2026-08-31 — Comprar y vender dólares

**Objetivo:** que "Comprar dólares" y "Vender dólares" (antes mostraban solo el aviso de "próximamente") abran una pantalla completa, con el mismo patrón visual usado en Transferir y Plazo fijo.

Se creó un único componente reutilizable [CambioDolaresModal.jsx](src/components/CambioDolaresModal.jsx) (+ [CambioDolaresModal.css](src/components/CambioDolaresModal.css)) parametrizado por `config`, para no duplicar la pantalla de compra y la de venta — la diferencia entre ambas es solo qué moneda se entrega y cuál se recibe.

### Cómo funciona
- Se simula un **spread** entre puntas: comprar dólares sale a $1.265 y vender dólares se liquida a $1.235 (valores de ejemplo, no hay endpoint de cotizaciones todavía).
- **Comprar dólares**: se ingresa un monto en pesos, se muestra el saldo disponible en pesos, y se calcula cuántos dólares se reciben (`monto / cotización`).
- **Vender dólares**: se ingresa un monto en dólares, se muestra el saldo disponible en dólares, y se calcula cuántos pesos se reciben (`monto × cotización`).
- En ambos casos: botón "Usar todo", conversión en vivo debajo del campo de monto, aviso con la cotización aplicada, y una card de resumen (igual a la de Transferir/Plazo fijo) con el saldo que queda después de la operación — en rojo si el monto supera el saldo disponible.
- Como no hay backend de cambio de divisas, la operación es una **simulación**: no se descuenta ni acredita saldo real.

### Archivos nuevos
- `src/components/CambioDolaresModal.jsx`
- `src/components/CambioDolaresModal.css`

### Archivos modificados
- `src/pages/Home.jsx` — "Comprar dólares" y "Vender dólares" ahora abren `CambioDolaresModal` (antes mostraban el toast de "próximamente"); se agregaron las cotizaciones de ejemplo `COTIZACION_COMPRA_USD` y `COTIZACION_VENTA_USD`.

---

## 2026-08-31 — Modal de Transferir y Transferencia en dólares

**Objetivo:** mostrar cómo sería el modal de transferencia en pesos y en dólares, con el saldo disponible siempre visible.

Se creó un componente reutilizable [TransferModal.jsx](src/components/TransferModal.jsx) (+ [TransferModal.css](src/components/TransferModal.css)) parametrizado por `config` (título, símbolo, saldo, si muestra equivalente en pesos y la cotización) para no duplicar el modal de pesos y el de dólares.

### Qué incluye cada modal
- **Saldo disponible** en un chip destacado arriba del formulario (lo pedido explícitamente).
- Campo destinatario (CVU/alias/@usuario), campo de monto con botón "Usar todo" (autocompleta con el saldo disponible), campo de motivo opcional.
- **Validación real**: destinatario vacío, monto ≤ 0, o monto mayor al saldo disponible — todos muestran un error inline y no dejan continuar.
- El modal de dólares además muestra el **equivalente en pesos** en vivo mientras se escribe el monto, usando una cotización de ejemplo ($1.250, no hay endpoint de cotizaciones todavía).
- Como no hay backend de transferencias, al confirmar se simula un breve "Procesando..." y se muestra una pantalla de éxito con el resumen (a quién, cuánto, motivo) — dejando claro visualmente cómo sería el flujo completo, sin persistir ni afectar el saldo real en ningún lado.

### Cómo se abren
- El botón "Transferir" de la card de saldo y el botón "Transferir" de la grilla de acciones abren el modal de pesos.
- "Transferencia en dólares" de la grilla abre el modal de dólares.
- El resto de los botones de "Qué querés hacer" e "Inversiones" siguen mostrando el toast de "próximamente" sin cambios.

### Archivos nuevos
- `src/components/TransferModal.jsx`, `TransferModal.css`

### Archivos modificados
- `src/pages/Home.jsx` (estado del modal activo, configs de pesos/dólares, conexión de los botones)
- `src/components/icons/Icons.jsx` (`IconX`, `IconWallet`)

### Pendiente / próximos pasos posibles
- Reemplazar la simulación de éxito por una llamada real cuando exista un endpoint de transferencias en el backend.
- Traer la cotización del dólar de una API real en vez del valor fijo `1250`.

### Rediseño posterior (mismo día): de modal chico a pantalla completa
Feedback: el modal quedaba muy chico, pidieron que sea "como una página" y que el motivo sea un desplegable con varias opciones en vez de texto libre.

- El componente pasó de ser un cuadro centrado de 440px a una **pantalla completa** (`position: fixed; inset: 0`) con su propio header (botón "Volver" + botón cerrar) y una animación de entrada tipo "empuje de página" (fade + slide desde la derecha) en vez del slide-up de un modal chico.
- **Layout de dos columnas** en desktop: el formulario a la izquierda, y a la derecha una card oscura de resumen que se actualiza en vivo mientras se completa el formulario — muestra el monto, a quién, el motivo elegido, el saldo actual y el **saldo que va a quedar después de la transferencia** (en rojo si el monto supera el saldo disponible, incluso antes de tocar "Transferir"). En mobile se apila a una columna con el resumen arriba.
- El campo "Motivo" dejó de ser un input de texto libre y ahora es un **desplegable** (`<select>` estilizado, con ícono de flecha) con 10 opciones predefinidas: Alquiler, Servicios, Comida y supermercado, Transporte, Salud, Educación, Entretenimiento, Préstamo o devolución, Regalo, Otro.
- La pantalla de éxito también se agrandó y ahora muestra el motivo elegido como una etiqueta.

### Archivos modificados (este ajuste)
- `src/components/TransferModal.jsx`, `TransferModal.css` (reescritos)
- `src/components/icons/Icons.jsx` (`IconChevronDown`)

---

## 2026-08-31 — Pantalla de Plazo fijo

**Objetivo:** que "Plazos fijos" (antes un botón que solo mostraba "próximamente") abra una pantalla completa para constituir un plazo fijo, siguiendo el mismo patrón de página completa que se usó para Transferir.

Se creó [PlazoFijoModal.jsx](src/components/PlazoFijoModal.jsx), que reutiliza las clases de layout de [TransferModal.css](src/components/TransferModal.css) (mismo header, misma grilla de dos columnas, misma card oscura de resumen) para mantener consistencia visual, y suma un archivo propio [PlazoFijoModal.css](src/components/PlazoFijoModal.css) solo para el aviso de vencimiento.

### Qué incluye
- Chip de **saldo disponible** (en pesos) arriba del formulario, igual que en Transferir.
- Campo **Monto a depositar**, con botón "Usar todo".
- Campo **Plazo**: desplegable con 5 opciones (30, 60, 90, 180 y 365 días), cada una con su TNA de ejemplo (35% a 42%, más alta cuanto más largo el plazo).
- Aviso de que el dinero queda inmovilizado hasta la fecha de vencimiento (calculada según el plazo elegido).
- Columna de resumen en vivo: monto a invertir, plazo + TNA, **interés estimado** y **total a cobrar al vencimiento** (calculados como interés simple: `monto × TNA/100 × días/365`), y la fecha de vencimiento.
- Validaciones: monto vacío o $0, monto por debajo de un mínimo de $1.000, y monto mayor al saldo disponible.
- Pantalla de éxito ("¡Plazo fijo constituido!") con el resumen de la inversión.
- Como todavía no hay un endpoint de inversiones en el backend, la constitución del plazo fijo es una **simulación** (igual que las transferencias): no se persiste ni descuenta saldo real.

### Archivos nuevos
- `src/components/PlazoFijoModal.jsx`
- `src/components/PlazoFijoModal.css`

### Archivos modificados
- `src/pages/Home.jsx` — la acción "Plazos fijos" ahora abre `PlazoFijoModal` en vez de mostrar el toast de "próximamente".
- `src/components/icons/Icons.jsx` — se agregaron `IconCalendar` e `IconPercent`.

---

## 2026-08-31 — Página principal (Home / dashboard)

**Objetivo:** una pantalla de inicio real después del login, inspirada en el home de Mercado Pago pero con la identidad de PayX — card de saldo con tabs de moneda, botón de transferir, una grilla de accesos rápidos (plazos fijos, dólares, cripto, etc.) y actividad reciente. Todo con animaciones y **sin funcionalidad real todavía** (según lo pedido): los botones muestran un toast "disponible próximamente" en vez de navegar a algún lado.

### Por qué los datos son de ejemplo
El backend todavía no tiene un endpoint de saldo ni de movimientos (solo existen `AuthController`, `AdminController`, `PerfilController`, `NotificacionController` y `PlantillaController`). Así que el saldo, el rendimiento y las "últimas actividades" en [Home.jsx](src/pages/Home.jsx) son datos hardcodeados solo para mostrar cómo va a quedar la pantalla — no vienen de una API. El nombre del usuario en el saludo ("Hola, Lautaro") sí es real, sale del mismo `localStorage` que ya usa el Navbar.

### Qué incluye la pantalla
- **Card de saldo**: tabs Pesos / Dólares / Cripto, número animado (cuenta desde 0 hasta el valor al montar o cambiar de tab, easing suave), botón para ocultar/mostrar el saldo (👁 → `••••••`), botones "Transferir" y "Ver movimientos".
- **Card promocional** oscura al costado, tipo "Hacé rendir tu dinero" (banner genérico, no inventa ninguna alianza o beneficio real).
- **Grilla de accesos rápidos** (12 botones, con entrada animada escalonada): Transferir, Ingresar dinero, Pagar con QR, Pagar servicios, Plazos fijos, Transferencia en dólares, Comprar dólares, Vender dólares, Comprar criptomonedas, Vender criptomonedas, Solicitar dinero, Tarjeta virtual.
- **Últimas actividades**: lista de movimientos de ejemplo con ícono, monto en verde/negro según sea ingreso o egreso.
- Todos los botones (incluida "Consultar todas") disparan el mismo aviso tipo toast, no rompen ni navegan a ninguna pantalla que no existe.

### Cambios de navegación
- Nueva ruta `/inicio` (protegida, como `/perfil`).
- El login ahora redirige a `/inicio` en vez de `/Perfil` (además corrige una inconsistencia de mayúsculas que tenía la ruta original).
- El logo del Navbar y el nuevo link "Inicio" apuntan a `/inicio`; se agregó como primer ítem del menú.
- Los redirects de "no sos admin" (`RutaAdmin` en App.jsx y el `useEffect` de `AdminPanel.jsx`) ahora mandan a `/inicio` en vez de `/perfil`.

### Íconos nuevos
`IconHome`, `IconSend`, `IconQrCode`, `IconPiggyBank`, `IconDollarSign`, `IconArrowDownCircle`, `IconArrowUpCircle`, `IconCoins`, `IconInbox`, `IconCreditCard`, `IconTrendingUp` — agregados a [Icons.jsx](src/components/icons/Icons.jsx).

### Bug encontrado y corregido de paso
El toast de "próximamente" usaba `mostrarProximamente._t` para guardar el id del timeout y poder cancelarlo — pero esa función se recrea en cada render, así que el valor guardado se perdía y el debounce no funcionaba realmente. Se reemplazó por un `useRef`, que sí persiste entre renders.

### Archivos nuevos
- `src/pages/Home.jsx`, `src/pages/Home.css`

### Archivos modificados
- `src/App.jsx` (ruta `/inicio`, redirects de `RutaAdmin`)
- `src/pages/Login.jsx` (redirect post-login)
- `src/pages/AdminPanel.jsx` (redirect si no es admin)
- `src/components/Navbar.jsx` (link "Inicio", logo apunta a `/inicio`)
- `src/components/icons/Icons.jsx`

### Pendiente / próximos pasos posibles
- Conectar saldo y movimientos reales cuando exista el endpoint correspondiente en el backend (`Cuenta` ya existe como modelo, falta el controller/service).
- Implementar de verdad alguna de las acciones rápidas (probablemente Transferir primero).

### Ajuste posterior (mismo día): se sacaron 3 acciones y se separó en dos secciones
- Se sacaron **Ingresar dinero**, **Pagar servicios** y **Solicitar dinero** de la grilla de accesos rápidos.
- Las 9 acciones restantes se separaron en dos secciones:
  - **"Qué querés hacer"**: Transferir, Transferencia en dólares, Pagar con QR, Tarjeta virtual.
  - **"Inversiones"** (nueva): Plazos fijos, Comprar dólares, Vender dólares, Comprar criptomonedas, Vender criptomonedas.
- `IconInbox` (que se había agregado para "Solicitar dinero") quedó sin uso en `Home.jsx` pero se dejó exportado en [Icons.jsx](src/components/icons/Icons.jsx) por si se usa más adelante.

### Ajuste posterior (mismo día): "Mi Perfil" salió del menú, ahora se entra tocando el avatar
- Se sacó el link "Mi Perfil" de `links` en [Navbar.jsx](src/components/Navbar.jsx) — el menú central ahora solo muestra "Inicio" (y "Admin" si corresponde).
- El bloque de avatar + nombre de la esquina superior derecha (`.navbar-usuario`) pasó de ser un `<div>` estático a un `<Link to="/perfil">`, con hover (fondo naranja claro) para que se note que es clickeable. Mismo cambio en el menú mobile (`.navbar-menu-usuario`, el bloque con el avatar grande + nombre + email).

---

## 2026-08-31 — Rediseño del Panel de Administración y las Plantillas de Notificación

**Objetivo:** mismo tratamiento profesional que Perfil (tipografía, sin emojis) aplicado a AdminPanel (tabs de Usuarios y Auditoría) y a las 4 pantallas de Plantillas de Notificación — y agregarles un botón para volver al panel de admin, que no tenían.

### Hallazgo importante
Las 4 pantallas de Plantillas (`AltaPlantilla`, `BajaPlantilla`, `EditarPlantilla`, `ListadoPlantillas`) eran un **mini-sistema visual aparte**: no usaban el `<Navbar />` compartido, tenían su propia cabecera negra con el logo "PayX" repetida en cada archivo, y usaban un naranja distinto (`#f97316`) al del resto de la app (`#ff6b1a`). Por eso no tenían forma de volver al panel — no había ninguna navegación persistente, solo un link "Volver al listado de plantillas" que las conectaba entre sí, sin salida hacia `/admin`.

### Qué se hizo
- **[AdminPanel.jsx](src/pages/AdminPanel.jsx) / [AdminPanel.css](src/pages/AdminPanel.css)**: tipografía Inter + Plus Jakarta Sans, y se sacaron los emojis de las tabs (👥📋🔔), el buscador (🔍), los íconos de auditoría (🔄🚫✅) y el modal de confirmación (⚠️) — todos reemplazados por SVG.
- **Las 4 pantallas de Plantillas** se migraron a la misma arquitectura que Perfil/AdminPanel:
  - Se agregó `<Navbar />` (antes no lo tenían — ahora hay navegación persistente a Perfil/Admin/Logout desde cualquier pantalla de plantillas).
  - Se sacó la cabecera negra con el logo "PayX" de cada card (ya no hace falta, el Navbar ya muestra la marca).
  - Se agregó un botón **"Volver al panel de administración"** (`.plantillas-volver-admin`, con `IconArrowLeft`) al inicio de las 4 pantallas — esto es lo que faltaba.
  - Color unificado: el naranja `#f97316` de estas pantallas pasó a ser `#ff6b1a`, el mismo que usa el resto de la app.
  - Emojis/dingbats reemplazados por SVG: 🔍 (buscador y "sin resultados"), ✏ (editar) y 🗑 (baja) en la tabla de plantillas, ✓ (checkbox), ⬜ (badge "no editable" → ahora usa un ícono de candado) y ⚠ (aviso de código inmutable y modal de confirmación).
  - Tipografía Inter + Plus Jakarta Sans en las 4.
  - Los badges de campo `#` / `Aa` / `M` (código / nombre / mensaje) se dejaron igual — no son emojis, es una convención de diseño ya usada consistentemente, solo se les actualizó el color de borde para que coincida con la paleta unificada.
- Se agregaron 9 íconos nuevos a [Icons.jsx](src/components/icons/Icons.jsx): `IconUsers`, `IconBell`, `IconSearch`, `IconRefreshCw`, `IconUserX`, `IconAlertTriangle`, `IconEdit`, `IconTrash`, `IconPlus`.
- De paso se corrigieron 5 errores de lint preexistentes (`'err' is defined but never used` en bloques `catch`) en los archivos que ya se estaban reescribiendo.

### Archivos modificados
- `src/pages/AdminPanel.jsx`, `AdminPanel.css`
- `src/pages/ListadoPlantillas.jsx`, `ListadoPlantillas.css` (reescritos)
- `src/pages/AltaPlantilla.jsx`, `AltaPlantilla.css` (reescritos)
- `src/pages/EditarPlantilla.jsx`, `EditarPlantilla.css` (reescritos)
- `src/pages/BajaPlantilla.jsx`, `BajaPlantilla.css` (reescritos)
- `src/components/icons/Icons.jsx`

### Pendiente / próximos pasos posibles
- Las 4 pantallas de Plantillas siguen llamando a `axios` directo con el token de `localStorage` adentro de cada componente, en vez de pasar por un `plantillaService.js` como `authService.js`/`adminService.js`. No se tocó porque es un cambio de arquitectura, no de diseño — pero es la próxima mejora natural si se sigue tocando esta sección.

---

## 2026-08-31 — Rediseño de "Mi Perfil" y el Navbar

**Objetivo:** que el panel de perfil se vea como el de una billetera virtual real — tipografía profesional, sin emojis, mejor jerarquía visual. Se incluyó el Navbar en este pase porque se renderiza siempre junto con Perfil (no es una pantalla aparte) y tenía los mismos emojis (👤 ⚙️ ↗).

- **Renombrado** `src/components/icons/AuthIcons.jsx` → **`src/components/icons/Icons.jsx`**: ya no es un set exclusivo de auth, se reutiliza en Perfil y Navbar. Se actualizaron los imports en los 5 archivos de auth que lo usaban. Se agregaron 4 iconos nuevos: `IconFileText`, `IconCheck`, `IconSettings`, `IconLogOut`.
- **[Perfil.jsx](src/pages/Perfil.jsx) / [Perfil.css](src/pages/Perfil.css)**:
  - Tipografía Inter + Plus Jakarta Sans (igual que auth).
  - Se reemplazaron todos los emojis (📋 👤 🔒 📞 💾 🙈 👁️ y la flecha "←") por los iconos SVG del set compartido.
  - Nuevo encabezado con avatar circular (mismo estilo degradé naranja que el Navbar) al lado del título "Mi Perfil".
  - Bordes muy oscuros (`#9a9a9a`, `#646262`, herencia de versiones anteriores) reemplazados por el gris sutil (`#e5e7eb`) que ya usa el resto de la app — antes se veía más a wireframe que a producto terminado.
- **[Navbar.jsx](src/components/Navbar.jsx) / [Navbar.css](src/components/Navbar.css)**:
  - Tipografía aplicada a la barra y al menú mobile.
  - "PayX" del navbar ahora en Plus Jakarta Sans bold (sin itálica — esa queda solo para la animación del splash).
  - Iconos de "Mi Perfil", "Admin" y "Cerrar sesión" (desktop y mobile) reemplazados por SVG.

### Archivos nuevos
- `src/components/icons/Icons.jsx` (reemplaza a `AuthIcons.jsx`)

### Archivos modificados
- `src/pages/Perfil.jsx`, `Perfil.css`
- `src/components/Navbar.jsx`, `Navbar.css`
- `src/pages/Login.jsx`, `Registro.jsx`, `OlvidePassword.jsx`, `NuevaPassword.jsx`, `VerificarCodigoReset.jsx` — solo el import del set de iconos (`AuthIcons` → `Icons`), sin cambios de comportamiento.

### Archivos eliminados
- `src/components/icons/AuthIcons.jsx`

### Pendiente / próximos pasos posibles
- AdminPanel y las 4 pantallas de Plantillas (Alta/Baja/Editar/Listado) siguen con el diseño anterior — quedan afuera de este pase.

---

## 2026-08-31 — Pantalla de bienvenida (splash) antes del login

**Objetivo:** que al abrir la app no se vaya directo al login, sino que primero se vea una pantalla en blanco con el nombre "PayX" apareciendo letra por letra (P-a-y en negro, X en naranja), y recién después de la animación se redirija automáticamente a `/login`.

- Se creó [src/pages/Splash.jsx](src/pages/Splash.jsx) + [Splash.css](src/pages/Splash.css): pantalla en blanco con las 4 letras revelándose una por una (fade + leve desplazamiento hacia arriba, con delay escalonado), seguida de un fade-out de toda la pantalla y una redirección a `/login` por código (`useNavigate` + `setTimeout`).
- El timeout de redirección en el JS (`REDIRECT_DELAY_MS = 2700`) está sincronizado con el delay del fade-out en el CSS — si se ajusta la duración de la animación, hay que actualizar ambos.
- La ruta raíz `/` en [App.jsx](src/App.jsx) ahora renderiza `<Splash />` en vez de redirigir directo con `<Navigate to="/login" />`.
- No usa la imagen del logo (`payx-logo.png`), es texto puro con la tipografía ya definida para auth (Plus Jakarta Sans, 800), para poder animar cada letra por separado.

### Archivos nuevos
- `src/pages/Splash.jsx`
- `src/pages/Splash.css`

### Archivos modificados
- `src/App.jsx` — ruta `/` apunta a `Splash` en vez de redirigir directo

### Ajuste posterior (mismo día): animación más rápida, itálica y natural
Feedback: la primera versión se sentía muy forzada/lenta y sin personalidad.

- **Tipografía itálica real**: se agregó el eje `ital` de Plus Jakarta Sans (peso 800) al link de Google Fonts en [index.html](index.html), y `font-style: italic` en `.splash-logo`. Es la itálica de diseño de la fuente, no un `transform: skew` simulado — se ve más prolija.
- **Animación más orgánica**: cada letra ahora combina `opacity` + `filter: blur(6px → 0)` + `scale(0.94 → 1)` + una traslación vertical más sutil (6px en vez de 16px), con la curva `cubic-bezier(0.22, 1, 0.36, 1)` en vez de `ease` lineal — da una sensación de "entrar en foco" en lugar de un salto mecánico.
- **Más rápida**: el delay entre letras bajó de 0.25s a ~0.09s, y el hold + fade-out total se redujo de 2.7s a 1.65s. `REDIRECT_DELAY_MS` en [Splash.jsx](src/pages/Splash.jsx) se actualizó a `1650` para mantenerse sincronizado con el fade-out del CSS.

### Segundo ajuste (mismo día): un poco más lento + frase debajo del logo
- Se agregó `<p className="splash-tagline">Tu billetera digital</p>` debajo del wordmark, con su propio fade-in (0.5s, empieza a los 1.1s, misma curva `cubic-bezier` que las letras).
- El timing se alargó un poco: el delay entre letras subió a 0.14s (de 0.09s) y la duración de cada letra a 0.55s (de 0.5s), así queda tiempo para que la frase entre después del logo sin sentirse apurado. Duración total: **2.55s** (antes 1.65s). `REDIRECT_DELAY_MS` actualizado a `2550`.

---

## 2026-08-31 — Rediseño de la sección de autenticación

**Objetivo:** modernizar la parte de auth (Login, Registro, Verificación de email, Recuperar contraseña) con tipografía profesional, iconos consistentes en vez de emojis, y dejar preparado el botón de "Continuar con Google". El resto de la app (Navbar, Perfil, AdminPanel, Plantillas) **no se tocó** — queda para una próxima etapa.

### Tipografía
- Se agregaron las fuentes **Inter** (texto general) y **Plus Jakarta Sans** (títulos, peso 700-800) vía Google Fonts.
- Cargadas globalmente en [index.html](index.html) con `preconnect` para no penalizar el rendimiento, pero solo se **aplican** en las pantallas de auth (cada contenedor `.login-container`, `.registro-container`, `.verificacion-container`, `.recuperar-container` define su propio `font-family`), así que el resto de la app no cambia visualmente todavía.
- Antes no había ningún `font-family` definido en la app (`index.css` y `App.css` estaban vacíos), por lo que el navegador caía en su fuente serif por defecto (Times New Roman). Esto era la causa principal de que se viera "poco profesional".

### Iconos en vez de emojis
- Se creó [src/components/icons/AuthIcons.jsx](src/components/icons/AuthIcons.jsx): set de iconos SVG estilo trazo (mail, lock, eye/eye-off, user, phone, at-sign, id-card, arrow-left, y el logo de Google a color), reutilizable en toda la sección de auth.
- Se reemplazaron los emojis (✉️ 🔒 👁️ 🙈 👤 📞 👥 💳 ←) por estos iconos en:
  - [Login.jsx](src/pages/Login.jsx)
  - [Registro.jsx](src/pages/Registro.jsx)
  - [OlvidePassword.jsx](src/pages/OlvidePassword.jsx)
  - [NuevaPassword.jsx](src/pages/NuevaPassword.jsx)
  - [VerificarCodigoReset.jsx](src/pages/VerificarCodigoReset.jsx)
  - (Verificacion.jsx ya usaba un ícono SVG propio para el escudo, no tenía emojis)

### Botón "Continuar con Google"
- Agregado **solo en Login** ([Login.jsx](src/pages/Login.jsx)), debajo del botón de "Iniciar sesión", con un divisor "o continúa con".
- **Todavía no tiene integración real de OAuth** — es un placeholder visual. Al hacer click muestra un mensaje informativo ("El inicio de sesión con Google estará disponible muy pronto").
- Pendiente para cuando se quiera implementar de verdad: registrar el proyecto en Google Cloud Console, agregar `@react-oauth/google` (o similar) en el frontend, y un endpoint en el backend (`/api/auth/google`) que valide el token de Google y devuelva un JWT propio, igual que hace `/api/auth/login`.

### Archivos modificados
- `index.html` — fuentes de Google Fonts
- `src/pages/Login.jsx`, `Login.css`
- `src/pages/Registro.jsx`, `Registro.css`
- `src/pages/Verificacion.css`
- `src/pages/OlvidePassword.jsx`
- `src/pages/NuevaPassword.jsx`
- `src/pages/VerificarCodigoReset.jsx`
- `src/pages/Recuperar.css` (compartido por OlvidePassword, NuevaPassword y VerificarCodigoReset)

### Archivos nuevos
- `src/components/icons/AuthIcons.jsx`
- `CHANGELOG.md` (este archivo)

### Pendiente / próximos pasos posibles
- Extender el mismo sistema tipográfico + iconos al resto de la app (Navbar, Perfil, AdminPanel, Plantillas) si se decide continuar el rediseño.
- Implementar el login con Google de verdad (frontend + backend).
