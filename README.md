# TaskFlow — Frontend

SPA de **TaskFlow**, una aplicación de gestión de proyectos ágiles hecha a la medida de equipos de pasantías (al
estilo de Plane o Jira, sin copiar código de ninguno). Proyecto de prácticas universitarias.

- Consume la API de [`Task_backend`](https://github.com/Server-IA/Task_backend). Su README explica la API, la
  seguridad, GitHub, las importaciones y el despliegue.
- En producción corre en **https://dev.inmero.co**.
- Funciona en computador, tablet y teléfono, en español o en inglés, con tema claro u oscuro.

## Contenido

1. [Qué hace](#qué-hace)
2. [Stack](#stack)
3. [Cómo levantarlo](#cómo-levantarlo)
4. [Arquitectura](#arquitectura)
5. [Sesión](#sesión)
6. [Tiempo real](#tiempo-real)
7. [Kanban](#kanban)
8. [Editor y archivos](#editor-y-archivos)
9. [Idiomas](#idiomas)
10. [Responsive y accesibilidad](#responsive-y-accesibilidad)
11. [Seguridad](#seguridad)
12. [Pruebas](#pruebas)
13. [Docker y despliegue](#docker-y-despliegue)
14. [Convenciones](#convenciones)

## Qué hace

| Área | Funcionalidades |
|---|---|
| **Cuenta** | Registro con verificación de correo, inicio de sesión, recuperar y cambiar la contraseña, perfil con foto recortada en el navegador, idioma y tema |
| **Workspace** | Onboarding, invitaciones por correo con página pública para aceptarlas, miembros, **roles con permisos** que se marcan uno a uno, almacenamiento, importar e integraciones |
| **Proyectos** | Identificador y color, estados (columnas del Kanban), etiquetas, plantillas de tarea, miembros y GitHub |
| **Tareas** | Historias, Tareas y Bugs en lista o **Kanban con arrastrar y soltar** (con carriles por historia); vista de Bugs; filtros, orden y página en la URL; vistas guardadas personales o compartidas; panel lateral o página completa |
| **Detalle de la tarea** | Descripción con editor enriquecido, criterios de aceptación, checklist, dependencias, subtareas, adjuntos con visor, desarrollo en GitHub (ramas, PRs, checks y Actions), comentarios con @menciones e historial |
| **Historias de usuario** | Vista del PM, «Partir en tareas», progreso automático, «lista para revisar», cierre y reapertura |
| **Planeación** | Ciclos con cierre guiado y retrospectiva (notas, votos y acciones), módulos, hoja de ruta y **daily** con ronda de turnos, agenda, notas y modo presentación |
| **Seguimiento** | Estadísticas (tiempo de ciclo, throughput, burndown, carga por persona), reportes en PDF con vista previa, «Mi trabajo», actividad del workspace y bandeja de notificaciones |
| **GitHub** | Conectar el workspace, enlazar la cuenta de cada persona, repositorios y reglas por proyecto, página con PRs y ejecuciones de Actions |
| **Importar** | Asistente para traer proyectos de Jira, Trello, Linear, Asana o un CSV: conectar, elegir, mapear, seguir el avance, descargar el informe y deshacer |
| **Siempre** | Cambios de los demás **en tiempo real**, paleta de comandos (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd>), atajos de teclado, aviso sin conexión, orden del menú personalizable |

## Stack

| Área | Tecnología |
|---|---|
| Base | **Vite 8** + **React 19** (JavaScript, con tipos de la API vía JSDoc) |
| Estilos y UI | **Tailwind CSS 4** (con container queries) + shadcn/ui sobre Radix + lucide-react · tipografías Geist y Bricolage Grotesque |
| Datos del servidor | **TanStack Query 5** + axios |
| Rutas | React Router 7 |
| Formularios | react-hook-form + zod (las mismas reglas que el backend) |
| Editor | TipTap 3 (WYSIWYG que guarda Markdown) + marked |
| Arrastrar y soltar | @dnd-kit |
| Otros | Zustand (sesión, preferencias y diseño), Sonner (avisos), cmdk (paleta), date-fns y react-day-picker |
| Pruebas | Vitest + Testing Library (939 pruebas) |
| Calidad | ESLint 10 + Prettier (con el plugin de Tailwind) |

## Cómo levantarlo

Requisitos: **Node.js 22** y la API corriendo en `http://localhost:8080` (ver el README del backend).

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
```

| Variable | Para qué |
|---|---|
| `VITE_API_URL` | URL base de la API. En local `http://localhost:8080/api/v1`; en la imagen de Docker `/api/v1` (mismo dominio) |
| `VITE_QUERY_DEVTOOLS` | `true` muestra el panel de React Query Devtools |

**Correos en local:** con el backend en `MAIL_PROVIDER=smtp`, todos los correos llegan a **Mailpit**
(http://localhost:8025), así que puedes registrarte con cualquier correo inventado y abrir los enlaces desde ahí.

**Archivos en local:** necesitan las credenciales de R2 en el backend y que el CORS del bucket permita
`http://localhost:5173`. Sin ellas todo funciona menos subir y ver archivos.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build en local |
| `npm run lint` | ESLint |
| `npm run format` | Prettier sobre `src` |
| `npm test` · `npm run test:watch` | Pruebas una vez · en modo observación |
| `npm run api:types` | Regenera `src/api/schema.d.ts` desde el OpenAPI de la API (tiene que estar corriendo) |
| `node scripts/i18n-missing.mjs [carpeta]` | Lista textos en español que parecen no pasar por la traducción |

### Atajos de teclado

| Tecla | Dónde | Acción |
|---|---|---|
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> | En toda la app | Paleta de búsqueda y comandos |
| <kbd>C</kbd> | Tareas · Bugs · Historias | Nueva tarea · reportar bug · nueva historia (PM) |
| <kbd>/</kbd> | Tareas | Ir al buscador de los filtros |
| <kbd>J</kbd> / <kbd>K</kbd> | Historias | Bajar / subir por la lista |
| <kbd>P</kbd> | Historias · Daily | Partir en tareas la historia seleccionada · entrar o salir del modo presentación |
| <kbd>←</kbd> <kbd>→</kbd> · <kbd>Esc</kbd> | Daily en presentación | Cambiar de persona · salir |

## Arquitectura

```
Componente → hooks de TanStack Query (features/*/hooks.js) → servicios (features/*/api.js) → cliente axios → API
                     ↑
         RealtimeSync (avisos SSE) vuelve a pedir las consultas que cambiaron
```

- **Datos:** los componentes no llaman a axios. Usan los hooks de su feature, que definen las *query keys*
  (`src/api/queryKeys.js`) y qué se invalida después de cada cambio. Muchas acciones se ven al instante
  (actualización optimista) y se deshacen si la API falla.
- **Estado:** el del servidor vive en TanStack Query. Zustand solo guarda la sesión, las preferencias y el diseño
  (menú abierto, orden del menú).
- **URL:** es la fuente de verdad de lo navegable: workspace, proyecto, tarea abierta, vista, filtros, orden y página.
  Un enlace copiado abre exactamente lo mismo.

```
src/
├── app/            router, providers, SessionGate (recupera la sesión al cargar) y guards de rutas
├── api/            cliente axios, sesión y refresh, canal de tiempo real, queryClient, query keys y tipos de la API
├── features/
│   ├── auth/  profile/  workspaces/  projects/
│   ├── issues/         lista, Kanban, Bugs, detalle, filtros y selectores de propiedades
│   ├── stories/        historias de usuario y «Partir en tareas»
│   ├── planning/       ciclos, módulos, cierre de ciclo y hoja de ruta
│   ├── retro/  daily/  stats/  reports/  my-work/  activity/
│   ├── github/         integración: workspace, cuenta, ajustes del proyecto, PRs y Actions
│   ├── imports/        asistente de importación
│   ├── realtime/       RealtimeSync y las reglas de qué se vuelve a pedir
│   ├── editor/         editor TipTap, menciones, tablas e imágenes pegadas
│   ├── comments/  checklist/  relations/  files/  templates/  saved-views/
│   └── notifications/  mentions/  search/
├── components/     ui/ (shadcn) y common/ (avatar, chips, estados, diálogos de confirmación, banner sin conexión…)
├── layouts/        layout con sidebar, encabezado de página, orden del menú, layout de autenticación
├── hooks/          atajos, tema, media queries, debounce, ancho de elementos…
├── lib/            errores de la API, permisos, fechas, foco accesible, Kanban, códigos de tarea, animaciones
├── i18n/           traducción (index.js) y diccionario en inglés (en/)
└── stores/  styles/  test/
```

**Permisos en la interfaz:** `lib/permissions.js` lee los permisos del rol que trae el workspace y la interfaz oculta
o desactiva lo que la persona no puede hacer. La API lo vuelve a validar siempre: la interfaz solo evita botones que
fallarían.

## Sesión

- **Dónde vive cada token:** el **access token** (15 min) solo en memoria. El **refresh token** (7 días) en
  `localStorage`, para mantener la sesión al recargar.
- **Riesgo aceptado:** la API devuelve el refresh token en el cuerpo, no en una cookie httpOnly, así que un XSS podría
  leerlo. Lo compensa la CSP estricta (ver [Seguridad](#seguridad)).
- **Un solo refresh a la vez:** el backend rota el refresh token. Si se reutiliza uno ya rotado, cierra todas las
  sesiones. Por eso el refresh es de un solo vuelo (`src/api/session.js`): las peticiones que reciben 401 esperan la
  misma promesa, y entre pestañas se coordina con la Web Locks API.
- **Sesión vencida:** si el refresh ya no sirve, la app lleva al login con «Tu sesión expiró», sin avisos de error.
- **Idioma de la API:** cada petición lleva `Accept-Language`, así los errores también llegan en el idioma elegido.

## Tiempo real

`api/realtime.js` abre una conexión **Server-Sent Events** (`GET /api/v1/events`) por pestaña.
- **Conexión:** usa `fetch` en streaming porque `EventSource` no permite mandar el token. Reconecta con espera
  creciente y renueva el token si vence.
- **Pestaña oculta:** si está oculta más de un minuto, cierra la conexión; al volver, reconecta y se pone al día.
- **Qué hace con cada aviso:** `features/realtime/RealtimeSync.jsx` (montado en `RequireAuth`) lo recibe y
  `refreshRules.js` decide qué consultas dependen de ese cambio. Solo vuelve a pedir las que están en pantalla; las
  demás quedan marcadas como viejas.
- **Sin eco:** cada pestaña manda su `X-Client-Id` (`api/clientId.js`), así no recibe el aviso de sus propios
  cambios, que ya aplicó.

## Kanban

1. **Al soltar una tarjeta** se envían sus vecinas en la columna de destino a `PATCH /issues/{id}/move`:
   `afterIssueId` es la de arriba y `beforeIssueId` la de abajo.
2. **Mientras responde la API,** la tarjeta se mueve al instante con el mismo cálculo de `sortOrder` del backend. Si
   la API falla, vuelve a su lugar.
3. **En un tablero filtrado** solo se manda la vecina visible, y el backend ubica la tarjeta respecto a la siguiente
   real de la columna.

El tablero carga hasta 200 tareas; si hay más, pide usar filtros. Al arrastrar, lo que pasa se anuncia a los lectores
de pantalla (`lib/dndAnnouncements.js`).

## Editor y archivos

**Editor:** descripciones, comentarios, «Nueva tarea» y plantillas usan el mismo editor TipTap, que guarda
**Markdown**. Trae tablas, bloques de código, listas de tareas y @menciones.
- **Imágenes pegadas o arrastradas:**
  1. Se suben directo a Cloudflare R2 con una URL firmada.
  2. Quedan en el texto como `![nombre](/files/<id>)`.
  3. Al mostrarlas se piden sus URLs en lote (`GET /files/urls`).
- **Ediciones simultáneas:** si otra persona cambió la descripción mientras se editaba, la API responde 409 con la
  versión actual y la app avisa del conflicto.

**Adjuntos** (`features/files`):
- **Antes de subir:** se valida el tipo y el tamaño, igual que el backend: 5 MB las imágenes, 10 MB lo demás.
- **Subida:** una cola sube en paralelo y muestra el avance.
- **Al verlos:** se abren en un visor con zoom. Si una URL firmada vence, se renueva una vez; si el archivo ya no
  existe, se muestra un reemplazo en vez de reintentar sin fin.

## Idiomas

La interfaz está en **español e inglés** (`src/i18n`).
- **Funciones:** el texto en español es la clave.
  - `t('Nueva tarea')` devuelve el texto en el idioma elegido.
  - `tn()` maneja plurales y `tc()` la misma palabra con otra traducción según el contexto.
  - `tx()` arma frases con elementos de React adentro.
  - `stateName()` muestra los estados de fábrica (Backlog, Todo…) en el idioma elegido; los renombrados, tal cual.
- **Diccionario:** el inglés está repartido por áreas en `src/i18n/en/`. La prueba `i18n/coverage.test.js` falla si
  un texto del código no tiene traducción.
- **Cambiar de idioma:** se hace desde el menú de la persona. La página se recarga, con el logo de carga ya puesto
  para que no haya salto.
- **Fechas:** date-fns e `Intl` usan el idioma elegido.

## Responsive y accesibilidad

- **Anchos:** se revisa a **390 px** (teléfono), **820 px** (tablet) y **1280 px o más** (computador).
  - En teléfono el menú es un *drawer*.
  - Entre 768 y 1023 px queda como barra de íconos.
  - En computador se ve completo.
- **Cómo se adapta:** los componentes usan **container queries** (`@container`, `@3xl:`…), así una tarjeta se adapta
  al espacio que tiene y no al ancho de la ventana. Las grillas parten de una columna.
- **Accesibilidad:**
  - el foco vuelve a su sitio al cerrar paneles y diálogos;
  - se puede navegar por teclado y hay atajos;
  - el arrastre se anuncia a los lectores de pantalla;
  - las animaciones respetan `prefers-reduced-motion`.
- **Tema:** claro, oscuro o el del sistema. Se aplica antes del primer render (`public/boot-theme.js`) para que no
  parpadee.

## Seguridad

La imagen de producción sirve la app con una **Content-Security-Policy** estricta (`nginx/security-headers.inc`):
- **Scripts:** solo los de la propia app; ninguno en línea ni de otro sitio. Por eso el tema y el logo de carga van
  en `public/boot-*.js` y no dentro de `index.html`.
- **Conexiones:** solo a la API (mismo dominio) y a R2.
- **Imágenes:** de la app, de R2 y las fotos de GitHub.
- **Iframes:** nadie puede incrustar TaskFlow en uno (`frame-ancestors 'none'`).
- **Otras cabeceras:** `nosniff`, `X-Frame-Options: DENY`, HSTS, `Referrer-Policy`, `Permissions-Policy` y
  `Cross-Origin-Opener-Policy`.

En el código:
- **Contenido de usuarios:** el Markdown nunca se inserta como HTML crudo (no hay `dangerouslySetInnerHTML`). Se
  convierte en un documento y se dibuja con elementos de React.
- **Enlaces:** solo pasan `http(s)`, `mailto` y las rutas de la app (`safeHref`); un `javascript:` queda como texto.
  Los enlaces externos abren con `noopener noreferrer`.
- **Archivos:** se validan antes de subir. El backend vuelve a validar todo y además revisa los primeros bytes de cada
  archivo.

## Pruebas

```bash
npm test
```

Son **939 pruebas** con Vitest y Testing Library, junto al código que prueban (`*.test.js` / `*.test.jsx`). Cubren:
- hooks y sus invalidaciones;
- componentes con interacción;
- reglas de negocio de la interfaz: Kanban, permisos, fechas, la ronda de la daily, filtros;
- el cliente y la sesión;
- el parser de tiempo real;
- que todo texto tenga traducción.

`src/test/setup.js` prepara jsdom y simula lo que no existe en el entorno de pruebas (por ejemplo, la conexión de
tiempo real).

## Docker y despliegue

**El `Dockerfile`:**
- construye la app con Node 22 (`VITE_API_URL=/api/v1`);
- la sirve con **nginx 1.27 sin privilegios** en el puerto **5446**.

**Qué hace nginx** (`nginx/default.conf.template`):
- **Assets:** caché larga para `/assets` (llevan hash en el nombre). Las demás rutas devuelven `index.html` para que
  las resuelva React Router.
- **API:** reenvía `/api` a la API (`BACKEND_URL`), así el navegador y la API comparten dominio y no hace falta CORS.
- **Tiempo real:** `/api/v1/events` pasa sin búfer, con una hora de espera.
- **Además:** gzip, cabeceras de seguridad y subidas de hasta 20 MB (para la importación).

```bash
docker build -t taskflow-frontend .
docker run -p 5446:5446 -e BACKEND_URL=http://<api>:8080 taskflow-frontend
```

**En Dokploy** este contenedor es el único con dominio (`dev.inmero.co`, puerto 5446), y la API queda interna. Los
pasos completos están en
[`DESPLIEGUE.md`](https://github.com/Server-IA/Task_backend/blob/main/DESPLIEGUE.md) del backend.

## Convenciones

- **Ramas:** el trabajo diario va a `develop`; `main` solo recibe pull requests desde `develop`, y lo que llega a
  `main` es lo que se despliega.
- **Código:** en inglés. Los textos de la interfaz se escriben en español y pasan por `t()`.
- **Nombres:** componentes en `PascalCase.jsx`, hooks `useAlgo` e imports con el alias `@/`.
- **Diseño:** el estilo de la app se mantiene en todas las pantallas nuevas. En la interfaz se dice «Tareas», no
  «Issues».
- **Antes de subir:** `npm run lint` y `npm test` sin errores.
