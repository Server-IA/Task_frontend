import { describe, expect, it } from 'vitest'
import { dueGroup, groupByDue, nextDue } from './groupByDue'

// Lunes 26 de octubre de 2026 (la semana termina el domingo 1 de noviembre)
const monday = new Date(2026, 9, 26, 15, 30)

describe('dueGroup', () => {
  it('separa vencidas, hoy y sin fecha', () => {
    expect(dueGroup('2026-10-25', monday)).toBe('overdue')
    expect(dueGroup('2026-10-26', monday)).toBe('today')
    expect(dueGroup(null, monday)).toBe('none')
  })

  it('«esta semana» llega hasta el domingo; después es «más adelante»', () => {
    expect(dueGroup('2026-10-27', monday)).toBe('week')
    expect(dueGroup('2026-11-01', monday)).toBe('week')
    expect(dueGroup('2026-11-02', monday)).toBe('later')
  })

  it('un domingo, mañana ya es la semana siguiente', () => {
    const sunday = new Date(2026, 10, 1, 9)
    expect(dueGroup('2026-11-01', sunday)).toBe('today')
    expect(dueGroup('2026-11-02', sunday)).toBe('later')
  })
})

describe('groupByDue', () => {
  it('devuelve solo los grupos con tareas, en orden y sin reordenar las tareas', () => {
    const issues = [
      { id: 'a', dueDate: null },
      { id: 'b', dueDate: '2026-10-20' },
      { id: 'c', dueDate: '2026-11-10' },
      { id: 'd', dueDate: '2026-10-29' },
      { id: 'e', dueDate: '2026-10-28' },
    ]
    const groups = groupByDue(issues, monday)
    expect(groups.map((group) => group.key)).toEqual(['overdue', 'week', 'later', 'none'])
    expect(groups[1].issues.map((issue) => issue.id)).toEqual(['d', 'e'])
  })
})

describe('nextDue', () => {
  it('es la primera fecha de hoy en adelante (las vencidas no cuentan)', () => {
    const issues = [{ id: 'old', dueDate: '2026-10-01' }, { id: 'later', dueDate: '2026-11-05' }, { id: 'soon', dueDate: '2026-10-28' }]
    expect(nextDue(issues, monday).id).toBe('soon')
    expect(nextDue([{ id: 'x', dueDate: null }], monday)).toBeUndefined()
  })
})
