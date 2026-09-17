# DEVLOG — PayX

Registro cronológico de todo lo implementado y cambiado en el proyecto (frontend y backend), sesión por sesión. Cada entrada nueva se agrega al final.

---

## 2026-09-03

### Contexto del backend relevado
Se exploró el proyecto backend (`C:\Users\lauta\IdeaProjects\PayX-backend`, Spring Boot 3.4.4 + Gradle + PostgreSQL + JWT) para tener el contrato de API disponible al implementar el frontend.

Endpoints mapeados:
- **Auth** (`/api/auth`, público): `register`, `login`, `verify-email`, `resend-code`, `forgot-password`, `validate-reset-code`, `reset-password`.
- **Perfil** (`/api/perfil`, JWT): `GET` perfil propio, `PUT` actualizar (username/alias), `PUT /password`.
- **Admin** (`/api/admin`, JWT + rol admin): listar/buscar usuarios, cambiar rol, dar de baja/reactivar, ver auditoría.
- **Plantillas** (`/api/plantillas`): CRUD completo + activar/desactivar + listar activas/inactivas + búsqueda.
- **Notificaciones** (`/api/notificaciones`, JWT): listar, contar sin leer, marcar leídas, registrar login.

Seguridad: JWT vía `JwtFilter`, todo excepto `/api/auth/**` requiere autenticación. CORS habilitado para `localhost:5173/5174/3000`.

### Fix: backend no arrancaba (`APPLICATION FAILED TO START`)
**Síntoma:** al correr desde IntelliJ, fallaba con `UnknownClassException: Unable to load class named [io.jsonwebtoken.impl.security.KeysBridge]` al crear el bean `jwtUtil`.

**Causa:** el classpath generado por la run configuration de IntelliJ estaba desactualizado — solo incluía `jjwt-api` (interfaz) y no `jjwt-impl` / `jjwt-jackson` (implementación runtime) ni `postgresql`, a pesar de estar correctamente declaradas en `build.gradle` como `runtimeOnly`. El proyecto Gradle no estaba sincronizado con los cambios del `build.gradle`.

**Solución:** IntelliJ → botón **"Sync All Gradle Projects"** (panel de Gradle). Verificado corriendo `gradlew bootRun`: la app levantó OK en el puerto 8080 con conexión a Postgres.

---

### Feature: notificación de inicio de sesión en el ícono de campana (Navbar)

**Análisis del modelo de notificaciones (backend, ya existía):**
- `PlantillaNotificacion` (tabla `plantillas_notificacion`): la plantilla/tipo de mensaje reutilizable — `codigo` (único, ej. `INICIO_SES`), `nombre`, `mensajeBase`, flags `requiereOrigen`/`requiereDestino`, `activa`.
- `NotificacionUsuario` (tabla `notificaciones_usuario`): una notificación concreta ya generada para un usuario puntual — `usuarioId`, `plantillaCodigo`, `mensaje` (texto final ya armado), `leida`, `fecha`.
- `AuthService.login()` ya llama a `NotificacionService.crearNotificacionLogin(usuarioId)` en cada login exitoso, que busca la plantilla `INICIO_SES` y crea un `NotificacionUsuario` con el mensaje + fecha/hora (`dd/MM/yyyy a las HH:mm`). No requirió cambios en el backend.
- `GET /api/notificaciones` ya devuelve solo las **no leídas** del usuario logueado; `PATCH /api/notificaciones/leer` marca **todas** como leídas (no hay endpoint para marcar una individual — no existía necesidad todavía, con un solo tipo de notificación implementado).

**Cambios en el frontend:**
- Nuevo [src/services/notificacionService.js](src/services/notificacionService.js): `obtenerNotificaciones()`, `contarSinLeer()`, `marcarTodasLeidas()` contra `/api/notificaciones`.
- [src/components/Navbar.jsx](src/components/Navbar.jsx): se reemplazó el array mock `NOTIFICACIONES_INICIALES` por datos reales — fetch al montar el componente (`useEffect`), badge con la cantidad real de no leídas, botón "Marcar todas como leídas" ahora llama a la API y vacía la lista (con lo cual la notificación de login desaparece del panel tras leerla). Se agregó un mapeo `TITULOS_PLANTILLA` (código de plantilla → título corto a mostrar, hoy solo `INICIO_SES: 'Inicio de sesión'`) para poder sumar más tipos de notificación después sin tocar el resto del componente. Estado vacío ("No tenés notificaciones nuevas") agregado en CSS (`Navbar.css`).

**Pendiente de verificar por el usuario:** que la plantilla con código `INICIO_SES` exista y esté activa en la base (si no existe, `crearNotificacionLogin` no falla pero tampoco genera nada). Si falta, se puede crear desde el panel de administración → Alta de plantilla ([src/pages/AltaPlantilla.jsx](src/pages/AltaPlantilla.jsx)) con código `INICIO_SES`.

---

### Feature: inicio de sesión con Google

**Google Cloud:** se creó un proyecto y un OAuth Client ID (tipo *Web application*) en Google Cloud Console, con `http://localhost:5173` y `http://localhost:5174` como Authorized JavaScript origins. El Client ID no es secreto (viaja al navegador de todas formas), así que se guardó tal cual en el código:
- Frontend: [src/config.js](src/config.js) → `GOOGLE_CLIENT_ID`.
- Backend: `application.properties` → `google.client-id` (se usa para validar que el token recibido fue emitido para nuestra app y no para otra).

**Flujo elegido:** Google Identity Services (GIS) — el botón oficial de Google entrega un `credential` (JWT firmado por Google) directamente en el navegador, sin popups de redirect que gestionar nosotros. Ese JWT se manda al backend, que lo valida contra el endpoint oficial de Google (`https://oauth2.googleapis.com/tokeninfo`) usando `RestClient` (ya incluido en Spring Framework 6.1+/Boot 3.4, **no hizo falta agregar ninguna dependencia nueva** a `build.gradle`).

**Backend:**
- Nuevo DTO [GoogleLoginRequest.java](../PayX-backend/src/main/java/com/payx/backend/dto/GoogleLoginRequest.java) (`idToken`).
- `AuthService.loginConGoogle(idToken)`: valida el token contra Google, verifica que `aud` coincida con nuestro `google.client-id` y que el email esté verificado por Google. Si el usuario ya existe (por email) lo loguea (y si tenía el email sin verificar, lo marca verificado ya que Google lo garantiza); si no existe, lo crea con `emailVerificado=true`, `activo=true`, sin `password`/`dni`/`telefono` (esos campos ya eran nullable en la tabla `usuarios`) y con un `nombreUsuario` autogenerado a partir del email (garantizando unicidad). Reutiliza `JwtUtil` y `NotificacionService.crearNotificacionLogin(...)` igual que el login normal, así que también dispara la notificación de inicio de sesión.
- Nuevo endpoint `POST /api/auth/google` en `AuthController` (público, bajo `/api/auth/**`).

**Frontend:**
- `index.html`: se agregó `<script src="https://accounts.google.com/gsi/client">` (script oficial de Google).
- Nuevo [src/config.js](src/config.js) con el Client ID.
- [src/services/authService.js](src/services/authService.js): nueva función `loginConGoogle(idToken)` que llama a `/api/auth/google` y guarda `token`/`usuario` en `localStorage` igual que `login()`.
- [src/pages/Login.jsx](src/pages/Login.jsx): se reemplazó el botón placeholder ("Continuar con Google" que solo mostraba un aviso de "próximamente") por el botón real de Google Identity Services, renderizado dentro de un `<div>` vía `google.accounts.id.renderButton(...)`. Al tocarlo, Google entrega el `credential` a `manejarCredencialGoogle`, que llama a `loginConGoogle` y redirige a `/inicio` igual que el login tradicional.

**Verificado:** compilación del backend (`gradlew compileJava`) y build de producción del frontend (`npm run build`) sin errores; se probó el endpoint `/api/auth/google` con un token inválido y respondió `401` con el mensaje esperado, confirmando que la validación contra Google está bien conectada.

**Pendiente de probar por el usuario:** el flujo completo con una cuenta de Google real en el navegador (clickear el botón, elegir cuenta, confirmar que redirige a `/inicio` logueado). Esto requiere interacción humana con el popup de Google y no se puede automatizar desde acá.

---

### Auditoría de seguridad y corrección de bugs (auth, perfil, notificaciones, plantillas, admin)

Motivada por el bug reportado "se queda en blanco al ir al perfil". Se encontraron y corrigieron varios problemas; el detalle de cada uno:

#### 🐞 Bug: pantalla en blanco al entrar a "Mi Perfil" (causa raíz encontrada)

`PerfilService.obtenerPerfil` exige que exista una fila en la tabla `cuentas` para el usuario (`cuentaRepository.findByUsuarioId(...).orElseThrow(...)`). Esa `Cuenta` normalmente se crea en `VerificacionService.verificarCodigo()`, cuando un usuario verifica su email con el código de 6 dígitos. **Pero `AuthService.loginConGoogle()` nunca la creaba** al dar de alta un usuario nuevo por Google — así que cualquier cuenta creada por ese camino no tenía `Cuenta`, `GET /api/perfil` le devolvía 400 ("Cuenta no encontrada"), y `Perfil.jsx` no manejaba ese error: dejaba `perfil = null` y el render de abajo hacía `perfil.email`, `perfil.dni`, `perfil.cvu` sin chequeo → `TypeError` → React desmonta todo el árbol sin ErrorBoundary → pantalla blanca.

**Fix (2 capas):**
- Backend: `AuthService.loginConGoogle` ahora llama a `cuentaService.crearCuentaParaUsuario(usuario)` al crear un usuario nuevo, igual que el registro normal.
- Frontend: [Perfil.jsx](src/pages/Perfil.jsx) ahora guarda el error de carga en estado y muestra una card de error con botón "Reintentar" en vez de crashear el render — así cualquier otro error futuro (red caída, backend abajo, etc.) tampoco vuelve a dejar la pantalla en blanco.

#### 🔴 Vulnerabilidad crítica: credenciales expuestas en GitHub

`application.properties` del backend (contraseña de la base Supabase, contraseña SMTP de Brevo, y el **secreto de firma de los JWT**) está commiteado en git y **ya pusheado** a `github.com/lautiPietra/PayX-backend` desde el primer commit. No pude confirmar si el repo es público o privado, pero de cualquier forma hay que tratarlo como comprometido.

**Impacto concreto:** quien tenga ese `jwt.secret` puede **forjar un token válido para cualquier usuario, incluso con rol ADMIN**, sin necesidad de credenciales — es el peor caso posible dado que todo el esquema de autorización de la app depende únicamente de la firma de ese JWT.

**Esto no lo puedo arreglar yo solo** porque implica rotar credenciales de servicios externos (Supabase, Brevo) a los que no tengo acceso, y reescribir git history es una operación destructiva que requiere tu aprobación explícita. Recomendación:
1. Rotar YA la contraseña de la base en Supabase, la contraseña SMTP en Brevo, y generar un `jwt.secret` nuevo (esto invalida todas las sesiones activas, es esperable).
2. Sacar esos valores de `application.properties` y pasarlos a variables de entorno (`${DB_PASSWORD}`, `${JWT_SECRET}`, etc. vía `application.properties` con placeholders `${VAR:default}`).
3. Evaluar si conviene limpiar el historial de git (ej. con `git filter-repo`) — decisión tuya, no la tomé por ser destructiva.

#### 🔴 Vulnerabilidad: cualquier usuario autenticado podía administrar las plantillas de notificación

`PlantillaController` (`/api/plantillas/**`) no validaba rol en absoluto — solo pedía estar logueado (por la regla genérica `anyRequest().authenticated()` de `SecurityConfig`). El guard `RutaAdmin` del frontend es solo cosmético (chequea `localStorage` en el navegador); un usuario común, con su propio JWT válido, podía llamar directamente a la API y crear, editar, desactivar o borrar cualquier plantilla, incluida `INICIO_SES`.

**Fix:** `PlantillaService` ahora valida rol ADMIN (`validarAdmin`) al principio de cada método, igual que ya hacía `AdminService`. `PlantillaController` pasa el usuario autenticado y devuelve `403 Forbidden` si no es admin. Agregado un test unitario ([PlantillaServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/PlantillaServiceTest.java)) que falla si esta protección se rompe en el futuro — verificado en verde (3/3).

#### 🟠 Vulnerabilidad: un usuario dado de baja podía seguir usando la app

`JwtFilter` solo validaba la firma/expiración del JWT, nunca volvía a chequear el estado del usuario en la base. Resultado: si un admin daba de baja a alguien, su token viejo seguía funcionando en **todos** los endpoints protegidos hasta que expirara (hasta 24hs), porque el chequeo de `activo` solo pasaba en el momento del login.

**Fix:** `JwtFilter` ahora vuelve a consultar `activo` en la base en cada request autenticado; si no está activo, no lo autentica (queda como anónimo → 401/403 según el endpoint). Costo: un `SELECT` extra por request autenticado — aceptable a esta escala.

#### 🟠 Vulnerabilidad: sin rate limiting en ningún endpoint

No había ningún límite de peticiones. Esto permitía fuerza bruta sin freno sobre contraseñas de login, y sobre todo sobre los **códigos de verificación de 6 dígitos** (email y reset de contraseña) — con 15 minutos de validez y sin límite de intentos, un script podía probar miles de códigos en ese lapso.

