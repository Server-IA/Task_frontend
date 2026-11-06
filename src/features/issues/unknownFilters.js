/**
 * Filtros que apuntan a algo que ya no existe (una etiqueta, un estado, un ciclo o un módulo borrados, alguien que
 * dejó el proyecto): un enlace viejo o una vista guardada los traen y la lista quedaría vacía con una pastilla
 * «etiqueta: otro». Se quitan de los filtros activos sin avisar con un error.
 */

/** Filtros de ids, con lo que los nombra en el aviso de una vista guardada. */
export const ID_FILTERS = {
  state: 'estado',
  assignee: 'persona asignada',
  label: 'etiqueta',
  cycle: 'ciclo',
  module: 'módulo',
}

/**
 * Ids que existen para cada filtro. Solo trae las listas ya cargadas: una que todavía no llegó (o falló) no se usa
 * para descartar nada.
 * @param {{ states?: { id: string }[], users?: { id: string }[], labels?: { id: string }[],
 *           cycles?: { id: string }[], modules?: { id: string }[] }} lists `undefined` = sin cargar
 * @returns {Partial<Record<keyof typeof ID_FILTERS, Set<string>>>}
 */
export function knownFilterIds({ states, users, labels, cycles, modules }) {
  const known = {}
  const add = (key, list) => {
    if (Array.isArray(list)) known[key] = new Set(list.map((item) => item.id))
  }
  add('state', states)
  add('assignee', users)
  add('label', labels)
  add('cycle', cycles)
  add('module', modules)
  return known
}

/**
 * Los parámetros de la URL sin los ids desconocidos, o null si no había ninguno (no hay nada que cambiar).
 * @param {URLSearchParams} params
 * @param {ReturnType<typeof knownFilterIds>} known
 */
export function withoutUnknownParams(params, known) {
  let dropped = false
  const next = new URLSearchParams(params)
  for (const [key, ids] of Object.entries(known)) {
    const values = next.getAll(key)
    const kept = values.filter((value) => ids.has(value))
    if (kept.length === values.length) continue
    dropped = true
    next.delete(key)
    kept.forEach((value) => next.append(key, value))
  }
  return dropped ? next : null
}

/**
 * Los filtros de una vista guardada sin los ids desconocidos, y qué filtros quedaron vacíos por eso (tenían valores
 * y ninguno existe ya: la vista se ve sin ese filtro).
 * @param {import('@/api/types').SavedViewFilters} [filters]
 * @param {ReturnType<typeof knownFilterIds>} known
 * @returns {{ filters: import('@/api/types').SavedViewFilters, emptied: string[] }}
 */
export function withoutUnknownViewFilters(filters = {}, known) {
  const clean = { ...filters }
  const emptied = []
  for (const [key, ids] of Object.entries(known)) {
    const value = filters[key]
    if (Array.isArray(value)) {
      const kept = value.filter((id) => ids.has(id))
      if (kept.length === value.length) continue
      clean[key] = kept
      if (kept.length === 0) emptied.push(key)
    } else if (value && !ids.has(value)) {
      clean[key] = null
      emptied.push(key)
    }
  }
  return { filters: clean, emptied }
}

/**
 * Aviso discreto para una vista guardada cuyo filtro ya no existe: «Esta vista filtraba por una etiqueta que ya no
 * existe». Null si no hace falta.
 * @param {string[]} emptied
 */
export function missingFiltersText(emptied) {
  if (emptied.length === 0) return null
  if (emptied.length === 1) {
    const noun = ID_FILTERS[emptied[0]]
    const article = noun === 'persona asignada' || noun === 'etiqueta' ? 'una' : 'un'
    return `Esta vista filtraba por ${article} ${noun} que ya no existe`
  }
  const nouns = emptied.map((key) => ID_FILTERS[key])
  return `Esta vista filtraba por ${nouns.slice(0, -1).join(', ')} y ${nouns.at(-1)} que ya no existen`
}
