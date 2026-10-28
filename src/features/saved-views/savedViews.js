import { GROUP_BY_DEFAULT, GROUP_BY_OPTIONS, PRIORITY_LABELS, SAVED_VIEW_PARAM, SORT_OPTIONS } from '@/features/issues/constants'

/**
 * Vistas guardadas: los filtros de la lista de tareas (los mismos parámetros de la URL), la vista
 * (lista o tablero), el orden y la agrupación. Aquí se comparan con lo que hay en la URL y se aplican.
 */

/** @typedef {import('@/api/types').SavedViewFilters} SavedViewFilters */
/** @typedef {import('@/api/types').SavedView} SavedView */

export const DEFAULT_SORT = 'sortOrder,asc'
export const FILTER_KEYS = ['state', 'priority', 'assignee', 'label']
/** Filtros de un solo valor y la agrupación: en la URL con el mismo nombre que en la vista. */
const SINGLE_KEYS = ['cycle', 'module']

/**
 * Lo que hay en pantalla, con la forma que guarda el backend. Ciclo, módulo, «bloqueadas» y la agrupación
 * solo se guardan si están puestos (si no, null).
 * @param {{ filters: { state: string[], priority: string[], assignee: string[], label: string[], search: string,
 *           cycle?: string, module?: string, blocked?: boolean }, view: string, sort: string, groupBy?: string }} current
 * @returns {SavedViewFilters}
 */
export function toViewFilters({ filters, view, sort, groupBy }) {
  return {
    state: [...filters.state],
    priority: [...filters.priority],
    assignee: [...filters.assignee],
    label: [...filters.label],
    search: filters.search?.trim() || null,
    view,
    sort: sort || DEFAULT_SORT,
    cycle: filters.cycle || null,
    module: filters.module || null,
    blocked: filters.blocked ? true : null,
    groupBy: groupBy && groupBy !== GROUP_BY_DEFAULT ? groupBy : null,
  }
}

/**
 * Qué partes cambiaron respecto de la vista guardada (vacío si coinciden). El orden y la agrupación solo cuentan
 * en la lista: el tablero siempre usa el orden manual y va por estado.
 * @param {SavedViewFilters} saved
 * @param {SavedViewFilters} current
 * @returns {('state' | 'priority' | 'assignee' | 'label' | 'search' | 'cycle' | 'module' | 'blocked' | 'view' | 'sort' | 'groupBy')[]}
 */
export function diffViewFilters(saved = {}, current = {}) {
  const sameSet = (a = [], b = []) => {
    const left = new Set(a)
    const right = new Set(b)
    return left.size === right.size && [...left].every((value) => right.has(value))
  }
  const changed = FILTER_KEYS.filter((key) => !sameSet(saved[key], current[key]))
  if ((saved.search?.trim() || '') !== (current.search?.trim() || '')) changed.push('search')
  for (const key of SINGLE_KEYS) if ((saved[key] || null) !== (current[key] || null)) changed.push(key)
  if (Boolean(saved.blocked) !== Boolean(current.blocked)) changed.push('blocked')
  if (saved.view && current.view && saved.view !== current.view) changed.push('view')
  const view = current.view ?? saved.view
  if (view !== 'board') {
    if ((saved.sort || DEFAULT_SORT) !== (current.sort || DEFAULT_SORT)) changed.push('sort')
    if ((saved.groupBy || GROUP_BY_DEFAULT) !== (current.groupBy || GROUP_BY_DEFAULT)) changed.push('groupBy')
  }
  return changed
}

/** Parámetros de la URL que una vista reemplaza al aplicarse (y que «Todas» quita). */
const VIEW_PARAMS = [...FILTER_KEYS, ...SINGLE_KEYS, 'blocked', 'search', 'sort', 'groupBy', 'page']

/**
 * Parámetros de la URL con la vista aplicada: reemplaza filtros, búsqueda, vista, orden y agrupación; conserva lo
 * demás (por ejemplo la tarea abierta en el panel).
 * @param {URLSearchParams} previous
 * @param {{ id: string, filters?: SavedViewFilters }} savedView
 */
export function applyViewToParams(previous, savedView) {
  const next = new URLSearchParams(previous)
  for (const key of VIEW_PARAMS) next.delete(key)
  const filters = savedView.filters ?? {}
  for (const key of FILTER_KEYS) for (const value of filters[key] ?? []) next.append(key, value)
  if (filters.search?.trim()) next.set('search', filters.search.trim())
  for (const key of SINGLE_KEYS) if (filters[key]) next.set(key, filters[key])
  if (filters.blocked) next.set('blocked', 'true')
  if (filters.view === 'list' || filters.view === 'board') next.set('view', filters.view)
  if (filters.sort && filters.sort !== DEFAULT_SORT) next.set('sort', filters.sort)
  if (filters.groupBy && filters.groupBy !== GROUP_BY_DEFAULT) next.set('groupBy', filters.groupBy)
  next.set(SAVED_VIEW_PARAM, savedView.id)
  return next
}