**Fix:** nuevo [RateLimitFilter.java](../PayX-backend/src/main/java/com/payx/backend/security/RateLimitFilter.java), ventana deslizante en memoria por IP, aplicado a todo `/api/auth/**` con límites por endpoint (login/google: 10/min, register: 5/min, resend-code/forgot-password: 3/min, resto: 8/min). Devuelve `429` con un mensaje claro al excederse. **Nota de diseño:** deliberadamente NO confía en el header `X-Forwarded-For` (la app no está detrás de un proxy de confianza) — confiar en ese header sin un proxy que lo sanee le habría permitido a cualquiera falsear su IP en cada request y saltarse el límite por completo. Limitación conocida: es en memoria, por instancia — si el día de mañana se escala a más de un servidor, cada instancia limita por separado (no comparten contador).

**Verificado en vivo:** 14 requests seguidos a `/api/auth/login` con credenciales inválidas → los primeros 10 devolvieron `401` (esperado), los últimos 4 devolvieron `429`.

#### 🟡 Bug/vulnerabilidad menor: emails con mayúsculas creaban cuentas "duplicadas"

Ninguna búsqueda por email normalizaba mayúsculas/minúsculas. Un usuario registrado como `Juan@Gmail.com` no podía loguearse escribiendo `juan@gmail.com`, y —más importante— si se registraba con una casing y después entraba con Google (que normaliza a minúsculas), el sistema no lo reconocía como la misma cuenta y le creaba una segunda cuenta nueva en vez de loguearlo en la existente.

**Fix:** `AuthService` (`registrar`, `login`, `loginConGoogle`) y los 5 métodos de `VerificacionService` que buscan por email ahora normalizan con `.trim().toLowerCase()` antes de cualquier búsqueda o guardado.

#### 🟢 Corrección menor: códigos de estado HTTP inconsistentes en Admin

`AdminController.cambiarRol/darDeBaja/reactivar` devolvían `400 Bad Request` incluso cuando el motivo real era "no sos admin" (debería ser `403`). Se agregó una excepción dedicada `AccesoDenegadoException` (usada también en el fix de Plantillas) para que estos tres endpoints devuelvan `403` correctamente sin tocar el resto de los mensajes de error de negocio.

---

### Feature: obligar a completar DNI y teléfono en cuentas creadas con Google

Las cuentas creadas por Google quedan sin `dni` ni `telefono` (Google no pide esos datos). Antes esto solo generaba el bug del perfil en blanco (ya arreglado); ahora además hay que forzar al usuario a completarlos.

**Backend:**
- `ActualizarPerfilRequest` suma un campo `dni` opcional (valida formato de 7-10 dígitos solo si viene informado).
- `PerfilService.actualizarPerfil`: si `usuario.getDni()` está vacío, exige y valida el `dni` del request (unicidad incluida vía `existsByDni`) y lo guarda; **si ya tenía uno cargado, lo ignora silenciosamente** aunque venga distinto en el request — el DNI queda inmutable una vez cargado, igual que en el registro normal.
- Nuevo [PerfilServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/PerfilServiceTest.java) (4 casos: completar DNI válido, rechazar si falta, rechazar si ya está registrado por otro usuario, ignorar intento de pisar un DNI ya cargado) — verificado en verde.

**Frontend** ([Perfil.jsx](src/pages/Perfil.jsx)):
- Banner de advertencia (ícono de exclamación, `IconAlertTriangle`) arriba de todo en "Mi Perfil" cuando falta el DNI y/o el teléfono, indicando cuál de los dos hay que completar.
- El campo DNI aparece como input editable dentro de "Información del perfil" **solo mientras `perfil.dni` esté vacío**; una vez guardado, desaparece del formulario y pasa a mostrarse como dato fijo en "Datos personales" (igual que para las cuentas registradas normalmente). Mientras falta, esa sección lo muestra como "Pendiente de completar" en naranja.
- El teléfono ya era obligatorio en el formulario existente (`ActualizarPerfilRequest` ya lo exigía) — no hizo falta tocarlo, solo quedó cubierto por el mismo banner de aviso.

**Verificado:** backend compila y los 4 tests nuevos pasan; frontend lintea y buildea sin errores. Falta la prueba manual en navegador (crear una cuenta con Google real, entrar a "Mi Perfil", confirmar que aparece el aviso y que al completar DNI+teléfono desaparece y el DNI queda bloqueado para editar de nuevo).

---

---

### Feature: cambiar foto de perfil (almacenada en Cloudinary)

**Cuenta Cloudinary:** el usuario creó una cuenta gratuita y pasó Cloud Name, API Key y API Secret. A diferencia del Client ID de Google, el API Secret **sí es sensible** — aprendiendo de la auditoría anterior, no se hardcodeó: `application.properties` lo referencia como `${CLOUDINARY_API_SECRET}` **sin valor por defecto**, así que el backend directamente no arranca si no está seteada como variable de entorno (falla rápido en vez de correr con un secreto vacío). Cloud name y api-key sí tienen default inline (no son sensibles, viajan en cada request/URL de todos modos).

**Backend:**
- Nueva dependencia `com.cloudinary:cloudinary-http44:1.39.0`.
- [CloudinaryConfig.java](../PayX-backend/src/main/java/com/payx/backend/config/CloudinaryConfig.java): expone un bean `Cloudinary` armado con esas tres propiedades.
- `Usuario` suma columna `foto_perfil_url` (nullable). **Requiere migración manual** en Supabase (`ddl-auto=validate` no crea columnas): `ALTER TABLE usuarios ADD COLUMN foto_perfil_url TEXT;`.
- `PerfilService.actualizarFoto(usuarioId, archivo)`: valida que el archivo sea JPG/PNG/WEBP, sube a Cloudinary usando **el `usuarioId` como `public_id` fijo con `overwrite=true`** (así cada usuario tiene como máximo una imagen en Cloudinary — no se acumulan versiones viejas en cada cambio) con transformación automática a 400x400 con recorte centrado en la cara (`gravity: face`), guarda la `secure_url` resultante en el usuario.
- Nuevo endpoint `POST /api/perfil/foto` (multipart/form-data), autenticado.
- Límite de subida: `spring.servlet.multipart.max-file-size=5MB`.
- `RateLimitFilter` extendido para cubrir también este endpoint (5 subidas/min por IP) — evita que una cuenta comprometida agote la cuota de storage/transformaciones de Cloudinary.
- `PerfilResponse` y `LoginResponse` ahora incluyen `fotoPerfilUrl`.

**Frontend:**
- [perfilService.js](src/services/perfilService.js): `actualizarFotoPerfil(archivo)` sube el `FormData` al nuevo endpoint.
- [authService.js](src/services/authService.js): se centralizó el guardado de sesión en `guardarSesion()` (ahora incluye `fotoPerfilUrl`); nueva `actualizarUsuarioGuardado(cambios)` que actualiza `localStorage` y dispara un evento custom `usuario-actualizado` para que otros componentes (el Navbar) se refresquen sin recargar la página.
- [Perfil.jsx](src/pages/Perfil.jsx): el avatar grande ahora es clickeable (ícono de lápiz superpuesto) — abre el selector de archivos, valida tipo/tamaño en el cliente antes de subir, muestra "Subiendo..." mientras espera, y al terminar actualiza el perfil y notifica al Navbar.
- [Navbar.jsx](src/components/Navbar.jsx): el `usuario` pasó de leerse una sola vez a ser estado reactivo que escucha el evento `usuario-actualizado`; ambos avatares (desktop y menú mobile) muestran la foto si existe, o la inicial como antes si no.

**Verificado:** backend compila; los tests unitarios existentes (`PlantillaServiceTest`, `PerfilServiceTest`) siguen pasando con la nueva dependencia `Cloudinary` inyectada (mockeada/null, no se ejercita en esos tests); frontend lintea y buildea sin errores. El test de contexto completo (`PayxBackendApplicationTests`) falla hasta correr la migración SQL — es el comportamiento esperado de `ddl-auto=validate`, no un bug.

**Pendiente del usuario:** correr la migración SQL en Supabase y configurar `CLOUDINARY_API_SECRET` como variable de entorno en la Run Configuration de IntelliJ antes de poder levantar el backend. Después, probar el flujo real subiendo una foto desde el navegador.

---

---

### Revisión final: recuperación de contraseña, registro y verificación

Auditoría enfocada en los flujos que todavía no se habían revisado a fondo (forgot-password, registro, verificación de email) más una pasada general por el resto de la app buscando bugs que pudieran romperla.

**Bugs encontrados y arreglados:**
- [Registro.jsx](src/pages/Registro.jsx): el link "¿Olvidaste tu contraseña?" apuntaba a `/login` en vez de `/olvide-password` (nunca llevaba al flujo real de recuperación). Ambos links de esa sección usaban `<a href>` en vez de `<Link>` de React Router, forzando una recarga completa de página. Corregido con `Link to="/olvide-password"` y `Link to="/login"`.
- [Splash.jsx](src/pages/Splash.jsx): siempre redirigía a `/login` tras la animación, sin chequear si ya había una sesión activa — un usuario logueado que entraba a `/` era expulsado a login. Ahora usa `estaLogueado()` para decidir entre `/inicio` y `/login`.
- [adminService.js](src/services/adminService.js): `buscarUsuarios` armaba la URL manualmente (`?termino=${termino}`) sin escapar el texto — buscar con `&`, `%` u otros caracteres especiales rompía el query string. Cambiado a `axios.get(url, { params: { termino } })`, que codifica correctamente.

**Revisado y verificado sin problemas:**
- DTOs de auth/reset (`SolicitarResetRequest`, `ValidarCodigoResetRequest`, `ResetPasswordRequest`, `VerificarCodigoRequest`, `ReenviarCodigoRequest`, `CambiarPasswordRequest`): todos con `@NotBlank`/`@Email`/`@Pattern`/`@Size` correctos — la normalización de email (`.trim().toLowerCase()`) agregada en la auditoría de seguridad anterior no corre riesgo de NPE porque `@Valid` garantiza que el email nunca llega null/vacío al service.
- Flujo `OlvidePassword` → `VerificarCodigoReset` → `NuevaPassword`: si se refresca la página o se entra directo a un paso sin pasar por el anterior, redirige correctamente al inicio del flujo (no rompe, no crashea).
- `EmailService` + `AuthService.registrar`: si falla el envío del email de verificación, `@Transactional` hace rollback de todo (no queda un usuario a medio crear sin poder verificarse).
- `VerificacionService.obtenerVerificacionActiva`: al pedir un nuevo código, el anterior (aunque no haya expirado) deja de aceptarse — comportamiento de seguridad intencional, no un bug.
- Modales financieros (`TransferModal`, `CambioDolaresModal`, `CriptoModal`, `PlazoFijoModal`, todos mock sin backend real todavía): cálculos protegidos contra `NaN` y división por cero.
- `AdminPanel.jsx`, `ListadoPlantillas.jsx`, `EditarPlantilla.jsx`, `BajaPlantilla.jsx`: siguen funcionando correctamente con los cambios de autorización de la auditoría anterior.

**Nota menor, no se arregló:** `CuentaService.construirAliasBase` podría generar un alias raro (ej. `.payx`) si el nombre completo de un usuario no tiene ninguna letra latina reconocible por la regex de limpieza. Caso borde muy improbable en la práctica (nombres en español/inglés), queda anotado por si en algún momento se ve un alias así.

**Verificado:** frontend lintea y buildea sin errores tras los 3 fixes.

---

---

### Feature: transferencias reales (pesos y dólares)

La primera funcionalidad que mueve plata de verdad entre cuentas. Antes de implementar, se confirmó con el usuario quién confirma/cancela una transferencia "pendiente": **el emisor**, no el receptor — es como un borrador que el propio emisor despacha cuando quiere.

**Backend:**
- Nueva entidad [Transferencia.java](../PayX-backend/src/main/java/com/payx/backend/model/Transferencia.java): origen/destino (cuenta + usuario), moneda (`PESOS`/`USD`), monto, concepto, estado (`PENDIENTE`/`COMPLETADA`/`CANCELADA`), fecha y fecha de confirmación.
- [TransferenciaService.java](../PayX-backend/src/main/java/com/payx/backend/service/TransferenciaService.java) — toda la lógica de negocio:
  - Resuelve el destinatario por CVU (22 dígitos), `@nombreUsuario` o alias (agregado `findByCvu`/`findByAlias` a `CuentaRepository`, que antes solo tenía los `existsBy*`).
  - Valida: cuenta origen existe (autorepara si falta, mismo patrón que el perfil), destinatario existe y está activo, no autotransferencia, saldo suficiente en la moneda elegida.
  - **Directa**: mueve la plata en el momento (debita origen, acredita destino, ambos `save` en la misma transacción) y queda `COMPLETADA`.
  - **Pendiente**: no toca ningún saldo — solo guarda el registro en `PENDIENTE`.
  - **Confirmar** (`PATCH /api/transferencias/{id}/confirmar`, solo emisor): revalida el saldo (pudo cambiar desde que se creó) y recién ahí ejecuta el movimiento.
  - **Cancelar** (`PATCH /api/transferencias/{id}/cancelar`, solo emisor): como nunca se movió plata, solo cambia el estado — no hay nada que revertir.
  - **Cambiar concepto** (`PATCH /api/transferencias/{id}/concepto`, solo emisor, en cualquier estado): es una nota descriptiva, no afecta el dinero.
  - Listar (`GET /api/transferencias`) y detalle (`GET /api/transferencias/{id}`) devuelven la transferencia desde la perspectiva del usuario que consulta (`direccion`: `ENVIADA`/`RECIBIDA`, `esEmisor`, datos de la contraparte).
