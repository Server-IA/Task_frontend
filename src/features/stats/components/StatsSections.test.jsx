import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KpiTiles } from './StatsSections'

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
