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