- `PerfilResponse` ahora incluye `saldoPesos`/`saldoUsd` reales — necesario porque el frontend mostraba un saldo inventado que ya no tenía sentido una vez que las transferencias empezaron a mover plata de verdad.
- **10 tests unitarios nuevos** ([TransferenciaServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/TransferenciaServiceTest.java)) cubriendo los invariantes financieros críticos: una pendiente nunca toca saldos hasta confirmarse, nunca se puede transferir de más (ni al crear ni al confirmar), no autotransferencia, y que confirmar/cancelar/editar concepto estén blindados a que solo el emisor pueda hacerlo — todos verificados en verde.
- **Requiere migración manual** en Supabase (tabla `transferencias` nueva, `ddl-auto=validate` no la crea sola) — SQL entregado al usuario, incluyendo constraints `CHECK` opcionales de defensa extra (montos/saldos no negativos).

**Frontend:**
- Nuevo [transferenciaService.js](src/services/transferenciaService.js): crear, listar, obtener, actualizar concepto, confirmar, cancelar.
- [TransferModal.jsx](src/components/TransferModal.jsx) dejó de simular con un `setTimeout`: ahora llama al backend real. Se agregó el selector "Transferir ahora" (irreversible) vs "Dejar pendiente" (con la explicación de que no se descuenta nada hasta confirmarla y se puede cancelar mientras esté pendiente) — agregado `IconClock` a [Icons.jsx](src/components/icons/Icons.jsx) porque no existía.
- Nuevo [TransferenciaDetalleModal.jsx](src/components/TransferenciaDetalleModal.jsx): se abre al tocar cualquier movimiento. Muestra monto, contraparte, fecha, estado; si el usuario es el emisor puede cambiar el concepto (input inline) y, si está pendiente, tiene botones Confirmar/Cancelar.
- Nuevo [ActividadItem.jsx](src/components/ActividadItem.jsx): la fila de cada transferencia, compartida entre Home y la nueva página de movimientos (evita duplicar la lógica de dirección/badges/formato).
- Nueva página [Movimientos.jsx](src/pages/Movimientos.jsx) en `/movimientos`: lista **todas** las transferencias del usuario (enviadas y recibidas), no solo las últimas — el botón "Consultar todas" de Home ahora lleva ahí en vez de mostrar el toast de "próximamente".
- [Home.jsx](src/pages/Home.jsx): los tabs de Pesos/Dólares ahora muestran el saldo real (`obtenerPerfil()`), no el hardcodeado de antes — se quitó el "Rindió $X en los últimos 12 meses" para esas dos monedas porque no hay ningún concepto de rendimiento real detrás (Cripto sigue siendo 100% mock, sin cambios). "Últimas actividades" muestra las transferencias reales más recientes, cada una clickeable para abrir el detalle. Después de una transferencia exitosa o de confirmar/cancelar una pendiente, se refresca automáticamente el saldo y la lista.
- Nota de lint: `eslint-plugin-react-hooks` v7 (recién instalado, trae reglas experimentales del React Compiler) marcaba como error llamar una función async con `setState` adentro directamente en el `useEffect` de montaje de Home — se resolvió usando el mismo patrón de `promise.then(setState)` que ya pasaba limpio en `Navbar.jsx`, sin tocar las funciones reusadas en otros callbacks (que sí podían seguir llamándose directo).

**Pendiente del usuario:** correr la migración SQL de la tabla `transferencias`, y cargar saldo de prueba a mano en al menos dos cuentas (las cuentas nuevas arrancan en $0 — no existe todavía una feature de "depósito", no fue pedida).

---

### Corrección: se reutiliza la tabla `transacciones` ya existente en vez de crear `transferencias`

El usuario avisó que ya existía una tabla `transacciones` en la base (columnas: `id, cuenta_origen_id, cuenta_destino_id, monto, moneda, tipo_transaccion, estado, descripcion, fecha_creacion`) — pensada exactamente para esto. Se adaptó todo el backend de transferencias para usar esa tabla en vez de crear una nueva `transferencias` (evita tener dos tablas de movimientos de plata en paralelo):

- [Transferencia.java](../PayX-backend/src/main/java/com/payx/backend/model/Transferencia.java) (la clase Java conserva el nombre, solo cambia el mapeo): `@Table(name = "transacciones")`; `concepto` → columna `descripcion`; `fecha` → columna `fecha_creacion`; se agregó el campo `tipo` mapeado a `tipo_transaccion` (antes el tipo DIRECTA/PENDIENTE no se persistía en ningún lado). Se eliminaron los campos `usuarioOrigenId`/`usuarioDestinoId`: esa tabla no los tiene, y son redundantes — se derivan siempre desde `cuenta_origen_id`/`cuenta_destino_id` haciendo join contra `cuentas.usuario_id`.
- [TransferenciaRepository.java](../PayX-backend/src/main/java/com/payx/backend/repository/TransferenciaRepository.java): `buscarPorUsuario` ahora resuelve el usuario con una subquery contra `Cuenta` en vez de comparar un campo directo.
- [TransferenciaService.java](../PayX-backend/src/main/java/com/payx/backend/service/TransferenciaService.java): todos los chequeos de "¿quién es el dueño/emisor de esta transferencia?" (`obtenerYValidarPropiedad`, `perteneceAlUsuario`, `mapearConContraparte`) ahora cargan la `Cuenta` correspondiente y comparan `cuenta.getUsuarioId()`, en vez de leer un campo ya resuelto en la entidad.
- [TransferenciaServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/TransferenciaServiceTest.java): reescritos los tests que armaban una `Transferencia` a mano para que en vez de `setUsuarioOrigenId`/`setUsuarioDestinoId` seteen `cuentaOrigenId`/`cuentaDestinoId` y mockeen `cuentaRepository.findById(...)`. Los 10 tests siguen pasando (`gradlew test --tests TransferenciaServiceTest` → 10/10, 0 failures).

**Migración pendiente actualizada (mucho más chica que la original, la tabla base ya existe):**
```sql
ALTER TABLE transacciones ADD COLUMN fecha_confirmacion TIMESTAMPTZ;

-- Recomendado (defensa extra, no obligatorio):
ALTER TABLE transacciones ADD CONSTRAINT monto_positivo CHECK (monto > 0);
ALTER TABLE cuentas ADD CONSTRAINT saldo_pesos_no_negativo CHECK (saldo_pesos >= 0);
ALTER TABLE cuentas ADD CONSTRAINT saldo_usd_no_negativo CHECK (saldo_usd >= 0);
```
Sigue haciendo falta cargar saldo de prueba a mano en al menos dos cuentas para probar transferencias entre sí.

---

#### Cosas que se revisaron y están bien (sin cambios)
- Inyección SQL: no hay riesgo — todas las queries usan JPA/Hibernate parametrizado (incluida la búsqueda de plantillas con `LIKE`).
- XSS: no hay ningún `dangerouslySetInnerHTML` ni `innerHTML` en todo el frontend; React escapa todo por defecto.
- Falsificación de JWT: no es posible sin conocer `jwt.secret` (ver hallazgo crítico arriba) — la librería exige que la firma HMAC coincida.
- IDOR: `PerfilController`/`NotificacionController` identifican al usuario siempre por el JWT (`@AuthenticationPrincipal`/`Authentication.getName()`), nunca por un ID que venga del cliente — no hay forma de pedir el perfil o las notificaciones de otro usuario. `AdminController` sí recibe un `id` de usuario objetivo por path, pero está correctamente gateado por `validarAdmin`.

---

### Paso de confirmación antes de transferir + fix de botón "Listo"

- Nuevo endpoint `GET /api/transferencias/destinatario?valor=...` ([TransferenciaController.java](../PayX-backend/src/main/java/com/payx/backend/controller/TransferenciaController.java), [TransferenciaService.java](../PayX-backend/src/main/java/com/payx/backend/service/TransferenciaService.java)): resuelve CVU/alias/@usuario a nombre completo + alias + CVU sin crear nada. Se extrajo la validación de destino (existe, no es uno mismo, está activo) a un método privado compartido (`resolverYValidarDestino`) entre crear la transferencia y esta nueva consulta.
- [TransferModal.jsx](src/components/TransferModal.jsx): al tocar "Continuar" ya no se transfiere directo — primero se resuelve el destinatario contra el backend y se muestra una pantalla de confirmación (`paso === 'confirmar'`) con nombre completo, alias, CVU, monto, motivo y tipo de envío. Desde ahí "Editar" vuelve al formulario sin perder los datos, y "Confirmar transferencia" recién ahí ejecuta `crearTransferencia`.
- Fix: el botón "Listo" de la pantalla de éxito quedaba pegado a la izquierda en vez de centrado (dependía de `text-align: center` sobre un botón que en algunos casos no se comporta como inline-block) — se cambió a `display: block; margin: 0 auto` en [TransferModal.css](src/components/TransferModal.css), que centra sin importar el `display` real del botón.

---

### Fix: transferencia cancelada se mostraba como "recibida" con monto en verde

Al cancelar una transferencia pendiente, la contraparte (quien la iba a recibir) veía el modal de detalle diciendo "Transferencia recibida" con el monto en verde y signo `+`, como si la plata efectivamente se hubiera acreditado, y solo debajo aparecía un badge separado diciendo "Cancelada" — confuso, parecía contradictorio.

- [TransferenciaDetalleModal.jsx](src/components/TransferenciaDetalleModal.jsx) y [ActividadItem.jsx](src/components/ActividadItem.jsx): cuando `estado === 'CANCELADA'`, el título pasa a decir directamente "Transferencia cancelada" (en rojo, sin el badge separado que quedaba redundante), y el monto se muestra sin signo `+`/`-`, en gris y tachado, en vez de verde/negro como si fuera un movimiento real.
- Estilos nuevos en [TransferenciaDetalleModal.css](src/components/TransferenciaDetalleModal.css) y [Home.css](src/pages/Home.css): `.detalle-titulo.cancelada`, `.detalle-monto.cancelada`, `.home-actividad-titulo.cancelada`, `.home-actividad-monto.cancelada`, `.home-actividad-icono.cancelada` (ícono X en rojo en vez del ícono de flecha verde/gris). Se eliminó el badge `.cancelada` que quedó sin uso en ambos componentes.

---

### Feature: autocompletado de contactos + notificaciones de transferencias

**Autocompletado de destinatarios ya usados:**
- [Home.jsx](src/pages/Home.jsx): se calcula `contactosFrecuentes` a partir del historial de transferencias ya cargado (`transferencias.filter(direccion === 'ENVIADA')`, deduplicado por alias, más reciente primero ya que el listado viene ordenado por fecha desde el backend) — no hizo falta ningún endpoint nuevo.
- [TransferModal.jsx](src/components/TransferModal.jsx) recibe ese array como prop `contactos` y muestra un dropdown debajo del campo "¿A quién le transferís?": con el campo vacío y en foco sugiere los últimos contactos usados, y a medida que se escribe filtra por alias que empiecen con el texto ingresado (`startsWith`, no contiene). Estilos nuevos en [TransferModal.css](src/components/TransferModal.css) (`.transfer-sugerencias`, `.transfer-sugerencia-item`).

**Notificaciones de transferencia enviada/recibida:**
- Se descubrió que el formulario de alta de plantillas ([AltaPlantilla.jsx](src/pages/AltaPlantilla.jsx)) ya le sugiere al admin usar variables `{{usuario}}`, `{{monto}}`, `{{fecha}}`, `{{cuenta}}` en el mensaje base, pero el backend nunca las reemplazaba — la única notificación que existía (`INICIO_SES`, login) solo concatenaba texto plano. Se implementó el reemplazo real de esas variables en [NotificacionService.java](../PayX-backend/src/main/java/com/payx/backend/service/NotificacionService.java) (`notificarTransferencia` + `reemplazarVariables`), quedando disponible para cualquier plantilla futura, no solo para transferencias.
- [TransferenciaService.java](../PayX-backend/src/main/java/com/payx/backend/service/TransferenciaService.java): nuevo método privado `notificarMovimiento(cuentaOrigen, cuentaDestino, moneda, monto)`, llamado justo después de que la plata realmente se mueve — en `crearTransferencia` para las directas, y en `confirmarTransferencia` cuando se confirma una pendiente (nunca al crear una pendiente, porque ahí todavía no pasó nada). Dispara dos notificaciones por movimiento: `TRANSFERENCIA_ENVIADA` al emisor (con `{{usuario}}`/`{{cuenta}}` de la contraparte destino) y `TRANSFERENCIA_RECIBIDA` al receptor (con los datos del origen).
- [Navbar.jsx](src/components/Navbar.jsx): se agregaron `TRANSFERENCIA_ENVIADA`/`TRANSFERENCIA_RECIBIDA` al mapa `TITULOS_PLANTILLA` para que se vea un título corto en vez de "Notificación" genérico.
- [TransferenciaServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/TransferenciaServiceTest.java): se agregó el mock de `NotificacionService` (los 10 tests existentes siguen pasando; no verifican las notificaciones en sí, solo que no rompan el flujo).

