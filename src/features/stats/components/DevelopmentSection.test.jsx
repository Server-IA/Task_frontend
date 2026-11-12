import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { DevelopmentSection } from './DevelopmentSection'

beforeAll(() => {
  // jsdom no lo trae y el gráfico de barras lo usa para medir su ancho
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const stats = {
  repositories: 2,
  weeks: 4,
  periodStart: '2026-10-19',
  openPullRequests: 3,
  draftPullRequests: 1,
  mergedPullRequests: 5,
  averageHoursToMerge: 30.5,
  runsFinished: 8,
  runsSucceeded: 6,
  completedIssues: 10,
  completedWithMergedPullRequest: 4,
  mergedByWeek: [
    { weekStart: '2026-10-19', merged: 1 },
    { weekStart: '2026-10-26', merged: 0 },
    { weekStart: '2026-11-02', merged: 3 },
    { weekStart: '2026-11-09', merged: 1 },
  ],
  workflows: [
    {
      repository: 'acme/web',
      name: 'CI',
      runs: 7,
      succeeded: 5,
      averageSeconds: 200,
      lastRunAt: '2026-11-10T15:00:00Z',
      lastConclusion: 'failure',
    },
    {
      repository: 'acme/web',
      name: 'Deploy',
      runs: 1,
      succeeded: 1,
      averageSeconds: 45,
      lastRunAt: '2026-11-09T15:00:00Z',
      lastConclusion: 'success',
    },
  ],
  oldOpenPullRequests: [
    {
      id: 'p1',
      repository: 'acme/web',
      number: 42,
      title: 'Filtros de la tabla',
      url: 'https://github.com/acme/web/pull/42',
      draft: false,
      daysOpen: 12,
      issueId: 'i1',
      issueCode: 'WEB-7',
      issueTitle: 'Filtros',
    },
  ],
}

function renderSection(props = {}) {
  const onOpenIssue = vi.fn()
  render(
    <MemoryRouter>
      <DevelopmentSection
        stats={stats}
        githubUrl="/eq/projects/p/github"
        onOpenIssue={onOpenIssue}
        {...props}
      />
    </MemoryRouter>,
  )
  return onOpenIssue
}

describe('DevelopmentSection', () => {
  it('muestra las cinco cifras del periodo', () => {
    renderSection()
    expect(screen.getByRole('heading', { name: 'Desarrollo' })).toBeInTheDocument()
    expect(screen.getByText('2 repositorios enlazados', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('PR abiertos')).toBeInTheDocument()
    expect(screen.getByText('1 en borrador')).toBeInTheDocument()
    expect(screen.getByText('6 de 8 ejecuciones terminadas')).toBeInTheDocument()
    expect(screen.getByText('4 de 10 completadas en el periodo')).toBeInTheDocument()
  })

  it('la tabla por workflow lleva números, sin barras ni «Ver tabla»', () => {
    renderSection()
    const table = screen.getByRole('table', { name: 'Ejecuciones por workflow' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('CI')
    expect(rows[0]).toHaveTextContent('71 %')
    expect(rows[0]).toHaveTextContent('3 min 20 s')
    expect(rows[0]).toHaveTextContent('falló')
    expect(rows[1]).toHaveTextContent('100 %')
    expect(
      within(table.closest('section')).queryByRole('button', { name: 'Ver tabla' }),
    ).not.toBeInTheDocument()
  })

  it('los PR viejos enlazan a GitHub y su tarea abre el panel', async () => {
    const onOpenIssue = renderSection()
    expect(screen.getByRole('link', { name: /Filtros de la tabla/ })).toHaveAttribute(
      'href',
      'https://github.com/acme/web/pull/42',
    )
    await userEvent.click(screen.getByRole('button', { name: 'WEB-7' }))
    expect(onOpenIssue).toHaveBeenCalledWith('i1')
  })

  it('con el filtro de personas avisa que estas cifras son de todo el proyecto', () => {
    renderSection({ filtered: true })
    expect(screen.getByText('(no depende del filtro de personas)')).toBeInTheDocument()
  })
})
