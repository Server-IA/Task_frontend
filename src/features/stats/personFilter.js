/**
 * Filtro «+ persona» de las estadísticas (funciones puras): las personas viven en la URL como
 * `?assignee=<id>&assignee=<id>` y se mandan igual al backend, que limita todas las métricas a sus tareas.
 */

/** Id con forma de UUID (el backend responde 400 a un `assignee` que no lo es). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Personas elegidas en la URL: solo ids válidos, sin repetir y en el orden en que se eligieron.
 * @param {URLSearchParams} searchParams
 * @returns {string[]}
 */
export function assigneesFromParams(searchParams) {
  return [...new Set(searchParams.getAll('assignee').filter((id) => UUID.test(id)))]
}

/**
 * Parámetros con esas personas (reemplaza las anteriores y conserva el resto, como `weeks`).
 * @param {URLSearchParams} searchParams
 * @param {string[]} ids
 */
export function withAssignees(searchParams, ids) {
  const next = new URLSearchParams(searchParams)
  next.delete('assignee')
  for (const id of ids) next.append('assignee', id)
  return next
}

/** Agrega la persona si no estaba o la quita si estaba. */
export function toggleAssignee(ids, id) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

/** Clave de la consulta: el orden en que se eligieron no cambia los datos. */
export const assigneesKey = (ids) => [...ids].sort()

/**
 * Datos de cada persona elegida para mostrarla: de los miembros del proyecto o, si ya no es miembro, de la
 * carga que devuelve el backend (que con el filtro trae solo a esas personas).
 * @param {string[]} ids
 * @param {import('@/api/types').UserSummary[]} users
 * @returns {import('@/api/types').UserSummary[]}
 */
export function resolveAssignees(ids, users) {
  const byId = new Map((users ?? []).filter(Boolean).map((user) => [user.id, user]))
  return ids.map((id) => byId.get(id) ?? { id, fullName: 'Persona', email: '', avatarUrl: null })
}
