import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { KpiTiles, StaleCard, WorkloadCard } from './StatsSections'

const base = { openCount: 5, createdThisWeek: 1, completedThisWeek: 2, completedLastWeek: 1, overdue: [], previousCycleTimeDays: null }

describe('KpiTiles: tiempo de ciclo', () => {
  it('es la mediana de En curso a Hecho', () => {
    render(<KpiTiles stats={{ ...base, cycleTimeDays: 3.4 }} onOpenIssue={() => {}} />)
    expect(screen.getByText('mediana, de En curso a Hecho', { exact: false })).toBeInTheDocument()
  })

  it('sin muestras (null) muestra un vacío claro', () => {
    render(<KpiTiles stats={{ ...base, cycleTimeDays: null }} onOpenIssue={() => {}} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('ninguna pasó de En curso a Hecho en el periodo')).toBeInTheDocument()
  })
})

describe('StaleCard: sin movimiento', () => {
  const stale = [
    { id: 'a', code: 'WEB-3', title: 'Migrar el login', daysWithoutChanges: 40 },
    { id: 'b', code: 'WEB-9', title: 'Revisar permisos', daysWithoutChanges: 20 },
  ]

  it('es una tabla, sin barras ni «Ver tabla», y cada tarea abre su panel', async () => {
    const onOpenIssue = vi.fn()
    render(<StaleCard stale={stale} onOpenIssue={onOpenIssue} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Días sin cambios' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '40' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver tabla' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'WEB-3' }))
    await userEvent.click(screen.getByRole('button', { name: 'Revisar permisos' }))
    expect(onOpenIssue.mock.calls).toEqual([['a'], ['b']])
  })

  it('sin tareas quietas muestra el aviso en vez de la tabla', () => {
    render(<StaleCard stale={[]} onOpenIssue={() => {}} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/tuvieron cambios en las últimas dos semanas/)).toBeInTheDocument()
  })
})

describe('WorkloadCard: carga por persona', () => {
  it('es una tabla con abiertas y vencidas, de más a menos y «Sin asignar» al final', () => {
    render(
      <WorkloadCard
        workload={[
          { user: null, open: 9, overdue: 0 },
          { user: { id: 'a', fullName: 'Ana Ruiz' }, open: 2, overdue: 0 },
          { user: { id: 'l', fullName: 'Luis Muñoz' }, open: 5, overdue: 3 },
        ]}
      />,
    )
    const rows = screen.getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(rows[0]).toMatch(/Luis Muñoz5!3$/)
    expect(rows[1]).toMatch(/Ana Ruiz20$/)
    expect(rows[2]).toMatch(/Sin asignar90$/)
    expect(screen.queryByRole('button', { name: 'Ver tabla' })).not.toBeInTheDocument()
  })
})

describe('KpiTiles: vencidas', () => {
  const overdue = Array.from({ length: 6 }, (_, index) => ({ id: `i${index}`, code: `WEB-${index + 1}`, title: `Tarea ${index + 1}` }))

  it('«+N» abre la lista de todas y cualquiera abre su panel', async () => {
    const onOpenIssue = vi.fn()
    render(<KpiTiles stats={{ ...base, overdue }} onOpenIssue={onOpenIssue} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver las 6 tareas vencidas' }))
    expect(screen.getByText('6 tareas vencidas')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /WEB-6/ }))
    expect(onOpenIssue).toHaveBeenCalledWith('i5')
  })

  it('«Ver tareas» lleva a las abiertas, con el filtro de personas de la página', () => {
    render(
      <MemoryRouter>
        <KpiTiles
          stats={{ ...base, openByState: [{ stateId: 's1' }, { stateId: 's2' }] }}
          onOpenIssue={() => {}}
          issuesUrl="/w/projects/p/issues?assignee=a"
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Ver tareas/ })).toHaveAttribute(
      'href',
      '/w/projects/p/issues?assignee=a&state=s1&state=s2',
    )
  })
})

describe('Tarjetas que llevan a las tareas', () => {
  it('cada persona lleva a sus tareas y «Sin asignar» no es enlace', () => {
    render(
      <MemoryRouter>
        <WorkloadCard
          workload={[
            { user: null, open: 9, overdue: 0 },
            { user: { id: 'a', fullName: 'Ana Ruiz' }, open: 2, overdue: 0 },
          ]}
          issuesUrl="/w/projects/p/issues"
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Ana Ruiz' })).toHaveAttribute('href', '/w/projects/p/issues?assignee=a')
    expect(screen.queryByRole('link', { name: 'Sin asignar' })).not.toBeInTheDocument()
  })
})
