import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { usePreferencesStore } from '@/stores/preferencesStore'

const MULTI_KEYS = ['state', 'priority', 'assignee', 'label']

/**
 * Filtros, orden, página, vista e issue abierto, guardados en la URL
 * (así un enlace comparte exactamente la misma vista).
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
      search: searchParams.get('search') ?? '',
    }),
    [searchParams],
  )

  const view = searchParams.get('view') ?? preferredView
  const sort = searchParams.get('sort') ?? 'sortOrder,asc'
  const page = Math.max(0, Number(searchParams.get('page') ?? 0) || 0)
  const openIssueId = searchParams.get('issue')

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
        const list = Array.isArray(values) ? values : [values]
        list.filter(Boolean).forEach((value) => params.append(key, value))
      }),
    [update],
  )

  const clearFilters = useCallback(
    () =>
      update((params) => {
        MULTI_KEYS.forEach((key) => params.delete(key))
        params.delete('search')
      }),
    [update],
  )

  const activeCount = MULTI_KEYS.reduce((total, key) => total + filters[key].length, 0) + (filters.search ? 1 : 0)

  return {
    filters,
    activeCount,
    view,
    sort,
    page,
    openIssueId,
    setFilter,
    clearFilters,
    setView: (value) => {
      setPreferredView(value)
      update((params) => params.set('view', value))
    },
    setSort: (value) => update((params) => params.set('sort', value)),
    setPage: (value) => update((params) => params.set('page', String(value)), { resetPage: false }),
    openIssue: (issueId) => update((params) => params.set('issue', issueId), { resetPage: false }),
    closeIssue: () => update((params) => params.delete('issue'), { resetPage: false }),
  }
}
