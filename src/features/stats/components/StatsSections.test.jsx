import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { KpiTiles, StaleCard } from './StatsSections'

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

  it('muestra una barra por tarea y abre la tarea al hacer clic', async () => {
    const onOpenIssue = vi.fn()
    render(<StaleCard stale={stale} onOpenIssue={onOpenIssue} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /WEB-3/ }))
    expect(onOpenIssue).toHaveBeenCalledWith('a')
  })

  it('«Ver tabla» cambia las barras por una tabla con los mismos datos', async () => {
    render(<StaleCard stale={stale} onOpenIssue={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver tabla' }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Días sin cambios' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '40' })).toBeInTheDocument()
  })

  it('si la lista queda vacía con «Ver tabla» puesto, vuelve el aviso en vez de fallar', async () => {
    const { rerender } = render(<StaleCard stale={stale} onOpenIssue={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver tabla' }))
    rerender(<StaleCard stale={[]} onOpenIssue={() => {}} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/tuvieron cambios en las últimas dos semanas/)).toBeInTheDocument()
  })

  it('sin tareas quietas no ofrece la tabla', () => {
    render(<StaleCard stale={[]} onOpenIssue={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Ver tabla' })).not.toBeInTheDocument()
    expect(screen.getByText(/tuvieron cambios en las últimas dos semanas/)).toBeInTheDocument()
  })
})