**Pendiente del usuario:** como las plantillas de notificación son un recurso de administración (CRUD manejado íntegramente desde la app, no por SQL), hay que crear estas dos filas desde el Panel de Administración → Plantillas → Nueva plantilla:

| Campo | TRANSFERENCIA_ENVIADA | TRANSFERENCIA_RECIBIDA |
|---|---|---|
| Código | `TRANSFERENCIA_ENVIADA` | `TRANSFERENCIA_RECIBIDA` |
| Nombre | Transferencia enviada | Transferencia recibida |
| Mensaje base | `Le transferiste {{monto}} a {{usuario}} ({{cuenta}})` | `Recibiste {{monto}} de {{usuario}} ({{cuenta}})` |
| Requiere origen | No | No |
| Requiere destino | No | No |

(Los checkboxes "Requiere origen/destino" son metadata informativa para el admin sobre qué datos usa la plantilla — el reemplazo de `{{usuario}}`/`{{cuenta}}` funciona independientemente de esos checkboxes.) Si no se crean, o quedan desactivadas, las transferencias van a seguir funcionando igual: simplemente no se genera la notificación.

---

### Fix: la campanita no se actualizaba sola después de transferir

El `Navbar` solo pedía las notificaciones una vez, al montarse (`useEffect` vacío) — como transferir no cambia de página, nunca se volvían a pedir y había que refrescar el navegador para verlas.

- [Navbar.jsx](src/components/Navbar.jsx): se agregó un listener del evento `notificaciones-actualizadas` (mismo patrón ya usado para refrescar el avatar con `usuario-actualizado`) que vuelve a pedir las notificaciones sin recargar la página.
- [Home.jsx](src/pages/Home.jsx) y [Movimientos.jsx](src/pages/Movimientos.jsx): disparan ese evento después de crear una transferencia directa y después de confirmar una pendiente (los dos momentos en que el backend puede haber generado una notificación nueva).

---

### Feature: actualización automática cuando la otra parte confirma/cancela (polling)

El fix anterior solo cubría acciones propias (dentro de la misma pestaña, vía evento del navegador). Faltaba el caso de que **otro usuario** confirme o cancele una transferencia pendiente que tenés con él: tu navegador no tiene forma de enterarse solo de algo que pasó en otra sesión sin preguntarle al backend de tanto en tanto. Se evaluaron dos enfoques (polling vs. WebSockets) y, dado el tamaño del proyecto y que ya usa este mismo criterio para el rate limiter (todo en memoria, una sola instancia, sin infraestructura de tiempo real), se eligió **polling cada 15 segundos** en vez de agregar una dependencia y una superficie de seguridad nuevas (autenticación JWT sobre WebSocket) para este alcance.

- [Navbar.jsx](src/components/Navbar.jsx): además del fetch al montar y el evento `notificaciones-actualizadas`, ahora re-pide las notificaciones cada 15s con `setInterval` (se limpia al desmontar).
- [Home.jsx](src/pages/Home.jsx): nuevo `useEffect` que llama a `cargarPerfil`/`cargarTransferencias` cada 15s. `cargarTransferencias` ahora también sincroniza `detalleActivo` con los datos frescos (si tenías el detalle de una transferencia abierto y la otra parte la confirmó/canceló mientras la mirabas, se actualiza sola).
- [Movimientos.jsx](src/pages/Movimientos.jsx): mismo polling cada 15s, pero con una función separada (`refrescarSilencioso`) que no toca el estado `cargando` — evita que la lista completa se reemplace por el cartel de "Cargando movimientos..." en cada refresco de fondo.

**Limitación conocida:** con polling, la demora máxima para ver el cambio es de hasta 15 segundos (no instantáneo). Si en el futuro se necesita tiempo real de verdad, la alternativa es WebSockets (evaluada y descartada por ahora por complejidad/alcance).

---

### Fix de performance: "Últimas actividades" y el historial tardaban mucho

La causa real no eran los índices (la tabla `transacciones` tiene pocas filas todavía) sino un problema clásico de **N+1 consultas**: `listarMisTransferencias` traía la lista de transferencias con 1 consulta, pero después, **por cada transferencia**, volvía a pegarle a la base 2-3 veces más (`mapearConContraparte` buscaba la cuenta origen, la cuenta destino, y el usuario de la contraparte, todo por separado). Con 20-30 movimientos eso son 60-90 consultas secuenciales contra una base remota (Supabase) — cada una con su latencia de red — en vez de una sola vez.

- [TransferenciaService.java](../PayX-backend/src/main/java/com/payx/backend/service/TransferenciaService.java): `listarMisTransferencias` ahora junta todos los IDs de cuenta involucrados en la lista completa y los trae de una sola vez con `cuentaRepository.findAllById(...)`, arma un mapa `Map<UUID, Cuenta>`, hace lo mismo para los usuarios (`Map<UUID, String>` con los nombres), y arma las respuestas en memoria a partir de esos mapas. Quedan **3 consultas en total sin importar cuántas transferencias haya**, en vez de `1 + 3N`. Se agregó una segunda versión de `mapearConContraparte` que recibe esos mapas ya cargados (la versión original, con consultas individuales, se mantuvo para las operaciones sobre una sola transferencia — confirmar/cancelar/editar/obtener — donde no hay ningún N+1 que evitar).
- [TransferenciaRepository.java](../PayX-backend/src/main/java/com/payx/backend/repository/TransferenciaRepository.java): de paso, `buscarPorUsuario` (que hacía una subquery correlacionada contra `cuentas` dos veces) se simplificó a `buscarPorCuenta`, que compara directo contra `cuenta_origen_id`/`cuenta_destino_id` — cada usuario tiene una sola cuenta, así que no hacía falta la subquery, y una comparación directa aprovecha mucho mejor un índice.
- [TransferenciaServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/TransferenciaServiceTest.java): nuevo test que verifica que, con dos transferencias en la lista, `cuentaRepository.findAllById`/`usuarioRepository.findAllById` se llaman **una sola vez** cada uno (no una vez por transferencia), además de que los datos de la contraparte se resuelven bien tanto para la enviada como para la recibida.

**Pendiente del usuario (índices, como se pidió):** aunque la mejora principal ya está en el código, corré esto en Supabase — son gratis en escritura a este volumen y dejan la búsqueda preparada para cuando haya muchas más filas:
```sql
CREATE INDEX IF NOT EXISTS idx_transacciones_cuenta_origen ON transacciones (cuenta_origen_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_cuenta_destino ON transacciones (cuenta_destino_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_usuario_id ON cuentas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_id ON notificaciones_usuario (usuario_id);
```

---

### Auditoría a fondo de transferencias: bugs de concurrencia y seguridad

Se revisó toda la función de transferencias buscando activamente formas de romperla (condiciones de carrera, doble gasto, enumeración de usuarios, validaciones faltantes). El hallazgo más serio: **no había ningún bloqueo al leer/escribir saldos**, lo que permitía duplicar plata con dos transferencias simultáneas desde la misma cuenta.

**1. CRÍTICO — Doble gasto por condición de carrera (race condition):**
Sin ningún lock, dos transferencias DIRECTAS simultáneas desde la misma cuenta podían las dos leer el mismo saldo (ej: $100), las dos validar que $80 alcanzaba, y las dos descontar "en paralelo" — el resultado final era saldo $20 (no -$60), pero **los dos destinatarios recibían $80 igual**: se creaban $80 de la nada. Esto era explotable con un simple doble-click rápido, sin necesitar herramientas especiales.

- [CuentaRepository.java](../PayX-backend/src/main/java/com/payx/backend/repository/CuentaRepository.java): nuevo `findByIdConLock` con `@Lock(PESSIMISTIC_WRITE)` (`SELECT ... FOR UPDATE`).
- [TransferenciaService.java](../PayX-backend/src/main/java/com/payx/backend/service/TransferenciaService.java): nuevo helper `bloquearCuentas` que bloquea ambas cuentas (origen y destino) **siempre en el mismo orden** (comparando UUIDs), sin importar cuál es cuál. Esto es necesario para evitar un deadlock: si dos transferencias simultáneas mueven plata entre las mismas dos cuentas en sentidos opuestos y cada una bloqueara "origen primero, destino después", podrían esperarse mutuamente para siempre. Se usa en `crearTransferencia` (directa) y `confirmarTransferencia`, revalidando el saldo *después* de bloquear (el chequeo de saldo original se mantiene además, como feedback rápido antes de llegar a bloquear nada).

**2. Mismo problema, sobre la fila de la transferencia:** dos clicks simultáneos en "Confirmar" y "Cancelar" (o el mismo botón dos veces) podían las dos pasar el chequeo de `estado === PENDIENTE` antes de que la otra terminara, resultando en plata movida pero la transferencia marcada CANCELADA (o plata movida dos veces). Se agregó `TransferenciaRepository.findByIdConLock` (mismo mecanismo) y ahora `obtenerYValidarPropiedad` bloquea la fila: la segunda solicitud espera a que la primera termine y al releer el estado ya actualizado se rechaza sola.

**3. Enumeración de usuarios sin límite de tasa:** el endpoint `GET /api/transferencias/destinatario` (agregado la sesión pasada) no tenía ningún rate limit — cualquier usuario logueado podía probar miles de alias/CVU/@usuario por minuto y armarse una lista de nombres completos de otros usuarios. Se corrigió [RateLimitFilter.java](../PayX-backend/src/main/java/com/payx/backend/security/RateLimitFilter.java): la clave del límite ahora incluye el método HTTP (antes solo usaba el path, y `/api/transferencias` es a la vez el listado por GET —pooleado cada 15s— y la creación por POST, así que no se podía limitar uno sin frenar el otro). Se agregaron límites de 20/min para `GET /api/transferencias/destinatario` y `POST /api/transferencias` (esto último también frena el spam de transferencias pendientes hacia otro usuario).

**4. Búsqueda de alias/@usuario sensible a mayúsculas:** los alias se generan siempre en minúscula, pero si alguien tipeaba `Laura.Bonino.PAYX` (con mayúsculas) la búsqueda fallaba con "no encontramos ninguna cuenta" aunque el alias fuera el correcto. Se agregaron `findByAliasIgnoreCase` y `findByNombreUsuarioIgnoreCase`, usados en `resolverCuentaDestino`.

**5. El destinatario podía ser dado de baja mientras una transferencia quedaba pendiente:** si el usuario que iba a recibir una transferencia PENDIENTE era desactivado (baneado) antes de que el emisor la confirmara, `confirmarTransferencia` igual le movía la plata. Ahora revalida `usuario.getActivo()` del destinatario al confirmar, no solo al crear.

**6. Una notificación fallida podía revertir una transferencia válida:** `notificarMovimiento` corre dentro de la misma transacción que ya movió la plata; si `notificacionService` fallara por lo que sea (un bug futuro, una plantilla mal configurada), `@Transactional` iba a hacer rollback de **toda la transferencia**, plata ya movida incluida, por un problema en un efecto secundario no crítico. Ahora está envuelta en try/catch con logging (`@Slf4j`), primer uso de logging estructurado en el backend.

**7. Validaciones de entrada faltantes:** `monto` no tenía límite de dígitos/decimales (`@Digits(integer=13, fraction=2)`, coincide exactamente con la columna `NUMERIC(15,2)`) y `destinatario` no tenía límite de longitud (`@Size(max=60)`) — ninguno de los dos rompía nada gracias a los chequeos de saldo existentes, pero mandaban errores feos (excepciones de Postgres) en vez de un 400 prolijo.

**Verificación:** se reescribieron los mocks de los tests existentes para reflejar los nuevos locks, se agregó un test nuevo (`noSePuedeConfirmarSiElDestinatarioFueDadoDeBaja`) — **12/12 tests pasan**, `PayxBackendApplicationTests` (carga completa del contexto de Spring, valida que las queries JPQL de los locks compilen contra el esquema real) también pasa.

No se pudo escribir un test que reproduzca la condición de carrera en sí (los mocks de Mockito no simulan bloqueos reales de base de datos; haría falta un test de integración contra una base real, que este proyecto no tiene configurado) — la corrección se verificó por lectura de código y por el comportamiento correcto ya cubierto en los tests existentes (revalidación de saldo, chequeo de propiedad, etc.).

---

### Feature: plazos fijos reales (constitución, vencimiento automático y listado)

El modal de plazos fijos ya existía en el frontend pero era 100% mock: no había backend, las tasas estaban hardcodeadas en el componente y "constituir" un plazo fijo no tocaba ningún saldo. Ahora es una función real: descuenta el capital al constituirlo y lo devuelve solo, con el interés correspondiente, el día del vencimiento.

