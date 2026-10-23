# TaskFlow — Frontend

SPA de **TaskFlow**, un gestor de tareas para equipos inspirado en [Plane](https://plane.so) (solo como
referencia visual y funcional; no se copia código). Proyecto de prácticas universitarias.

Consume la API de [`Task_backend`](https://github.com/Server-IA/Task_backend) (ver su `README.md`).

## Funcionalidades

- **Cuenta:** registro con verificación de correo, inicio de sesión, recuperar y cambiar contraseña, perfil.
- **Workspaces:** crear, cambiar entre ellos, miembros con roles (dueño, administrador, miembro) e
  invitaciones por correo con una página pública para aceptarlas.
- **Proyectos:** estados (columnas del Kanban) con color, grupo y orden, etiquetas y miembros.
- **Issues:** vista de lista y **Kanban con arrastrar y soltar**, filtros (estado, prioridad, asignado,
  etiqueta, búsqueda por título o código) guardados en la URL, panel lateral de detalle, sub-issues,
  issue padre, fechas y atajo **C** para crear.
- **Colaboración:** comentarios e historial legible en una sola línea de tiempo; notificaciones in-app
  con contador.
- **Planificación:** ciclos (sprints) y módulos con barra de avance.
- Tema **claro / oscuro / sistema** y diseño responsive (la sidebar pasa a drawer en móvil).

## Stack

| Área | Tecnología |
|---|---|
| Base | Vite + React 19 (JavaScript) |
| Estilos y UI | Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react |
| Datos del servidor | TanStack Query + axios |
| Rutas | React Router |
| Formularios | react-hook-form + zod (mismas reglas que el backend) |
| Kanban | @dnd-kit |
| Otros | Sonner (toasts), Zustand (sesión y preferencias), date-fns (fechas en español) |
| Pruebas | Vitest + Testing Library |

## Cómo levantarlo

Requisitos: **Node.js 22+** y el backend corriendo en `http://localhost:8080`.

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
```

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API (por defecto `http://localhost:8080/api/v1`) |
| `VITE_QUERY_DEVTOOLS` | `true` para ver el panel de React Query Devtools |

> En local, si el backend no tiene `RESEND_API_KEY`, los enlaces de los correos (verificación,
> restablecer contraseña, invitación) aparecen en el log de la API.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Pruebas (Vitest) |
| `npm run api:types` | Regenera `src/api/schema.d.ts` desde el OpenAPI del backend (debe estar corriendo) |

## Arquitectura

```
Componente → hooks de TanStack Query (features/*/hooks.js) → servicios (features/*/api.js) → cliente axios → API
```

- Los componentes no llaman a axios: usan los hooks de su feature, que definen las *query keys*
  (`src/api/queryKeys.js`) y qué se invalida después de cada cambio.
- El estado del servidor vive en TanStack Query; Zustand solo guarda la sesión y las preferencias.
- La URL es la fuente de verdad de lo navegable: workspace, proyecto, issue abierto (`?issue=`),
  vista (`?view=`), filtros, orden y página.

```
src/
├── app/            router, providers, guards de rutas y recuperación de la sesión
├── api/            cliente axios, sesión (refresh), queryClient, query keys y tipos de la API
├── features/
│   ├── auth/       login, registro, verificación, recuperar contraseña
│   ├── profile/
│   ├── workspaces/ onboarding, selector, ajustes, miembros, invitaciones
│   ├── projects/   lista, ajustes, estados, etiquetas, miembros
│   ├── issues/     lista, Kanban, detalle, filtros, selectores de propiedades
│   ├── comments/   comentarios e historial
│   ├── notifications/
│   └── planning/   ciclos y módulos
├── components/     ui/ (shadcn) y common/ (avatar, íconos de estado, diálogos…)
├── layouts/        layout con sidebar, encabezado de página, layout de autenticación
├── hooks/  lib/  stores/  styles/
```

### Sesión y refresh token

- El **access token** (15 min) vive solo en memoria; el **refresh token** (7 días) en `localStorage`
  para mantener la sesión al recargar. Como el backend lo devuelve en el cuerpo y no en una cookie
  httpOnly, un XSS podría leerlo: es el compromiso aceptado para el proyecto.
- El backend **rota** el refresh token y, si alguien reutiliza uno ya usado, cierra todas las sesiones.
  Por eso el refresh es de **un solo vuelo** (`src/api/session.js`): las peticiones con 401 esperan la
  misma promesa, y entre pestañas se serializa con la Web Locks API.

### Kanban

Al soltar una tarjeta se envían sus vecinas en la columna destino (`afterIssueId` = la de arriba,
`beforeIssueId` = la de abajo) a `PATCH /issues/{id}/move`. La tarjeta se mueve al instante
(actualización optimista con el mismo cálculo de `sortOrder` del backend) y, si la API falla, vuelve a
su lugar. El tablero carga hasta 200 issues; si hay más, muestra un aviso para usar filtros.

### Autocompletado de la API

`src/api/schema.d.ts` se genera con `npm run api:types` y `src/api/types.js` expone alias JSDoc
(`IssueResponse`, `ProjectResponse`…). Los servicios los usan en comentarios, así VS Code sugiere los
campos reales de cada respuesta sin dejar de ser JavaScript.

## Docker

El `Dockerfile` construye la app con Node y la sirve con nginx (con *fallback* a `index.html` para
las rutas del SPA). Queda listo para Dokploy:

```bash
docker build --build-arg VITE_API_URL=https://api.ejemplo.com/api/v1 -t taskflow-frontend .
```

## Convenciones

- Ramas `main`, `develop` y `feature/<nombre>`; commits con
  [Conventional Commits](https://www.conventionalcommits.org/es/).
- Componentes en `PascalCase.jsx`; hooks `useAlgo`; imports con alias `@/`.
- Textos de la interfaz en español; código en inglés.
