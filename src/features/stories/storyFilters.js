/**
 * Filtros de «Historias» (en el cliente: el listado ya trae todas las historias del proyecto).
 * @typedef {{ search: string, cycle: string[], module: string[], priority: string[], assignee: string[] }} StoryFilters
 */

/**
 * Filas que pasan los filtros. Búsqueda en el título o el código; ciclo y módulo aceptan «none» (sin ciclo / sin
 * módulo); «asignado» mira las personas de sus tareas y los asignados de la propia historia.
 * @param {import('@/api/types').StoryRow[]} rows
 * @param {StoryFilters} filters
 */
export function filterStories(rows, filters) {
  const search = filters.search?.trim().toLowerCase() ?? ''
  return rows.filter(({ story, people }) => {
    if (search && !story.title.toLowerCase().includes(search) && !story.code.toLowerCase().includes(search)) return false
    if (filters.cycle?.length && !filters.cycle.includes(story.cycle?.id ?? 'none')) return false
    if (filters.module?.length) {
      const ids = (story.modules ?? []).map((module) => module.id)
      const matches = ids.length === 0 ? filters.module.includes('none') : ids.some((id) => filters.module.includes(id))
      if (!matches) return false
    }
    if (filters.priority?.length && !filters.priority.includes(story.priority ?? 'NONE')) return false
    if (filters.assignee?.length) {
      const ids = new Set([...(people ?? []), ...(story.assignees ?? [])].map((user) => user.id))
      if (!filters.assignee.some((id) => ids.has(id))) return false
    }
    return true
  })
}

/** Si hay algún filtro puesto (la búsqueda cuenta si tiene letras). */
export function hasStoryFilters(filters) {
  return Boolean(
    filters.search?.trim() ||
      filters.cycle?.length ||
      filters.module?.length ||
      filters.priority?.length ||
      filters.assignee?.length,
  )
}
