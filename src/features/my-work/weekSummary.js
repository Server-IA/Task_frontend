/**
 * «// tu semana» de Mi trabajo (funciones puras): los contadores salen del backend (`byState`) y se nombran
 * con el nombre de cada estado, nunca con nombres escritos aquí.
 */

/** @typedef {import('@/api/types').StateCount} StateCount */

/**
 * Nombre de un estado dentro de una frase («2 en curso»): en minúsculas, salvo siglas («QA»).
 * @param {string | undefined} name
 */
export function stateLabel(name) {
  const text = (name ?? '').trim()
  if (!text) return 'sin estado'
  return text === text.toLocaleUpperCase('es') ? text : text.toLocaleLowerCase('es')
}

/**
 * Estados del grupo «en curso» (STARTED) con tareas, en el orden del backend: «2 en curso · 1 en revisión».
 * @param {StateCount[] | undefined} byState
 * @returns {{ key: string, count: number, label: string, color?: string }[]}
 */
export function startedCounts(byState) {
  return (byState ?? [])
    .filter((state) => state.group === 'STARTED' && (state.count ?? 0) > 0)
    .map((state) => ({ key: `${state.group}:${state.name}`, count: state.count, label: stateLabel(state.name), color: state.color }))
}