/** Parámetros de la URL sin vista guardada, filtros, búsqueda, orden ni agrupación («Todas»). */
export function clearViewParams(previous) {
  const next = new URLSearchParams(previous)
  for (const key of [...VIEW_PARAMS, SAVED_VIEW_PARAM]) next.delete(key)
  return next
}

/**
 * Resumen legible para «Se guarda con» (filtros, búsqueda, vista, agrupación y orden).
 * @param {SavedViewFilters} filters
 * @param {{ states: { id: string, name: string }[], users: { id: string, fullName: string }[],
 *           labels: { id: string, name: string }[], cycles?: { id: string, name: string }[],
 *           modules?: { id: string, name: string }[] }} meta
 * @returns {{ key: string, value: string }[]}
 */
export function summarizeViewFilters(filters, meta) {
  const names = (ids = [], list, getName) => {
    const byId = new Map(list.map((item) => [item.id, getName(item)]))
    return ids.map((id) => byId.get(id)).filter(Boolean).join(', ')
  }
  const nameOf = (id, list = []) => (id ? (list.find((item) => item.id === id)?.name ?? '') : '')
  const rows = [
    ['ciclo', nameOf(filters.cycle, meta.cycles)],
    ['módulo', nameOf(filters.module, meta.modules)],
    ['estado', names(filters.state, meta.states, (state) => state.name)],
    ['prioridad', (filters.priority ?? []).map((value) => PRIORITY_LABELS[value] ?? value).join(', ')],
    ['asignado', names(filters.assignee, meta.users, (user) => user.fullName)],
    ['etiqueta', names(filters.label, meta.labels, (label) => label.name)],
    ['bloqueo', filters.blocked ? 'solo bloqueadas' : ''],
    ['búsqueda', filters.search ? `«${filters.search}»` : ''],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => ({ key, value }))
  if (rows.length === 0) rows.push({ key: 'filtros', value: 'ninguno (todas las tareas)' })
  rows.push({ key: 'vista', value: filters.view === 'board' ? 'tablero' : 'lista' })
  if (filters.view !== 'board') {
    const group = GROUP_BY_OPTIONS.find((option) => option.value === (filters.groupBy || GROUP_BY_DEFAULT))
    rows.push({ key: 'agrupar', value: `por ${(group?.label ?? filters.groupBy).toLowerCase()}` })
    const sort = SORT_OPTIONS.find((option) => option.value === (filters.sort || DEFAULT_SORT))
    rows.push({ key: 'orden', value: (sort?.label ?? filters.sort).toLowerCase() })
  }
  return rows
}

/** Quién puede cambiar o borrar una vista: las compartidas, el project manager; las personales, su dueño. */
export function canEditView(view, isManager) {
  return view.shared ? isManager : Boolean(view.mine)
}

/**
 * Grupos que se pueden ordenar: las compartidas solo el project manager; las personales (las mías), yo.
 * Un grupo con una sola vista no tiene nada que ordenar.
 * @param {SavedView[]} views
 * @param {boolean} isManager
 */
export function reorderableGroups(views, isManager) {
  const shared = views.filter((view) => view.shared)
  const personal = views.filter((view) => !view.shared && view.mine)
  return {
    shared,
    personal,
    canShared: isManager && shared.length > 1,
    canPersonal: personal.length > 1,
  }
}

/**
 * Mueve una vista dentro de su grupo y arma el cuerpo de PUT /views/order solo con ese grupo.
 * Devuelve la lista completa con el orden nuevo (compartidas primero) para pintarla enseguida, o null si no cambia.
 * @param {SavedView[]} views lista actual (compartidas y luego personales)
 * @param {string} viewId
 * @param {number} toIndex posición nueva dentro de su grupo
 * @returns {{ views: SavedView[], body: { shared?: string[], personal?: string[] } } | null}
 */
export function moveView(views, viewId, toIndex) {
  const moving = views.find((view) => view.id === viewId)
  if (!moving) return null
  const group = views.filter((view) => Boolean(view.shared) === Boolean(moving.shared))
  const from = group.findIndex((view) => view.id === viewId)
  const to = Math.max(0, Math.min(group.length - 1, toIndex))
  if (from === to) return null
  const reordered = [...group]
  reordered.splice(from, 1)
  reordered.splice(to, 0, moving)
  const others = views.filter((view) => Boolean(view.shared) !== Boolean(moving.shared))
  const ids = reordered.map((view) => view.id)
  return {
    views: moving.shared ? [...reordered, ...others] : [...others, ...reordered],
    body: moving.shared ? { shared: ids } : { personal: ids },
  }
}
