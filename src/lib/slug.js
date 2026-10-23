/** Mismas reglas que el backend (SlugUtils). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Slugs que chocan con rutas del frontend; el backend también los rechaza. */
export const RESERVED_SLUGS = new Set([
  'login',
  'register',
  'verify-email',
  'forgot-password',
  'reset-password',
  'invitations',
  'onboarding',
  'profile',
  'notifications',
  'settings',
  'api',
  'admin',
  'assets',
  'new',
])

/** «Equipo Diseño» → «equipo-diseno» (para sugerir el slug mientras se escribe el nombre). */
export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '')
}
