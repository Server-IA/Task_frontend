import { describe, expect, it } from 'vitest'
import { GAP, findColumn, getNeighbors, groupByState, sortOrderBetween } from './kanban'

describe('getNeighbors', () => {
  it('entre dos tarjetas devuelve la de arriba y la de abajo', () => {
    expect(getNeighbors(['a', 'x', 'b'], 'x')).toEqual({ afterIssueId: 'a', beforeIssueId: 'b' })
  })

  it('primera de la columna: solo tiene vecina abajo', () => {
    expect(getNeighbors(['x', 'a'], 'x')).toEqual({ afterIssueId: null, beforeIssueId: 'a' })
  })

  it('última de la columna: solo tiene vecina arriba', () => {
    expect(getNeighbors(['a', 'x'], 'x')).toEqual({ afterIssueId: 'a', beforeIssueId: null })
  })

  it('columna vacía (solo ella): sin vecinas', () => {
    expect(getNeighbors(['x'], 'x')).toEqual({ afterIssueId: null, beforeIssueId: null })
  })
})

describe('sortOrderBetween', () => {
  it('usa el promedio entre dos tarjetas', () => {
    expect(sortOrderBetween(100, 200, 500)).toBe(150)
  })

  it('al final suma el espacio y al inicio lo resta', () => {
    expect(sortOrderBetween(300, null, 300)).toBe(300 + GAP)
    expect(sortOrderBetween(null, 100, 500)).toBe(100 - GAP)
  })

  it('sin vecinas va al final de la columna', () => {
    expect(sortOrderBetween(null, null, 1000)).toBe(1000 + GAP)
    expect(sortOrderBetween(null, null, null)).toBe(GAP)
  })
})

describe('groupByState', () => {
  const states = [{ id: 'todo' }, { id: 'done' }]
  const issues = [
    { id: '2', state: { id: 'todo' }, sortOrder: 200 },
    { id: '1', state: { id: 'todo' }, sortOrder: 100 },
    { id: '3', state: { id: 'done' }, sortOrder: 50 },
  ]

  it('agrupa por estado y ordena por sortOrder', () => {
    expect(groupByState(issues, states)).toEqual({ todo: ['1', '2'], done: ['3'] })
  })

  it('encuentra la columna de un issue', () => {
    const columns = groupByState(issues, states)
    expect(findColumn(columns, '3')).toBe('done')
    expect(findColumn(columns, 'nope')).toBeNull()
  })
})