**Tabla `plazo_fijo`** — ya existía en la base (el usuario la tenía creada de antes, sin usar). Se mapeó la entidad tal cual está en vez de crear una tabla nueva o pedir un `ALTER TABLE`: `fecha_fin` cubre el vencimiento y `monto_total_recibido` lo que se acredita; el plazo en días y el interés estimado **no se guardan aparte**, se derivan de `fecha_fin - fecha_inicio` y `monto_total_recibido - monto_invertido` respectivamente. Tampoco hay columna de fecha de acreditación real: al no ser un timestamp sino una fecha (`date`, sin hora) el concepto no aplica con esa precisión, así que se usa `fecha_fin` como "día de acreditación" una vez que el estado pasa a VENCIDO. La tabla identifica el plazo fijo por `usuario_id` directamente (no por `cuenta_id` como hace `transacciones`), lo cual funciona porque cada usuario tiene una única cuenta.

**Backend:**
- [PlazoFijo.java](../PayX-backend/src/main/java/com/payx/backend/model/PlazoFijo.java): entidad mapeada a `plazo_fijo`. Guarda `tasa_interes` (TNA) "congelada" al momento de constituirse — si la tasa de referencia cambia después, no debe afectar plazos fijos ya en curso. `fecha_inicio`/`fecha_fin` son `LocalDate` (la tabla las tiene como `date`, no `timestamptz`).
- [PlazoFijoRepository.java](../PayX-backend/src/main/java/com/payx/backend/repository/PlazoFijoRepository.java): `countByUsuarioIdAndEstado` (para el límite de 5 activos), `findByEstadoAndFechaVencimientoLessThanEqual` (para el scheduler, comparando contra `LocalDate.now()`) y `findByIdConLock` con lock pesimista.
- [PlazoFijoService.java](../PayX-backend/src/main/java/com/payx/backend/service/PlazoFijoService.java):
  - Las tasas por plazo (30/60/90/180/365 días) viven **en el backend**, no en el cliente: si el frontend pudiera mandar su propia TNA, cualquiera podría inventarse una tasa alta y cobrar de más al vencimiento. El frontend las pide por `GET /api/plazos-fijos/tasas`.
  - `crearPlazoFijo` bloquea la cuenta (mismo `findByIdConLock` que ya usa `TransferenciaService`) **antes** de contar los plazos fijos activos y de validar el saldo: sin ese lock, dos pedidos simultáneos podían leer el mismo saldo o el mismo conteo de "4 activos" y los dos pasar la validación — doble gasto, o terminar con 6 plazos fijos activos en vez del máximo de 5.
  - El interés se calcula como `capital × (TNA/100) × (días/365)`, redondeado a 2 decimales — la misma fórmula que ya mostraba el mock, ahora es la que realmente determina cuánta plata se acredita.
  - `procesarVencimiento(id)` acredita un plazo fijo vencido (capital + interés, buscando la cuenta por `usuario_id`) y lo marca `VENCIDO`. Es **idempotente**: si se llama dos veces sobre el mismo plazo fijo ya procesado, no vuelve a acreditar nada (relee el estado bajo lock antes de tocar algo).
- [PlazoFijoScheduler.java](../PayX-backend/src/main/java/com/payx/backend/service/PlazoFijoScheduler.java): corre cada 60s (`plazofijo.scheduler.fixed-delay-ms`, configurable) y procesa los vencidos uno por uno, cada uno en su propia transacción. Vive en un `@Component` **separado** de `PlazoFijoService` a propósito: si el scheduler llamara a un método `@Transactional` del mismo bean con `this.metodo(...)`, la anotación no tendría ningún efecto (auto-invocación no pasa por el proxy de Spring que abre la transacción) — es un error clásico de Spring, fácil de cometer sin darse cuenta.
- [PlazoFijoController.java](../PayX-backend/src/main/java/com/payx/backend/controller/PlazoFijoController.java): `GET /tasas`, `POST /` (constituir), `GET /` (listar los propios).
- [NotificacionService.java](../PayX-backend/src/main/java/com/payx/backend/service/NotificacionService.java): se generalizó `reemplazarVariables` para aceptar cualquier `Map<String,String>` de variables (antes solo sabía de `usuario`/`cuenta`/`monto` para transferencias). Se agregó `notificarPlazoFijo`, que además soporta `{{dias}}`. Hacen falta 2 plantillas nuevas en el panel de admin: `PLAZO_FIJO_CONSTITUIDO` y `PLAZO_FIJO_VENCIDO` (mismo procedimiento que se usó para las de transferencias).
- [PayxBackendApplication.java](../PayX-backend/src/main/java/com/payx/backend/PayxBackendApplication.java): se agregó `@EnableScheduling` (primer uso de tareas programadas en el backend).
- [RateLimitFilter.java](../PayX-backend/src/main/java/com/payx/backend/security/RateLimitFilter.java): límite de 15/min para `POST /api/plazos-fijos` (constituir plazos fijos mueve saldo real).

**Frontend:**
- [plazoFijoService.js](src/services/plazoFijoService.js): `obtenerTasasPlazoFijo`, `crearPlazoFijo`, `listarPlazosFijos`.
- [PlazoFijoModal.jsx](src/components/PlazoFijoModal.jsx): dejó de simular todo. Pide las tasas y el monto mínimo al backend al abrirse, y al confirmar crea el plazo fijo real (con manejo de los errores del backend: monto mínimo, saldo insuficiente, máximo de 5 activos, plazo inválido). La pantalla de éxito muestra los valores que realmente devolvió el backend, no un cálculo hecho en el cliente.
- [PlazoFijoListaModal.jsx](src/components/PlazoFijoListaModal.jsx) (nuevo): modal pedido explícitamente — lista los plazos fijos del usuario (activos y vencidos) con fecha de constitución, monto invertido, tasa, plazo en días, cuánto genera de interés, el total a cobrar y la fecha de acreditación (automática, no hay ninguna acción manual para "cobrar antes"). Se abre desde un link dentro del modal de constituir, y también como acción propia ("Mis plazos fijos") en la sección de Inversiones de Home.
- [Home.jsx](src/pages/Home.jsx): nueva acción "Mis plazos fijos"; el polling de perfil que ya existía cada 15s alcanza para reflejar solo el saldo cuando el scheduler acredita un vencimiento (no hizo falta agregar nada más ahí).
- [Navbar.jsx](src/components/Navbar.jsx): títulos para las notificaciones `PLAZO_FIJO_CONSTITUIDO`/`PLAZO_FIJO_VENCIDO`.

**Frontend, corrección de zona horaria:** el backend manda `fechaInicio`/`fechaVencimiento` como fechas puras `"yyyy-MM-dd"` (sin hora). Parsearlas con `new Date(str)` las interpreta como medianoche UTC; en un huso horario negativo como el de Argentina (UTC-3), `toLocaleDateString` podía mostrar **un día antes** del real (ej: vencimiento real 15/10, se mostraba 14/10). Se corrigió armando la fecha en horario local a mano (`new Date(anio, mes-1, dia)`) en vez de dejar que el motor la interprete como UTC, tanto en `PlazoFijoModal.jsx` como en `PlazoFijoListaModal.jsx`.

**Tests:** [PlazoFijoServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/PlazoFijoServiceTest.java), 10 casos — cálculo de interés, monto mínimo, plazo inválido, saldo insuficiente, máximo de 5 activos, acreditación correcta al vencer, idempotencia (no se acredita dos veces), una notificación fallida no revierte la acreditación, cuenta inexistente al vencer no rompe el scheduler, listado ordenado. **40/40 tests pasan** en total, incluyendo `PayxBackendApplicationTests.contextLoads` (carga completa de Spring, valida el mapeo de la entidad contra la tabla real de Supabase) — al no haber hecho falta ningún `ALTER TABLE`, no quedó ningún test rojo pendiente de una migración manual.

---

### Plazo fijo: notificación instantánea y aparición en el feed de actividad

Dos pedidos después de probar la función: la notificación de "plazo fijo constituido" tardaba en aparecer, y el alta de un plazo fijo no se veía ni en "Últimas actividades" (Home) ni en "Mis movimientos".

**Causa de la demora:** al confirmar una transferencia, `cargarDatosTrasTransferencia` dispara `window.dispatchEvent(new Event('notificaciones-actualizadas'))` para que el Navbar refresque las notificaciones al instante. El `onExito` de `PlazoFijoModal` en cambio solo llamaba a `cargarPerfil` (el saldo) y nunca disparaba ese evento — la notificación de alta recién aparecía en el siguiente ciclo de polling del Navbar. Se agregó `cargarDatosTrasPlazoFijo` en [Home.jsx](src/pages/Home.jsx), igual que la de transferencias, que además dispara el evento. De paso se bajó el polling de notificaciones (Navbar), de saldo/transferencias (Home) y de movimientos (Movimientos) de 15s a 5s — ninguno de esos endpoints tiene rate limit, así que es seguro y hace que todo se sienta más instantáneo sin necesitar websockets.

**Feed de actividad unificado:** [utils/actividad.js](src/utils/actividad.js) (nuevo) combina transferencias y eventos de plazo fijo en una sola lista ordenada por fecha. Cada plazo fijo genera un evento "ALTA" (fecha de constitución, monto invertido, en rojo) y, si ya venció, un segundo evento "VENCIMIENTO" (fecha de vencimiento, capital + interés acreditado, en verde) — así el historial refleja las dos puntas del movimiento de plata, no solo la constitución. [ActividadItem.jsx](src/components/ActividadItem.jsx) ahora acepta una prop `plazoFijoEvento` además de `transferencia` y renderiza el ícono/título/monto según el tipo. Se usa en [Home.jsx](src/pages/Home.jsx) (últimas 4 actividades) y en [Movimientos.jsx](src/pages/Movimientos.jsx) (listado completo, que ahora también trae los plazos fijos con `listarPlazosFijos`); en ambos, clickear un evento de plazo fijo navega a `/plazos-fijos`.

---

### "Mis plazos fijos" pasó de modal chico a página completa

El modal (`PlazoFijoListaModal`) quedaba chico e inconsistente al lado de "Todos tus movimientos", que sí es una página. Se reemplazó por una ruta nueva.

- [PlazosFijos.jsx](src/pages/PlazosFijos.jsx) (nueva página, ruta `/plazos-fijos` en [App.jsx](src/App.jsx)): mismo esqueleto que `Movimientos.jsx` (Navbar, botón volver, header, polling cada 5s), con un botón "Constituir nuevo" que abre `PlazoFijoModal` directamente ahí (deshabilitado si ya hay 5 activos) y la lista completa de plazos fijos reutilizando las tarjetas que ya existían en el modal viejo.
- Se borró `PlazoFijoListaModal.jsx` y se limpiaron de [PlazoFijoModal.css](src/components/PlazoFijoModal.css) las clases que eran solo del overlay/modal (`.plazo-fijo-lista-overlay/-modal/-header/-cerrar/-vacio`); las clases de las tarjetas de cada plazo fijo (`.plazo-fijo-item*`) se mantuvieron porque las reutiliza la página nueva.
- El link "Ver mis plazos fijos" dentro de `PlazoFijoModal` y el click en un evento de plazo fijo en el feed de actividad (Home/Movimientos) ahora navegan a `/plazos-fijos` en vez de abrir un modal.

No pude verificar esto visualmente en un navegador (no tengo credenciales de un usuario de prueba cargadas en esta conversación) — sí verifiqué que compila sin errores; conviene que lo mires vos antes de darlo por cerrado.

---

### Fix: dos plazos fijos el mismo día no se ordenaban por el último creado

Al constituir dos plazos fijos el mismo día, el feed de actividad los mostraba en un orden que no era el de creación (el de 30 días apareció antes que el de 90 días, aunque el de 90 se creó después). Causa: `fecha_inicio` en la tabla `plazo_fijo` es un `date` **sin hora**, así que dos altas el mismo día quedan con el mismo valor — no hay forma de saber cuál fue la última. Las transferencias no tienen este problema porque `fecha_creacion` en `transacciones` sí es un timestamp completo.

Se agregó una columna nueva (no destructiva, con default, no toca las existentes):

```sql
ALTER TABLE plazo_fijo ADD COLUMN fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now();
```

- [PlazoFijo.java](../PayX-backend/src/main/java/com/payx/backend/model/PlazoFijo.java): nuevo campo `fechaCreacion` (`OffsetDateTime`), solo para ordenar — no participa del cálculo de interés ni del vencimiento (eso sigue siendo `fecha_inicio`/`fecha_fin`, fechas puras).
- [PlazoFijoRepository.java](../PayX-backend/src/main/java/com/payx/backend/repository/PlazoFijoRepository.java): `findByUsuarioIdOrderByFechaCreacionDesc` reemplaza al que ordenaba por `fechaInicio`.
- [PlazoFijoService.java](../PayX-backend/src/main/java/com/payx/backend/service/PlazoFijoService.java): setea `fechaCreacion` al constituir el plazo fijo; se agregó al `PlazoFijoResponse`.
- [utils/actividad.js](src/utils/actividad.js): el evento "ALTA" ahora ordena por `fechaCreacion` en vez de `fechaInicio`.
- [ActividadItem.jsx](src/components/ActividadItem.jsx): el evento de alta ahora muestra fecha **y hora** (como las transferencias); el de vencimiento sigue mostrando solo fecha, porque `fecha_fin` no tiene hora y no se sabe el instante exacto en que el scheduler lo acreditó.

10/10 tests de `PlazoFijoServiceTest` siguen pasando.

---

