import { PRIORITY_LABELS, SAVED_VIEW_PARAM, SORT_OPTIONS } from '@/features/issues/constants'

/**
 * Vistas guardadas: los filtros de la lista de tareas (los mismos parámetros de la URL), la vista
 * (lista o tablero) y el orden. Aquí se comparan con lo que hay en la URL y se aplican.
 */

/** @typedef {import('@/api/types').SavedViewFilters} SavedViewFilters */

export const DEFAULT_SORT = 'sortOrder,asc'
export const FILTER_KEYS = ['state', 'priority', 'assignee', 'label']

/**
 * Lo que hay en pantalla, con la forma que guarda el backend.
 * @param {{ filters: { state: string[], priority: string[], assignee: string[], label: string[], search: string },
 *           view: string, sort: string }} current
 * @returns {SavedViewFilters}
 */
export function toViewFilters({ filters, view, sort }) {
  return {
    state: [...filters.state],
    priority: [...filters.priority],
    assignee: [...filters.assignee],
    label: [...filters.label],
    search: filters.search?.trim() || null,
    view,
    sort: sort || DEFAULT_SORT,
  }
}

/**
 * Qué partes cambiaron respecto de la vista guardada (vacío si coinciden). El orden solo cuenta en la lista:
 * el tablero siempre usa el orden manual.
 * @param {SavedViewFilters} saved
 * @param {SavedViewFilters} current
 * @returns {('state' | 'priority' | 'assignee' | 'label' | 'search' | 'view' | 'sort')[]}
 */
export function diffViewFilters(saved = {}, current = {}) {
  const sameSet = (a = [], b = []) => {
    const left = new Set(a)
    const right = new Set(b)
    return left.size === right.size && [...left].every((value) => right.has(value))
  }
  const changed = FILTER_KEYS.filter((key) => !sameSet(saved[key], current[key]))
  if ((saved.search?.trim() || '') !== (current.search?.trim() || '')) changed.push('search')
  if (saved.view && current.view && saved.view !== current.view) changed.push('view')
  const view = current.view ?? saved.view
  if (view !== 'board' && (saved.sort || DEFAULT_SORT) !== (current.sort || DEFAULT_SORT)) changed.push('sort')
  return changed
}

/**
 * Parámetros de la URL con la vista aplicada: reemplaza filtros, búsqueda, vista y orden; conserva lo demás
 * (por ejemplo la tarea abierta en el panel).
 * @param {URLSearchParams} previous
 * @param {{ id: string, filters?: SavedViewFilters }} savedView
 */
export function applyViewToParams(previous, savedView) {
  const next = new URLSearchParams(previous)
  for (const key of [...FILTER_KEYS, 'search', 'sort', 'page']) next.delete(key)
  const filters = savedView.filters ?? {}
  for (const key of FILTER_KEYS) for (const value of filters[key] ?? []) next.append(key, value)
  if (filters.search?.trim()) next.set('search', filters.search.trim())
  if (filters.view === 'list' || filters.view === 'board') next.set('view', filters.view)
  if (filters.sort && filters.sort !== DEFAULT_SORT) next.set('sort', filters.sort)
  next.set(SAVED_VIEW_PARAM, savedView.id)
  return next
}

/** Parámetros de la URL sin vista guardada, filtros, búsqueda ni orden («Todas»). */
export function clearViewParams(previous) {
  const next = new URLSearchParams(previous)
  for (const key of [...FILTER_KEYS, 'search', 'sort', 'page', SAVED_VIEW_PARAM]) next.delete(key)
  return next
}

/**
 * Resumen legible para «Se guarda con» (estado, prioridad, asignado, etiqueta, búsqueda, vista y orden).
 * @param {SavedViewFilters} filters
 * @param {{ states: { id: string, name: string }[], users: { id: string, fullName: string }[],
 *           labels: { id: string, name: string }[] }} meta
 * @returns {{ key: string, value: string }[]}
 */
export function summarizeViewFilters(filters, meta) {
  const names = (ids = [], list, getName) => {
    const byId = new Map(list.map((item) => [item.id, getName(item)]))
    return ids.map((id) => byId.get(id)).filter(Boolean).join(', ')
  }
  const rows = [
    ['estado', names(filters.state, meta.states, (state) => state.name)],
    ['prioridad', (filters.priority ?? []).map((value) => PRIORITY_LABELS[value] ?? value).join(', ')],
    ['asignado', names(filters.assignee, meta.users, (user) => user.fullName)],
    ['etiqueta', names(filters.label, meta.labels, (label) => label.name)],
    ['búsqueda', filters.search ? `«${filters.search}»` : ''],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => ({ key, value }))
  if (rows.length === 0) rows.push({ key: 'filtros', value: 'ninguno (todas las tareas)' })
  rows.push({ key: 'vista', value: filters.view === 'board' ? 'tablero' : 'lista' })
  if (filters.view !== 'board') {
    const sort = SORT_OPTIONS.find((option) => option.value === (filters.sort || DEFAULT_SORT))
    rows.push({ key: 'orden', value: (sort?.label ?? filters.sort).toLowerCase() })
  }
  return rows
}

/** Quién puede cambiar o borrar una vista: las compartidas, el project manager; las personales, su dueño. */
export function canEditView(view, isManager) {
  return view.shared ? isManager : Boolean(view.mine)
}
