# TaskFlow — Frontend

SPA de **TaskFlow**, una aplicación de gestión de proyectos ágiles hecha a la medida de equipos de pasantías (al
estilo de Plane o Jira, sin copiar código de ninguno). Proyecto de prácticas universitarias.

Consume la API de [`Task_backend`](https://github.com/Server-IA/Task_backend); su `README.md` documenta todos los
endpoints. Está pensada para navegador de escritorio.

## Funcionalidades

- **Roles**: project manager y miembro; la interfaz oculta o desactiva lo que el rol no puede hacer (el backend lo
  vuelve a validar).
- **Cuenta**: registro con verificación de correo, inicio de sesión, recuperar y cambiar la contraseña, perfil con
  foto recortada en el navegador.
- **Workspaces**: onboarding, invitaciones por correo con página pública para aceptarlas, miembros, roles y uso del
  almacenamiento.
- **Proyectos**: identificador y color, estados (columnas del Kanban) con grupo y orden, etiquetas, plantillas de
  tarea y miembros.
- **Tareas**: tipos Historia, Tarea y Bug; lista, **Kanban con arrastrar y soltar** y carriles por historia; vista de
  Bugs; filtros y orden en la URL; vistas guardadas personales o compartidas; panel lateral o vista completa.
- **Detalle de la tarea**: descripción con editor enriquecido, criterios de aceptación (lista simple o Gherkin),
  checklist, dependencias, subtareas, adjuntos con visor, comentarios con @menciones e historial.
- **Historias de usuario**: vista del PM, «Partir en tareas», progreso automático, cierre y reapertura.
- **Planeación**: ciclos con cierre guiado y retrospectiva (notas, votos, acciones), módulos, hoja de ruta y daily
  standup con modo presentación.
- **Seguimiento**: estadísticas (tiempo de ciclo, throughput, burndown, carga por persona), «Mi trabajo», actividad
  del workspace y bandeja de notificaciones con menciones.
- **Búsqueda y atajos**: paleta de comandos con <kbd>Ctrl</kbd> + <kbd>K</kbd> y atajos de teclado.
- Tema **claro / oscuro / sistema**, foco accesible al abrir y cerrar paneles y anuncios para lectores de pantalla
  al arrastrar tarjetas.

## Stack

| Área | Tecnología |
|---|---|
| Base | Vite 8 + React 19 (JavaScript) |
| Estilos y UI | Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react · tipografías Geist y Bricolage Grotesque |
| Datos del servidor | TanStack Query 5 + axios |
| Rutas | React Router 7 |
| Formularios | react-hook-form + zod (mismas reglas que el backend) |
| Editor | TipTap 3 (WYSIWYG que guarda Markdown) + marked |
| Kanban y listas | @dnd-kit |
| Otros | Sonner (toasts), Zustand (sesión y preferencias), cmdk (paleta), date-fns y react-day-picker (fechas en español) |
| Pruebas | Vitest + Testing Library (más de 700 pruebas) |

## Cómo levantarlo

Requisitos: **Node.js 22+** y el backend corriendo en `http://localhost:8080`.

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
```

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API. En local `http://localhost:8080/api/v1`; en producción `/api/v1` (mismo origen) |
| `VITE_QUERY_DEVTOOLS` | `true` para ver el panel de React Query Devtools |

> **Correos en local:** con el backend en `MAIL_PROVIDER=smtp`, todos los correos (verificación, restablecer
> contraseña, invitaciones, aviso de inicio de sesión) llegan a **Mailpit** en http://localhost:8025, sea cual sea el
> destinatario. Puedes registrarte con cualquier correo de prueba y abrir los enlaces desde ahí.

> **Archivos en local:** subir y ver archivos necesita las credenciales de R2 en el `.env` del backend, y el CORS del
> bucket debe permitir `http://localhost:5173`. Sin ellas la app funciona, pero las subidas responden 503.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | ESLint |
| `npm run format` | Prettier sobre `src` |
| `npm test` | Pruebas (Vitest) |
| `npm run api:types` | Regenera `src/api/schema.d.ts` desde el OpenAPI del backend (debe estar corriendo) |

### Atajos de teclado

| Tecla | Acción |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Paleta de búsqueda y comandos |
| <kbd>C</kbd> | Nueva tarea (en Tareas), reportar bug (en Bugs) o nueva historia (en Historias, PM) |
| <kbd>/</kbd> | Buscar en los filtros de tareas |
| <kbd>I</kbd> · <kbd>H</kbd> · <kbd>Y</kbd> · <kbd>M</kbd> | Ir a Tareas, Historias, Ciclos o Módulos del proyecto |
| <kbd>D</kbd> · <kbd>R</kbd> · <kbd>S</kbd> · <kbd>,</kbd> | Ir a Daily, Hoja de ruta, Estadísticas o Ajustes del proyecto |
| <kbd>J</kbd> / <kbd>K</kbd> | Bajar / subir por la lista de historias |
| <kbd>P</kbd> | Partir en tareas la historia seleccionada (PM) · en la Daily, modo presentación (flechas para cambiar de persona) |

## Arquitectura

```
Componente → hooks de TanStack Query (features/*/hooks.js) → servicios (features/*/api.js) → cliente axios → API
```

- Los componentes no llaman a axios: usan los hooks de su feature, que definen las *query keys*
  (`src/api/queryKeys.js`) y qué se invalida después de cada cambio.
- El estado del servidor vive en TanStack Query; Zustand solo guarda la sesión, las preferencias y el diseño.
- La URL es la fuente de verdad de lo navegable: workspace, proyecto, tarea abierta, vista, filtros, orden y página.

```
src/
├── app/            router, providers, SessionGate (recupera la sesión) y guards de rutas
├── api/            cliente axios, sesión (refresh), queryClient, query keys y tipos de la API
├── features/
│   ├── auth/  profile/  workspaces/  projects/
│   ├── issues/         lista, Kanban, Bugs, detalle, filtros y selectores de propiedades
│   ├── stories/        historias de usuario, partir en tareas
│   ├── planning/       ciclos, módulos, cierre de ciclo y hoja de ruta
│   ├── retro/  daily/  stats/  my-work/  activity/
│   ├── editor/         editor TipTap, menciones, imágenes pegadas
│   ├── comments/  checklist/  relations/  files/  templates/  saved-views/
│   └── notifications/  mentions/  search/
├── components/     ui/ (shadcn) y common/ (avatar, chips, diálogos de confirmación, banner sin conexión…)
├── layouts/        layout con sidebar, encabezado de página, layout de autenticación
├── hooks/          atajos, tema, ancho de elementos, debounce…
├── lib/            errores de la API, permisos, fechas, foco accesible, Kanban, códigos de tarea
└── stores/  styles/  test/
```

### Sesión y refresh token

- El **access token** (15 min) vive solo en memoria; el **refresh token** (7 días) en `localStorage` para mantener la
  sesión al recargar. Como el backend lo devuelve en el cuerpo y no en una cookie httpOnly, un XSS podría leerlo: es
  el compromiso aceptado para el proyecto.
- El backend **rota** el refresh token y, si alguien reutiliza uno ya usado (pasado un margen de 30 s), cierra todas
  las sesiones. Por eso el refresh es de **un solo vuelo** (`src/api/session.js`): las peticiones con 401 esperan la
  misma promesa, y entre pestañas se serializa con la Web Locks API.
- Si el refresh ya no sirve, la app lleva al login con el aviso «Tu sesión expiró», sin toasts de error.

### Kanban

Al soltar una tarjeta se envían sus vecinas en la columna destino (`afterIssueId` = la de arriba, `beforeIssueId` =
la de abajo) a `PATCH /issues/{id}/move`. La tarjeta se mueve al instante (actualización optimista con el mismo
cálculo de `sortOrder` del backend) y, si la API falla, vuelve a su lugar. El tablero carga hasta 200 tareas; si hay
más, muestra un aviso para usar filtros.

### Editor y archivos

Descripciones, comentarios, «Nueva tarea» y plantillas usan el mismo editor TipTap, que guarda **Markdown**. Las
imágenes pegadas o arrastradas se suben directo a Cloudflare R2 con una URL firmada y quedan en el texto como
`![nombre](/files/<id>)`; al mostrarlas se piden las URLs de descarga en lote (`GET /files/urls`). Si otra persona
cambió la descripción mientras se editaba, la API responde 409 con la versión actual y la app avisa del conflicto.

### Autocompletado de la API

`src/api/schema.d.ts` se genera con `npm run api:types` y `src/api/types.js` expone alias JSDoc (`IssueResponse`,
`ProjectResponse`…). Los servicios los usan en comentarios, así VS Code sugiere los campos reales de cada respuesta
sin dejar de ser JavaScript.

## Docker / despliegue

El `Dockerfile` construye la app con Node 22 y la sirve con nginx 1.27 (`nginx.conf`: caché larga para `/assets`,
*fallback* a `index.html` para las rutas de la SPA y gzip). En **Dokploy** este contenedor es el único expuesto
(puerto 5446): sirve la SPA y reenvía `/api` al contenedor del backend, así el navegador y la API comparten origen.

```bash
docker build --build-arg VITE_API_URL=/api/v1 -t taskflow-frontend .
```

## Convenciones

- Ramas: el trabajo diario va a `develop`; `main` solo recibe pull requests desde `develop`. Commits con
  [Conventional Commits](https://www.conventionalcommits.org/es/).
- Componentes en `PascalCase.jsx`; hooks `useAlgo`; imports con alias `@/`.
- Textos de la interfaz en español; código en inglés.