### Auditoría del módulo de plazos fijos: formularios, montos, límites y huso horario

Pedido explícito de romper el módulo a propósito (formularios, montos, porcentajes, fechas, el caso "a las 12 de la noche", más de 5 activos) y arreglar lo que fallara.

**1. BUG REAL — la fecha del plazo fijo dependía del huso horario del servidor, no del de Argentina:** `LocalDate.now()` usa la zona horaria por defecto de la JVM. Si el backend corriera en un servidor configurado en UTC (algo común en hosting en la nube), entre las 21:00 y las 23:59 hora Argentina (UTC-3) el reloj UTC ya está en el día siguiente — un plazo fijo constituido a esa hora hubiera quedado con `fecha_inicio` de "mañana" en vez de "hoy" (y por lo tanto también `fecha_fin` corrida un día). Se agregó [ClockConfig.java](../PayX-backend/src/main/java/com/payx/backend/config/ClockConfig.java), un bean `Clock` fijado explícitamente a `America/Argentina/Buenos_Aires`, inyectado en `PlazoFijoService` en vez de llamar a `LocalDate.now()`/`OffsetDateTime.now()` directo. De paso esto hace el servicio testeable con un reloj fijo, algo imposible de probar de forma determinística con el reloj real — se agregó un test (`constituirCercaDeLaMedianocheUsaElDiaDeArgentinaNoElDelServidor`) que fija el reloj a las 23:50 y verifica que `fecha_inicio` sea el día correcto.

**2. Validado con tests, sin bugs encontrados:**
- **Los 5 plazos válidos** (30/60/90/180/365 días) calculan la TNA e interés correctos; se sumó un caso a 365 días (`dias/365 = 1`, simplifica la fórmula) para verificarla "en limpio" sin redondeos intermedios.
- **Cualquier plazo no ofrecido** (0, negativo, 1, 45, 100, 366, 1000) se rechaza — el diseño ya usa una lista explícita de tasas (no un rango), así que cualquier valor fuera de esa lista se frena solo, sin necesitar una validación de rango aparte.
- **Monto exactamente en el mínimo** ($1000.00) se acepta; un centavo menos ($999.99) se rechaza — confirma que el límite es inclusive (`>=`) como corresponde.
- **Con 4 plazos fijos activos** todavía se puede constituir el quinto; con 5 activos, el sexto se rechaza — confirma que el límite de "máximo 5" no tiene un error de off-by-one.
- Monto en cero o negativo: ya rechazado tanto por `@DecimalMin("0.01")` en el DTO (antes de llegar al servicio) como por la propia comparación contra el mínimo si igual llegara (defensa en profundidad).

**37/37 tests pasan** en todo el backend (17 de ellos en `PlazoFijoServiceTest`, antes 10), incluyendo `PayxBackendApplicationTests.contextLoads` (confirma que el nuevo bean `Clock` no rompe el arranque de Spring).

Nota aparte: el resto del backend (`TransferenciaService`, `VerificacionService`, etc.) sigue usando `OffsetDateTime.now()`/`LocalDate.now()` sin zona explícita. Ahí el riesgo es menor porque son *instantes* (con offset), no fechas puras de calendario — pero si en algún momento se agrega otra lógica basada en "qué día es hoy" en esos servicios, conviene inyectarles el mismo `Clock` en vez de repetir el problema.

---

### Feature: compra y venta real de dólares con cotización oficial en vivo

