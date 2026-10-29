import { describe, expect, it } from 'vitest'
import { sortCycles } from './cycleOrder'

const cycle = (name, status, extra = {}) => ({ id: name, name, status, ...extra })

describe('sortCycles', () => {
  it('en curso primero, después próximos, borradores y al final los cerrados', () => {
    const cycles = [
      cycle('Sprint 1', 'COMPLETED', { closedAt: '2026-09-15T10:00:00Z', endDate: '2026-09-14' }),
      cycle('Borrador', 'DRAFT'),
      cycle('Sprint 3', 'UPCOMING', { startDate: '2026-11-10' }),
      cycle('Sprint 2', 'CURRENT', { startDate: '2026-10-20' }),
    ]
    expect(sortCycles(cycles).map((item) => item.name)).toEqual(['Sprint 2', 'Sprint 3', 'Borrador', 'Sprint 1'])
  })

  it('próximos: el más cercano primero; cerrados: el más reciente primero', () => {
    const cycles = [
      cycle('S5', 'UPCOMING', { startDate: '2026-12-01' }),
      cycle('S1', 'COMPLETED', { closedAt: '2026-08-01T00:00:00Z' }),
      cycle('S4', 'UPCOMING', { startDate: '2026-11-15' }),
      cycle('S2', 'COMPLETED', { closedAt: '2026-09-01T00:00:00Z' }),
    ]
    expect(sortCycles(cycles).map((item) => item.name)).toEqual(['S4', 'S5', 'S2', 'S1'])
  })

  it('no cambia la lista que recibe', () => {
    const cycles = [cycle('A', 'COMPLETED', { closedAt: '2026-01-01' }), cycle('B', 'CURRENT')]
    sortCycles(cycles)
    expect(cycles.map((item) => item.name)).toEqual(['A', 'B'])
  })
})
