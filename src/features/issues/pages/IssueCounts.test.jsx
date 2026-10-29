import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssues } from '../hooks'
import { IssueCounts } from './IssuesPage'

vi.mock('../hooks', () => ({ useIssues: vi.fn() }))

const project = { id: 'p1', openIssueCount: 10, overdueIssueCount: 0 }

/** El backend: 4 tareas con la búsqueda «login» (1 bloqueada); sin búsqueda, 2 bloqueadas. */
beforeEach(() => {
  useIssues.mockImplementation((_slug, _projectId, params, options) => {
    if (options?.enabled === false) return { data: undefined }
    const searching = Boolean(params.search)
    if (params.blocked) return { data: { totalElements: searching ? 1 : 2 } }
    return { data: { totalElements: searching ? 4 : 10 } }
  })
})

const renderCounts = (filters, filtered) =>
  render(
    <MemoryRouter>
      <IssueCounts slug="acme" project={project} filters={filters} filtered={filtered} onShowBlocked={vi.fn()} />
    </MemoryRouter>,
  )

describe('IssueCounts: los dos números van sobre lo mismo', () => {
  it('sin filtros: abiertas y bloqueadas de todo el proyecto', () => {
    const { container } = renderCounts({ search: '' }, false)
    expect(container).toHaveTextContent('10 tareas abiertas · 2 bloqueadas')
  })

  it('con búsqueda: las tareas y las bloqueadas siguen la búsqueda, y lo dice', () => {
    const { container } = renderCounts({ search: 'login' }, true)
    expect(container).toHaveTextContent('4 tareas con estos filtros · 1 bloqueada')
    expect(container).not.toHaveTextContent('abiertas')
  })
})