El modal de compra/venta ya existía en el frontend pero, igual que el plazo fijo antes de esta sesión, era 100% mock: la cotización estaba hardcodeada (`COTIZACION_COMPRA_USD`/`VENTA_USD`) y no se movía ningún saldo real. Se investigaron 2 APIs gratuitas y sin api key para el dólar oficial argentino ([dolarapi.com](https://dolarapi.com) y [bluelytics.com.ar](https://api.bluelytics.com.ar)) y se probaron ambas a mano antes de elegir: se usa **dolarapi.com** (`/v1/dolares/oficial`) por devolver directamente `compra`/`venta` sin transformar. Se usa la cotización **oficial**, no la "blue" (informal): es la que correspondería a una app financiera formal como PayX.

**Tabla `operaciones_cambio`** — ya existía en la base (igual que `plazo_fijo`, sin usar todavía). No hizo falta ningún `ALTER TABLE`: es más genérica que el diseño inicial, con `moneda_origen`/`moneda_destino` en vez de un `tipo` fijo COMPRA/VENTA (soporta cualquier par de monedas) y `monto_enviado`/`monto_recibido`/`cotizacion_usada` con precisión `NUMERIC(18,8)` — la misma que usan los saldos cripto de `cuentas` (`saldo_btc`/`saldo_eth`/`saldo_solana`), lo que sugiere que la tabla ya estaba pensada para poder registrar cambios con cripto más adelante, no solo pesos/dólares. El "tipo" (COMPRA/VENTA) no se guarda como columna: se deriva en el servicio según cuál de las dos monedas es PESOS.

**Backend:**
- [DolarApiClient.java](../PayX-backend/src/main/java/com/payx/backend/client/DolarApiClient.java) / [DolarApiClientImpl.java](../PayX-backend/src/main/java/com/payx/backend/client/DolarApiClientImpl.java): cliente HTTP hacia dolarapi.com, mismo patrón que `AuthService.verificarTokenGoogle` (un `RestClient.create()` propio). Separado en una interfaz para poder testear la lógica de cache sin simular la cadena fluida de `RestClient`.
- [CotizacionService.java](../PayX-backend/src/main/java/com/payx/backend/service/CotizacionService.java): cachea la cotización en memoria por 60s. Sin esto, el polling del frontend (cada 5-20s, potencialmente desde varios usuarios/pestañas) le pegaría constantemente a una API gratuita de terceros — un abuso innecesario y un punto de falla evitable. Si el proveedor externo falla, devuelve la **última cotización buena conocida** marcada como `desactualizada` en vez de romper la operación; solo tira error si nunca hubo ninguna cotización cacheada.
- [CambioDolaresService.java](../PayX-backend/src/main/java/com/payx/backend/service/CambioDolaresService.java): mismo patrón de bloqueo de cuenta (`findByIdConLock`) que transferencias y plazos fijos, para que dos operaciones simultáneas no puedan pasar juntas la validación de saldo (doble gasto). Al comprar se aplica el precio de **venta** (lo que paga el usuario); al vender, el precio de **compra** (lo que recibe) — la misma lógica que tendría cualquier casa de cambio real. La cotización aplicada queda "congelada" en la operación guardada, no cambia retroactivamente si la cotización de referencia sube o baja después.
- [CotizacionController.java](../PayX-backend/src/main/java/com/payx/backend/controller/CotizacionController.java) (`GET /api/cotizacion/dolar`) y [CambioDolaresController.java](../PayX-backend/src/main/java/com/payx/backend/controller/CambioDolaresController.java) (`POST`/`GET /api/cambio-dolares`).
- [NotificacionService.java](../PayX-backend/src/main/java/com/payx/backend/service/NotificacionService.java): nuevo `notificarCambioDolares`. Hacen falta 2 plantillas nuevas en el panel de admin: `DOLARES_COMPRADOS` y `DOLARES_VENDIDOS` (variables disponibles: `{{montoUsd}}`, `{{monto}}` en pesos, `{{cotizacion}}`, `{{fecha}}`).
- [RateLimitFilter.java](../PayX-backend/src/main/java/com/payx/backend/security/RateLimitFilter.java): límites para `POST /api/cambio-dolares` (15/min) y `GET /api/cotizacion/dolar` (30/min).

**Frontend:**
- [cotizacionService.js](src/services/cotizacionService.js) y [cambioDolaresService.js](src/services/cambioDolaresService.js) (nuevos).
- [CambioDolaresModal.jsx](src/components/CambioDolaresModal.jsx): dejó de simular todo. Pide la cotización real al backend al abrirse y la refresca cada 15s mientras está abierto (para no operar con un precio viejo si se lo deja abierto un rato largo), calcula el monto de salida con el precio real, y al confirmar crea la operación real contra el backend.
- [Home.jsx](src/pages/Home.jsx): la cotización real (precio de venta) también se usa ahora para el "≈ $ tal en pesos" del modal de transferencia en dólares entre usuarios, reemplazando el `COTIZACION_USD` hardcodeado — mismo dato, un solo lugar de verdad. Se agregó `cambiosDolares` al estado y al polling (5s), y la cotización se refresca aparte cada 20s (pollearla más seguido no traería nada más fresco: el backend la cachea 60s).
- [ActividadItem.jsx](src/components/ActividadItem.jsx): nueva variante `cambioDolares` (compra en verde +US$, venta en rojo -US$, con el monto en pesos como detalle). Sin vista de detalle propia (es una operación instantánea e inmutable, sin nada para confirmar/cancelar/editar), así que no es clickeable — se ajustó el componente para que la clase `clickeable` solo se aplique cuando el padre pasa un `onClick`.
- [utils/actividad.js](src/utils/actividad.js): `construirActividades` ahora acepta un tercer argumento opcional con las operaciones de cambio.
- [Movimientos.jsx](src/pages/Movimientos.jsx): también trae y muestra los cambios de dólares.

**Tests:** [CotizacionServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/CotizacionServiceTest.java) (6 casos: cachea dentro de la ventana de 60s, refresca pasada esa ventana usando un reloj mutable de prueba, fallback a la última cotización conocida si el proveedor falla, error solo si nunca hubo cache) y [CambioDolaresServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/CambioDolaresServiceTest.java) (7 casos: cálculo y redondeo correcto en compra/venta, saldo insuficiente en cada sentido, la operación no se ejecuta si la cotización no está disponible, una notificación fallida no revierte la operación). **50/50 tests pasan** en todo el backend, incluyendo `PayxBackendApplicationTests.contextLoads` contra la tabla real — no quedó ningún test rojo pendiente de una migración manual.

---

### Ticker de cotización en vivo dentro de los modales de compra/venta

Pedido: mostrar cómo sube y baja la cotización del dólar en tiempo real (compra en verde, venta en rojo) arriba del formulario, no como un elemento aparte en el Home.

- [CotizacionTicker.jsx](src/components/CotizacionTicker.jsx) / [CotizacionTicker.css](src/components/CotizacionTicker.css) (nuevos): recibe la `cotizacion` que ya tenía el modal (no pide nada nuevo al backend) y compara cada valor contra el anterior con un `useRef` para saber si subió o bajó desde la última actualización; si cambió, flashea el fondo del valor afectado y muestra una flechita (invertida si bajó) durante 1.5s.
- [CambioDolaresModal.jsx](src/components/CambioDolaresModal.jsx): el ticker se renderiza arriba del título, dentro del paso `form`. Como el modal ya refresca la cotización cada 15s mientras está abierto (para no operar con un precio viejo), el ticker se ve moverse solo con eso — no hizo falta agregar ningún polling nuevo.
- Se probó primero como una barra debajo de "Inversiones" en el Home; se descartó ese lugar y se lo movió adentro de los modales de comprar/vender, que es donde tiene sentido verlo mientras se decide cuánto operar.

---

### Auditoría del módulo de compra/venta de dólares: cotización externa, redondeos y rate limit

Mismo pedido que la auditoría de plazos fijos: romper el módulo a propósito (formularios, cotización, rate limit) y arreglar lo que fallara. Se encontraron y arreglaron 3 problemas reales, cada uno confirmado revirtiendo el fix a propósito y viendo caer el test correspondiente (para no terminar con tests que "pasarían igual" sin el arreglo):

**1. BUG REAL — una cotización corrupta del proveedor externo se guardaba en el cache tal cual:** `CotizacionService` confiaba ciegamente en lo que devolviera `dolarapi.com`. Si esa API de terceros alguna vez respondiera con `compra`/`venta` en cero o negativo (mantenimiento, un bug de ellos, una respuesta corrupta), ese valor se cacheaba como si fuera válido — la siguiente compra/venta dividiría o multiplicaría por ese número sin sentido, moviendo plata real de forma incorrecta (o directamente reventando con una excepción de división por cero). Se agregó `validarCotizacion` en [CotizacionService.java](../PayX-backend/src/main/java/com/payx/backend/service/CotizacionService.java): si el proveedor devuelve algo con `compra`/`venta` nulo, cero o negativo, se trata exactamente igual que una falla de red (usa la última cotización buena conocida marcada como `desactualizada`, o tira error si nunca hubo ninguna). 3 tests nuevos en `CotizacionServiceTest`.

**2. BUG REAL — un monto muy chico podía cobrar pesos reales y entregar $0.00 dólares:** el mínimo del formulario era $0.01 (cualquier moneda), pero al redondear a 2 decimales, comprar dólares con menos de ~$7.65 pesos (a una cotización de referencia de $1530) da como resultado `montoUsd = 0.00` — el usuario pagaba esos pesos y no recibía ni un centavo a cambio. Se agregó una validación en [CambioDolaresService.java](../PayX-backend/src/main/java/com/payx/backend/service/CambioDolaresService.java) que rechaza la operación (sin tocar el saldo) si el monto calculado del otro lado redondea a cero o menos, tanto en `ejecutarCompra` como en `ejecutarVenta` (este último caso es prácticamente inalcanzable con una cotización real, pero se dejó simétrico para no confiar en que la cotización siempre va a ser "razonable"). 3 tests nuevos, incluyendo uno de límite exacto: $7.64 se rechaza, $7.65 se acepta (redondea a $0.01).

**3. BUG REAL — el rate limit se podía esquivar del todo con una barra al final de la ruta:** [RateLimitFilter.java](../PayX-backend/src/main/java/com/payx/backend/security/RateLimitFilter.java) arma la clave de conteo con `request.getRequestURI()` tal cual llega. Una request a `POST /api/cambio-dolares/` (con `/` final) o `POST //api//cambio-dolares` (barras repetidas) no matchea ninguna entrada del mapa de límites ni empieza con `/api/auth/`, así que el filtro la dejaba pasar **sin contarla ni frenarla nunca** — Spring después le respondería 404 igual (no hay ninguna ruta registrada con esa barra), pero mientras tanto el filtro nunca la limitaba, y alternar entre la ruta con y sin barra permitía superar el límite real de 15/min sobre el endpoint bueno combinando ambas variantes. Se agregó `normalizarPath` (saca barras finales y colapsa barras repetidas) antes de armar la clave. Confirmado revirtiendo el cambio: sin él, los tests con barra final vuelven a pasar el límite sin nunca recibir 429.

Se creó [RateLimitFilterTest.java](../PayX-backend/src/test/java/com/payx/backend/security/RateLimitFilterTest.java) (nuevo, 8 casos) — el filtro no tenía tests propios hasta ahora. Cubre: dejar pasar dentro del límite, cortar con 429 al superarlo, que la barra final y las barras repetidas ahora sí cuenten para el mismo límite, contadores independientes por IP, y dos casos que documentan el comportamiento *actual y deliberado* del filtro (rutas fuera de `/api/auth/` y sin entrada propia en el mapa quedan sin límite; una ruta de auth sin entrada propia cae en el límite por defecto) para que un cambio futuro que lo altere sin querer se note en un test, no en producción.

**64/64 tests pasan** en todo el backend (antes 50) — no quedó ningún hallazgo de esta auditoría sin arreglar ni sin test.

---

### Feature: compra y venta real de BTC/ETH/SOL con precio de mercado en vivo

Mismo patrón que el dólar (que ya venía siendo 100% mock: precios, tenencias y operaciones hardcodeados en `CriptoModal.jsx`), pero con una diferencia de diseño explícita pedida por el usuario: **un único precio por cripto, sin spread compra/venta** — el mismo precio que se muestra en vivo es el que se usa para operar (a diferencia del dólar oficial, que sí tiene precio de compra y de venta distintos).

**Precio en pesos directo desde CoinGecko:** se probó `api.coingecko.com/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=ars` a mano antes de integrarlo — gratis, sin api key, y devuelve el precio ya en pesos argentinos (no hace falta combinarlo con la cotización del dólar como se podría haber necesitado con una API que solo cotice en USD).

**Sin ninguna tabla ni columna nueva:** `Cuenta` ya tenía `saldo_btc`/`saldo_eth`/`saldo_solana` (`NUMERIC(18,8)`, inicializados en cero al crear la cuenta) sin usar todavía, y `operaciones_cambio` — la misma tabla genérica que ya se usaba para dólares — sirve tal cual para cripto: `moneda_origen`/`moneda_destino` puede ser `PESOS`/`BTC`, `PESOS`/`ETH` o `PESOS`/`SOL` igual que antes era `PESOS`/`USD`.

**BUG evitado antes de que existiera:** al compartir la tabla `operaciones_cambio` entre dólares y cripto, listar "mis cambios de dólares" con la query vieja (`findByUsuarioIdOrderByFechaDesc`, sin filtrar moneda) también hubiera traído las operaciones de cripto del usuario, mal mapeadas contra el DTO de dólares. Se cambió el repositorio a `findByUsuarioIdAndMoneda`/`findByUsuarioIdAndMonedaIn` (filtran por qué moneda participa en la fila) *antes* de escribir `CriptoService`, no después de encontrarlo roto.

**Backend:**
- [PrecioCripto.java](../PayX-backend/src/main/java/com/payx/backend/client/PrecioCripto.java) / [CriptoPriceClient.java](../PayX-backend/src/main/java/com/payx/backend/client/CriptoPriceClient.java) / [CriptoPriceClientImpl.java](../PayX-backend/src/main/java/com/payx/backend/client/CriptoPriceClientImpl.java): cliente de CoinGecko, mismo patrón que `DolarApiClient` (un `RestClient.create()` propio, separado en interfaz para poder testear el cache sin simular la cadena fluida de `RestClient`). Pide las 3 cotizaciones en una sola llamada.
- [CotizacionCriptoService.java](../PayX-backend/src/main/java/com/payx/backend/service/CotizacionCriptoService.java): mismo cache de 60s y mismo fallback a la última cotización buena conocida que `CotizacionService`, aplicado a la lista de 3 precios. Incorpora desde el arranque la validación de la auditoría anterior: un precio en cero o negativo del proveedor se descarta igual que una falla de red.
- [CriptoService.java](../PayX-backend/src/main/java/com/payx/backend/service/CriptoService.java): mismo bloqueo de cuenta (`findByIdConLock`) y misma guarda de "monto que redondea a cero" que `CambioDolaresService` (aplicada desde el arranque, no como parche posterior). La cripto vendida/comprada redondea a 8 decimales (coincide con la precisión de `saldo_btc`/`saldo_eth`/`saldo_solana` y de `operaciones_cambio`), los pesos a 2. Al vender, valida el saldo de la cripto específica pedida (no se puede vender SOL usando saldo de BTC).
- [CriptoController.java](../PayX-backend/src/main/java/com/payx/backend/controller/CriptoController.java) (`POST`/`GET /api/cripto`) y endpoint nuevo en [CotizacionController.java](../PayX-backend/src/main/java/com/payx/backend/controller/CotizacionController.java) (`GET /api/cotizacion/cripto`).
- [PerfilResponse.java](../PayX-backend/src/main/java/com/payx/backend/dto/PerfilResponse.java): ahora expone `saldoBtc`/`saldoEth`/`saldoSolana` (existían en la tabla pero no se mandaban al frontend).
- [NotificacionService.java](../PayX-backend/src/main/java/com/payx/backend/service/NotificacionService.java): nuevo `notificarCripto`. Hacen falta 2 plantillas nuevas en el panel de admin: `CRIPTO_COMPRADA` y `CRIPTO_VENDIDA` (variables: `{{simbolo}}`, `{{montoCripto}}`, `{{monto}}` en pesos, `{{cotizacion}}`, `{{fecha}}`).
- [RateLimitFilter.java](../PayX-backend/src/main/java/com/payx/backend/security/RateLimitFilter.java): límites para `POST /api/cripto` (15/min) y `GET /api/cotizacion/cripto` (30/min).

**Frontend:**
- [cotizacionCriptoService.js](src/services/cotizacionCriptoService.js) y [criptoService.js](src/services/criptoService.js) (nuevos).
- [CriptoTicker.jsx](src/components/CriptoTicker.jsx) / [CriptoTicker.css](src/components/CriptoTicker.css) (nuevos): a diferencia de [CotizacionTicker.jsx](src/components/CotizacionTicker.jsx) (dólar, 2 columnas fijas compra/venta), este recibe una lista de N cotizaciones y muestra un único precio por fila, con flash y flechita (verde arriba / roja invertida) si cambió desde la última actualización — sin distinción de color fijo por compra/venta, porque no la hay.
- [CriptoModal.jsx](src/components/CriptoModal.jsx): dejó de usar el array `CRIPTOS` hardcodeado. Pide las 3 cotizaciones al backend al abrirse y las refresca cada 15s mientras está abierto (mismo patrón que el modal de dólares), muestra el ticker arriba del título, y usa el saldo real de la cripto elegida (`perfil.saldoBtc`/`saldoEth`/`saldoSolana`) en vez de una tenencia inventada.
- [Home.jsx](src/pages/Home.jsx): el balance de "Cripto" en la tarjeta de saldo ahora es real — se calcula sumando `saldoBtc*precioBTC + saldoEth*precioETH + saldoSolana*precioSOL` con los precios en vivo. Se sacó el "Rindió $X en los últimos 12 meses" que antes era inventado: no hay precio promedio de compra guardado para calcular una ganancia/pérdida real, y mostrar un número falso al lado de un saldo ahora real hubiera sido peor que no mostrar nada.
- [ActividadItem.jsx](src/components/ActividadItem.jsx): nueva variante `cambioCripto` (ícono de monedas, verde +cripto en compra, rojo -cripto en venta).
- [utils/actividad.js](src/utils/actividad.js): `construirActividades` acepta un cuarto argumento opcional con las operaciones de cripto.
- [Movimientos.jsx](src/pages/Movimientos.jsx): también trae y muestra las operaciones de cripto.
- [Navbar.jsx](src/components/Navbar.jsx): títulos para `CRIPTO_COMPRADA`/`CRIPTO_VENDIDA`.

**Tests:** [CotizacionCriptoServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/CotizacionCriptoServiceTest.java) (9 casos, mismo esquema que `CotizacionServiceTest`) y [CriptoServiceTest.java](../PayX-backend/src/test/java/com/payx/backend/service/CriptoServiceTest.java) (7 casos: redondeo a 8/2 decimales, saldo insuficiente por cripto específica, monto que redondea a cero, cotización no disponible, notificación fallida no revierte la operación, listado filtrado). **80/80 tests pasan** en todo el backend (antes 64), incluyendo `PayxBackendApplicationTests.contextLoads` — no hizo falta ninguna migración.

---

### Fix: la animación del saldo se reiniciaba a $0 en vez de deslizarse

Bug reportado por el usuario después de probar la compra de BTC: el número grande de saldo, en la pestaña "Cripto", se veía "atascado" en un valor mucho menor al esperado, subiendo de a poquito con cada actualización en vez de mostrar el valor real.

**Causa:** el `useEffect` que animaba el conteo del saldo (`Home.jsx`) usaba `desde = 0` fijo cada vez que se disparaba, y estaba atado a `[monedaActiva, monedaData.saldo]` — como el precio de la cripto se actualiza solo, `monedaData.saldo` cambia constantemente, así que la animación se reiniciaba desde cero una y otra vez, sin nunca llegar a terminar su recorrido hacia el valor real.

**Fix:** [useValorAnimado.js](src/hooks/useValorAnimado.js) (hook nuevo, reutilizable): desliza un número desde su **último valor mostrado** (no desde cero) hacia el nuevo objetivo cada vez que este cambia, y devuelve la dirección del último cambio (`'sube'`/`'baja'`/`null`) para poder pintarlo. Se usa en `Home.jsx` (reemplaza el `useEffect` de conteo original) y también en los tickers de precio (ver más abajo), unificando la misma animación en toda la app.

**Además, pedido explícito:** que el precio se sienta en vivo (actualizándose seguido, con el número deslizándose y poniéndose verde/rojo según suba o baje) y un botón para ver el saldo de cada cripto por separado en vez de un total mezclado.

- [CotizacionTicker.jsx](src/components/CotizacionTicker.jsx) y [CriptoTicker.jsx](src/components/CriptoTicker.jsx): reescritos sobre `useValorAnimado`. El precio ya no salta de golpe a cada actualización: se desliza suavemente cuadro a cuadro (mucho más seguido que una vez por segundo) hacia el valor real, coloreándose mientras se mueve.
- [CambioDolaresModal.jsx](src/components/CambioDolaresModal.jsx) y [CriptoModal.jsx](src/components/CriptoModal.jsx): el refresco de cotización mientras el modal está abierto pasó de 15s a **3s**, para que haya un valor real nuevo seguido y la animación tenga con qué trabajar. Verificado que esto no rompe el rate limit (30/min por endpoint): sumado al polling de fondo del Home (20s), el peor caso da ~23 req/min, por debajo del límite — no hizo falta tocar `RateLimitFilter`.
  - Aclaración honesta que se le hizo al usuario: no existe un feed de precio realmente "segundo a segundo" gratis para esto (CoinGecko no lo ofrece sin pagar, y tampoco convendría pedirlo así de seguido); lo que se ve es una animación suave entre valores reales que sí llegan cada pocos segundos, no datos inventados.
- [Home.jsx](src/pages/Home.jsx) / [Home.css](src/pages/Home.css): la pestaña "Cripto" ahora tiene sub-botones BTC/ETH/SOL (`.home-tabs-cripto`) para elegir qué moneda ver. El número grande muestra el saldo **nativo** de esa cripto (ej. "0.00000869 BTC"), con el equivalente en pesos como texto secundario (`≈ $ 999.87`) — en vez de un único total en pesos que mezclaba las tres y no se podía verificar. Esto también sirve como herramienta de diagnóstico: si el número de una cripto puntual se ve mal, ahora se puede aislar cuál.

---

### Se agregaron 3 criptomonedas más: USDT, BNB y XRP (ahora son 6 en total)

Pedido: pasar de 3 a "5 o 6" criptomonedas soportadas. Se sumaron USDT (Tether), BNB y XRP (Ripple) a las 3 que ya había (BTC/ETH/SOL) — todas ya cubiertas por CoinGecko con cotización directa en pesos.

**Requiere una migración** (no se ejecutó, hay que correrla a mano — ver instrucciones que se le dieron al usuario): 3 columnas nuevas en `cuentas`, mismo tipo que las criptos existentes:
```sql
ALTER TABLE cuentas ADD COLUMN saldo_usdt NUMERIC(18,8) NOT NULL DEFAULT 0;
ALTER TABLE cuentas ADD COLUMN saldo_bnb  NUMERIC(18,8) NOT NULL DEFAULT 0;
ALTER TABLE cuentas ADD COLUMN saldo_xrp  NUMERIC(18,8) NOT NULL DEFAULT 0;
```

- [Cuenta.java](../PayX-backend/src/main/java/com/payx/backend/model/Cuenta.java): nuevos campos `saldoUsdt`/`saldoBnb`/`saldoXrp`. [CuentaService.java](../PayX-backend/src/main/java/com/payx/backend/service/CuentaService.java) los inicializa en cero para cuentas nuevas, igual que los demás.
- [CriptoPriceClientImpl.java](../PayX-backend/src/main/java/com/payx/backend/client/CriptoPriceClientImpl.java): se sumaron `tether`/`binancecoin`/`ripple` a la lista de ids de CoinGecko pedidos en la misma llamada (sigue siendo una sola consulta HTTP para todas).
- [CriptoService.java](../PayX-backend/src/main/java/com/payx/backend/service/CriptoService.java) y [CrearOperacionCriptoRequest.java](../PayX-backend/src/main/java/com/payx/backend/dto/CrearOperacionCriptoRequest.java): `SIMBOLOS_SOPORTADOS` y el `@Pattern` de validación ahora incluyen `USDT`/`BNB`/`XRP`, y los switch de saldo por moneda tienen sus casos.
- [PerfilResponse.java](../PayX-backend/src/main/java/com/payx/backend/dto/PerfilResponse.java): expone los 3 saldos nuevos.
- Frontend: [CriptoModal.jsx](src/components/CriptoModal.jsx) y [Home.jsx](src/pages/Home.jsx) — las listas/mapas de criptomonedas soportadas (nombre, símbolo, saldo) pasaron de 3 a 6 entradas; el selector de sub-pestañas en el balance ahora envuelve en dos filas en pantallas chicas.
- **Tests:** se agregaron `comprarXrpFuncionaIgualQueLasCriptosOriginales` y `venderBnbFuncionaIgualQueLasCriptosOriginales` en `CriptoServiceTest` para probar el cableado de las 3 monedas nuevas (no hizo falta duplicar todos los casos existentes: la lógica es la misma para las 6). **82/82 tests unitarios pasan**; `PayxBackendApplicationTests.contextLoads` va a fallar hasta que se corra la migración de arriba contra la base real (es esperable: el entity ya mapea columnas que todavía no existen ahí).

---

### Notificaciones de cripto (mensajes) + transferencia de criptomonedas entre usuarios

**Plantillas pedidas para el panel de admin** (con los mismos códigos que ya usa `CriptoService`, variables `{{simbolo}}`, `{{montoCripto}}`, `{{monto}}`, `{{cotizacion}}`, `{{fecha}}`):
- `CRIPTO_COMPRADA`: "Compraste {{montoCripto}} a {{cotizacion}} por {{monto}} el {{fecha}}."
- `CRIPTO_VENDIDA`: "Vendiste {{montoCripto}} y recibiste {{monto}} el {{fecha}}."

**Transferir cripto entre usuarios** (BTC/ETH/SOL/USDT/BNB/XRP), igual que ya se podía con pesos y dólares — reutilizando el mismo mecanismo de transferencias (tabla `transacciones`, confirmación/cancelación de pendientes, notificaciones `TRANSFERENCIA_ENVIADA`/`RECIBIDA` ya existentes) en vez de construir uno nuevo aparte.

**Requiere una migración** (agrega precisión, no rompe filas existentes — los montos en pesos/dólares actuales quedan exactamente iguales, solo ganan capacidad de decimales que no usan):
```sql
ALTER TABLE transacciones ALTER COLUMN monto TYPE NUMERIC(18,8);
```
La columna `monto` era `NUMERIC(15,2)` — alcanzaba para pesos/dólares pero redondeaba a 0 decimales de más cualquier cantidad de cripto (ej. 0.00000866 BTC se hubiera guardado como 0.00). `moneda` ya tenía `length=10`, así que los tickers de cripto (máximo "USDT", 4 caracteres) entran sin cambios ahí.

- [Cuenta.java](../PayX-backend/src/main/java/com/payx/backend/model/Cuenta.java): se agregaron `getSaldoDeMoneda(moneda)` / `sumarSaldoDeMoneda(moneda, delta)` — un único lugar que sabe "qué campo de saldo corresponde a esta moneda" (las 8 soportadas: PESOS, USD, BTC, ETH, SOL, USDT, BNB, XRP), para no repetir el mismo switch en cada servicio que mueve plata en una moneda cualquiera.
- [CriptoService.java](../PayX-backend/src/main/java/com/payx/backend/service/CriptoService.java): se refactorizó para usar estos métodos nuevos en vez de su propio switch privado (mismo comportamiento, menos código duplicado).
- [TransferenciaService.java](../PayX-backend/src/main/java/com/payx/backend/service/TransferenciaService.java): `validarSaldoSuficiente`/`ejecutarMovimiento` ahora usan `Cuenta.getSaldoDeMoneda`/`sumarSaldoDeMoneda` en vez de un `if PESOS ... else USD` fijo — así soportan cualquiera de las 8 monedas sin más cambios si se agrega otra en el futuro. `formatearMontoNotificacion` distingue fiat (con símbolo $/US$, 2 decimales) de cripto (sin símbolo fiat, ticker después del número, sin ceros de relleno — ej. "0.5 BTC").
- [CrearTransferenciaRequest.java](../PayX-backend/src/main/java/com/payx/backend/dto/CrearTransferenciaRequest.java): el `@Pattern` de moneda ahora incluye las 6 criptos, y el monto acepta hasta 8 decimales (antes 2 fijos).
- **Tests:** se agregaron `unaTransferenciaDeCriptoMueveElSaldoDeEsaCriptoEspecifica` y `noSePuedeTransferirMasCriptoDeLaQueSeTiene` en `TransferenciaServiceTest`. **83/83 tests unitarios pasan** (el refactor de `Cuenta`/`CriptoService` no rompió ningún test existente).

**Frontend:**
- [TransferModal.jsx](src/components/TransferModal.jsx): generalizado para aceptar `config.esCripto` — en ese caso muestra un select de criptomoneda (BTC/ETH/SOL/USDT/BNB/XRP) arriba del formulario, y el saldo/símbolo/decimales mostrados (8 en vez de 2) siguen a la moneda elegida. Pesos y dólares siguen funcionando exactamente igual que antes (su `config` no tiene `esCripto`).
- [Home.jsx](src/pages/Home.jsx): nueva acción "Transferencia en cripto" (junto a "Transferir" y "Transferencia en dólares"), con un `configModalCripto` que le pasa al modal los 6 saldos reales del perfil.
- [ActividadItem.jsx](src/components/ActividadItem.jsx) y [TransferenciaDetalleModal.jsx](src/components/TransferenciaDetalleModal.jsx): **bug encontrado y arreglado antes de que llegara a verse** — como ambos ya mostraban cualquier `transferencia` (no sabían que ahora podían venir en cripto), formateaban el monto siempre a 2 decimales con símbolo "$" por defecto. Una transferencia de 0.5 BTC se hubiera mostrado como "$0.50". Ahora detectan si la moneda es una cripto y muestran el ticker después del número sin redondear a 2 decimales (igual que ya se hacía en `cambioCripto`).

---

### Auditoría del módulo de cripto: precios, datos, API y "horarios" (timing)

Pedido explícito: romper el módulo de compra/venta de cripto por todos los medios posibles (precios, datos, la API externa, timing) y arreglar lo que se encuentre. Se encontraron y arreglaron 4 problemas reales, todos verificados con la misma metodología usada en la auditoría de dólares: escribir el test, confirmar que falla revirtiendo el fix, y volver a aplicarlo.

**1. Arbitraje por redondeo — el más serio, plata gratis real.** [CriptoService.java](../PayX-backend/src/main/java/com/payx/backend/service/CriptoService.java) redondeaba con `HALF_UP` tanto al comprar (pesos → cripto) como al vender (cripto → pesos). Como cripto usa **un único precio** para ambas puntas (a diferencia del dólar, que tiene spread compra/venta que absorbe cualquier ruido de redondeo), redondear "para arriba" dos veces seguidas permitía un ida y vuelta con ganancia neta: a una cotización de $100.000.000, comprar con $1.234.567,89 y vender ese mismo monto de cripto de vuelta devolvía $1.234.568,00 — **11 centavos de ganancia gratis, repetible sin límite** (a razón de ~7 ida-y-vueltas por minuto por el rate limit, esto escala). **Fix:** `RoundingMode.DOWN` en vez de `HALF_UP` en lo que el usuario RECIBE en ambas direcciones — matemáticamente, redondear siempre hacia abajo en ambos sentidos hace imposible que un ida y vuelta devuelva más de lo que se puso. Confirmado con `compraYVentaInmediataDeLaMismaCriptoNuncaDejaMasPesosQueAlEmpezar` en `CriptoServiceTest`, revirtiendo el fix para ver el test fallar antes de restaurarlo. El dólar no tiene este problema (su spread ya lo cubre) y no se tocó.

**2. Sin timeout en las APIs externas — un colgado bloqueaba a todos los usuarios.** Ni [CriptoPriceClientImpl.java](../PayX-backend/src/main/java/com/payx/backend/client/CriptoPriceClientImpl.java) (CoinGecko) ni [DolarApiClientImpl.java](../PayX-backend/src/main/java/com/payx/backend/client/DolarApiClientImpl.java) (dolarapi.com) tenían ningún timeout configurado. Como el método que consulta el proveedor es `synchronized` (para evitar pegarle varias veces en simultáneo), un proveedor que acepta la conexión pero nunca responde (colgado, no caído) hubiera dejado ese hilo esperando indefinidamente **con el lock tomado** — bloqueando a todos los demás usuarios pidiendo cotización u operando, no solo al que disparó la llamada. **Fix:** ambos clientes ahora usan un `RestClient` con `JdkClientHttpRequestFactory` configurado con connect timeout de 3s y read timeout de 5s.

**3. Un precio inválido de UNA cripto tumbaba las 6.** [CotizacionCriptoService.java](../PayX-backend/src/main/java/com/payx/backend/service/CotizacionCriptoService.java) cacheaba la lista de las 6 cotizaciones como "todo o nada": si CoinGecko devolvía un precio en cero/negativo (o directamente omitía una moneda) para una sola cripto, se descartaba el lote completo y las otras 5 —que habían llegado bien— también se quedaban con el precio viejo. **Fix:** el cache ahora es *por moneda* (`Map<String, PrecioCacheado>`), así una cripto con problemas no afecta a las demás. Se reescribieron los tests de `CotizacionCriptoServiceTest` para probar esto explícitamente (`unaCotizacionInvalidaNoPisaSuPropioCacheNiAfectaALasDemasQueLleganBien`).

**4. Sin techo de antigüedad para operar (el "horarios" del pedido).** Si el proveedor externo estaba caído durante horas, el precio cacheado se seguía usando para operar plata real indefinidamente (solo se marcaba "desactualizada" para mostrarlo, sin ningún límite real). **Fix:** se agregó `MAX_EDAD_PARA_OPERAR` (5 minutos) en `CotizacionCriptoService.precioDe()` — mostrar un precio viejo en el ticker sigue funcionando siempre (mejor mostrar algo que nada), pero **operar** con él se corta pasados 5 minutos sin poder refrescarlo. Se aplicó el mismo criterio a [CotizacionService.java](../PayX-backend/src/main/java/com/payx/backend/service/CotizacionService.java) (dólar) por consistencia, ya que el mismo riesgo aplica ahí igual.

**Cosa que se consideró y se decidió NO hacer:** un "circuit breaker" que rechace un precio nuevo si se desvía demasiado (ej. 30%) del último conocido, para blindar contra un glitch del proveedor (precio con un cero de más/menos). Se descartó porque, si el precio real se mueve fuerte y sostenido (una baja/suba real grande), el circuit breaker lo rechazaría para siempre —cada intento nuevo también "se desviaría demasiado" del último valor bueno, que cada vez queda más viejo— dejando el precio congelado permanentemente en el peor momento posible (un crash real). Evitarlo bien requeriría una máquina de estados con umbrales de tiempo/reintentos, que se juzgó desproporcionado para el riesgo real (CoinGecko sirviendo un precio absurdo de forma sostenida).

**También:** se agregaron tests puntuales de rate limit para los endpoints de cripto (`POST /api/cripto`, `GET /api/cotizacion/cripto`) en `RateLimitFilterTest`, que ya estaban protegidos pero no tenían un test propio (solo se probaba el mecanismo genérico contra `/api/cambio-dolares`).

**95/95 tests unitarios pasan, incluyendo `PayxBackendApplicationTests.contextLoads`** (las migraciones de la sesión anterior —`saldo_usdt`/`saldo_bnb`/`saldo_xrp` y el ancho de `transacciones.monto`— ya estaban corridas contra la base real).

---
