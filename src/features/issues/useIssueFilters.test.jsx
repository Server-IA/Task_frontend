import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useIssueFilters } from './useIssueFilters'

/** El hook en /tareas, con /antes como la página anterior del historial. */
function setup() {
  const wrapper = ({ children }) => <MemoryRouter initialEntries={['/antes', '/tareas']}>{children}</MemoryRouter>
  return renderHook(
    () => ({ filters: useIssueFilters(), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  )
}

const back = (result) => act(() => result.current.navigate(-1))

describe('useIssueFilters: «Atrás»', () => {
  it('un filtro queda en el historial: «Atrás» lo deshace y sigue en la página', () => {
    const { result } = setup()
    act(() => result.current.filters.setFilter('priority', ['HIGH']))
    act(() => result.current.filters.setFilter('priority', ['HIGH', 'URGENT']))
    expect(result.current.location.search).toBe('?priority=HIGH&priority=URGENT')

    back(result)
    expect(result.current.location.pathname).toBe('/tareas')
    expect(result.current.location.search).toBe('?priority=HIGH')
    back(result)
    expect(result.current.location).toMatchObject({ pathname: '/tareas', search: '' })
  })

  it('el orden, la agrupación, la página y aplicar una vista también', () => {
    const { result } = setup()
    act(() => result.current.filters.setSort('priority,desc'))
    act(() => result.current.filters.setGroupBy('assignee'))
    act(() => result.current.filters.applyParams(() => new URLSearchParams('savedView=v1&state=s1')))
    back(result)
    expect(result.current.location.search).toBe('?sort=priority%2Cdesc&groupBy=assignee')
    back(result)
    expect(result.current.location.search).toBe('?sort=priority%2Cdesc')
  })

  it('lo que se escribe en la búsqueda reemplaza la entrada: «Atrás» no recorre cada letra', () => {
    const { result } = setup()
    act(() => result.current.filters.setFilter('search', 'log', { replace: true }))
    act(() => result.current.filters.setFilter('search', 'login', { replace: true }))
    expect(result.current.location.search).toBe('?search=login')
    back(result)
    expect(result.current.location.pathname).toBe('/antes')
  })

  it('abrir el panel de una tarea no agrega un paso', () => {
    const { result } = setup()
    act(() => result.current.filters.openIssue('i1'))
    back(result)
    expect(result.current.location.pathname).toBe('/antes')
  })
})
