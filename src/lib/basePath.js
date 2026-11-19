/**
 * La subruta donde vive la app (`/taskflow` en producción, vacía en desarrollo). Sale de la `base` de Vite, que se
 * fija al compilar con `BASE_PATH` (ver vite.config.js y el Dockerfile). Las rutas de React Router van sin ella: el
 * router la agrega y la quita solo; esto es para lo que sale de `window.location` o se arma a mano.
 */
export const BASE_PATH = withoutTrailingSlash(import.meta.env.BASE_URL ?? '/')

function withoutTrailingSlash(base) {
  return base.endsWith('/') ? base.slice(0, -1) : base
}

/**
 * La ruta de la app a partir del `pathname` del navegador: `/taskflow/equipo/projects` → `/equipo/projects`.
 * @param {string} pathname
 * @param {string} [base]
 */
export function appPath(pathname, base = BASE_PATH) {
  if (!base) return pathname
  if (pathname === base) return '/'
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname
}

/**
 * La dirección completa de una ruta de la app, para copiarla o compartirla: `/equipo/…` → `https://host/taskflow/equipo/…`.
 * @param {string} path
 */
export function appUrl(path) {
  return `${window.location.origin}${BASE_PATH}${path}`
}
