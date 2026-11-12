import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
