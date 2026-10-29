import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { BOARD_GROUP_OPTIONS, GROUP_BY_DEFAULT, GROUP_BY_OPTIONS, SAVED_VIEW_PARAM } from './constants'
import { effectiveTypes, typeParam, typesToUrl } from './issueTypes'

const MULTI_KEYS = ['state', 'priority', 'assignee', 'label', 'type']
/** Filtros de un solo valor (id del ciclo o del módulo). */
const SINGLE_KEYS = ['cycle', 'module']
const GROUP_VALUES = new Set([...GROUP_BY_OPTIONS, ...BOARD_GROUP_OPTIONS].map((option) => option.value))

/**
 * Filtros, orden, agrupación, página, vista e issue abierto, guardados en la URL
 * (así un enlace comparte exactamente la misma vista).
 * Los filtros sin valor quedan `undefined` (no viajan a la API): `blocked=false` pediría «solo las no bloqueadas».
 * El tipo (`?type=`) tiene un valor por defecto: sin él se ven las tareas y los bugs (no las historias); `type=all`
 * muestra los tres. `filters.type` son los valores de la URL tal cual, `types` los tipos que se ven y `queryFilters`
 * lo que se manda a la API (con `type` ya resuelto).
 */
export function useIssueFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const preferredView = usePreferencesStore((state) => state.issuesView)
  const setPreferredView = usePreferencesStore((state) => state.setIssuesView)

  const filters = useMemo(
    () => ({
      state: searchParams.getAll('state'),
      priority: searchParams.getAll('priority'),
      assignee: searchParams.getAll('assignee'),
      label: searchParams.getAll('label'),
      type: searchParams.getAll('type'),
      search: searchParams.get('search') ?? '',
      cycle: searchParams.get('cycle') || undefined,
      module: searchParams.get('module') || undefined,
      blocked: searchParams.get('blocked') === 'true' ? true : undefined,
    }),
    [searchParams],
  )

  const types = useMemo(() => effectiveTypes(filters.type), [filters.type])
  const queryFilters = useMemo(() => ({ ...filters, type: typeParam(types) }), [filters, types])

  const view = searchParams.get('view') ?? preferredView
  const sort = searchParams.get('sort') ?? 'sortOrder,asc'
  const groupParam = searchParams.get('groupBy')
  const groupBy = GROUP_VALUES.has(groupParam) ? groupParam : GROUP_BY_DEFAULT
  const page = Math.max(0, Number(searchParams.get('page') ?? 0) || 0)
  const openIssueId = searchParams.get('issue')
  const activeViewId = searchParams.get(SAVED_VIEW_PARAM)

  const update = useCallback(
    (mutate, { resetPage = true } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          mutate(next)
          if (resetPage) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setFilter = useCallback(
    (key, values) =>
      update((params) => {
        params.delete(key)
        if (key === 'blocked') {
          if (values) params.set('blocked', 'true')
          return
        }
        const list = Array.isArray(values) ? values : [values]
        const stored = key === 'type' ? typesToUrl(list.filter(Boolean)) : list.filter(Boolean)
        stored.forEach((value) => params.append(key, value))
      }),
    [update],
  )

  const clearFilters = useCallback(
    () =>
      update((params) => {
        for (const key of [...MULTI_KEYS, ...SINGLE_KEYS, 'blocked', 'search']) params.delete(key)
      }),
    [update],
  )

  /** Reemplaza los parámetros por lo que devuelva `build(anteriores)` (lo usan las vistas guardadas). */
  const replaceParams = useCallback((build) => setSearchParams((previous) => build(previous), { replace: true }), [setSearchParams])

  // El tipo por defecto (tareas y bugs) no cuenta como filtro puesto
  const activeCount =
    MULTI_KEYS.filter((key) => key !== 'type').reduce((total, key) => total + filters[key].length, 0) +
    (typesToUrl(types).length > 0 ? 1 : 0) +
    SINGLE_KEYS.filter((key) => filters[key]).length +
    (filters.blocked ? 1 : 0) +
    (filters.search ? 1 : 0)

  return {
    filters,
    types,
    queryFilters,
    activeCount,
    view,
    sort,
    groupBy,
    page,
    openIssueId,
    activeViewId,
    replaceParams,
    setFilter,
    clearFilters,
    setView: (value) => {
      setPreferredView(value)
      update((params) => params.set('view', value))
    },
    setSort: (value) => update((params) => params.set('sort', value)),
    // Agrupar no cambia qué tareas hay en la página: se queda en la misma
    setGroupBy: (value) =>
      update((params) => (value === GROUP_BY_DEFAULT ? params.delete('groupBy') : params.set('groupBy', value)), {
        resetPage: false,
      }),
    setPage: (value) => update((params) => params.set('page', String(value)), { resetPage: false }),
    openIssue: (issueId) => update((params) => params.set('issue', issueId), { resetPage: false }),
    closeIssue: () => update((params) => params.delete('issue'), { resetPage: false }),
  }
}
