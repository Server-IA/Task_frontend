import { describe, expect, it } from 'vitest'
import {
  allBlocked,
  buildCloseRequest,
  canCloseCycle,
  closedText,
  defaultCloseMode,
  endDateNotice,
  openTargetCycles,
  rowDestination,
  splitUnfinished,
  targetCycleOf,
} from './closeCycle'

const today = new Date(2026, 9, 28, 10)
const issues = [{ id: 'a', code: 'WEB-2' }, { id: 'b', code: 'WEB-4' }, { id: 'c', code: 'WEB-15' }]

describe('canCloseCycle', () => {
  it('solo ciclos que ya empezaron y siguen abiertos', () => {
    expect(canCloseCycle({ startDate: '2026-10-15', endDate: '2026-10-29' }, today)).toBe(true)
    expect(canCloseCycle({ startDate: '2026-10-28' }, today)).toBe(true)
    expect(canCloseCycle({ startDate: '2026-10-29' }, today)).toBe(false)
    expect(canCloseCycle({ startDate: '2026-10-01', closedAt: '2026-10-20T10:00:00Z' }, today)).toBe(false)
  })

  it('un ciclo sin fechas no se ofrece para cerrar', () => {
    expect(canCloseCycle({ startDate: null, endDate: null }, today)).toBe(false)
    expect(canCloseCycle(undefined, today)).toBe(false)
  })
})

describe('destino por defecto', () => {
  it('es el ciclo siguiente si existe; si no, el backlog', () => {
    expect(defaultCloseMode({ nextCycle: { id: 'n' } })).toBe('NEXT')
    expect(defaultCloseMode({ nextCycle: null })).toBe('BACKLOG')
  })

  it('el ciclo destino es el elegido a mano con OTHER y el siguiente en los demás casos', () => {
    const nextCycle = { id: 'n' }
    const otherCycle = { id: 'o' }
    expect(targetCycleOf({ mode: 'NEXT', nextCycle, otherCycle })).toBe(nextCycle)
    expect(targetCycleOf({ mode: 'BACKLOG', nextCycle, otherCycle })).toBe(nextCycle)
    expect(targetCycleOf({ mode: 'OTHER', nextCycle, otherCycle })).toBe(otherCycle)
    expect(targetCycleOf({ mode: 'OTHER', nextCycle, otherCycle: null })).toBeNull()
    expect(targetCycleOf({ mode: 'NEXT', nextCycle: null })).toBeNull()
  })

  it('los ciclos destino posibles excluyen el que se cierra y los cerrados', () => {
    const cycles = [{ id: 'self' }, { id: 'open' }, { id: 'closed', closedAt: '2026-10-01T00:00:00Z' }, { id: 'draft' }]
    expect(openTargetCycles(cycles, 'self').map((cycle) => cycle.id)).toEqual(['open', 'draft'])
  })
})

describe('destino de cada tarea', () => {
  it('sigue el general salvo que tenga excepción; sin ciclo destino todo va al backlog', () => {
    const overrides = { c: 'BACKLOG' }
    expect(rowDestination('a', { mode: 'NEXT', overrides, hasTarget: true })).toBe('CYCLE')
    expect(rowDestination('c', { mode: 'NEXT', overrides, hasTarget: true })).toBe('BACKLOG')
    expect(rowDestination('a', { mode: 'BACKLOG', overrides: { a: 'CYCLE' }, hasTarget: true })).toBe('CYCLE')
    expect(rowDestination('a', { mode: 'BACKLOG', overrides: { a: 'CYCLE' }, hasTarget: false })).toBe('BACKLOG')
  })

  it('reparte las tareas y solo cuenta como excepción lo que difiere del general', () => {
    // «b» tiene una excepción igual al general: no es excepción
    const result = splitUnfinished(issues, { mode: 'NEXT', overrides: { b: 'CYCLE', c: 'BACKLOG' }, hasTarget: true })
    expect(result.toCycle.map((issue) => issue.id)).toEqual(['a', 'b'])
    expect(result.toBacklog.map((issue) => issue.id)).toEqual(['c'])
    expect(result.exceptions.map((issue) => issue.id)).toEqual(['c'])
  })
})

describe('buildCloseRequest', () => {
  it('al ciclo siguiente con una excepción al backlog', () => {
    expect(
      buildCloseRequest({ mode: 'NEXT', overrides: { c: 'BACKLOG' }, unfinished: issues, hasTarget: true, startRetro: true }),
    ).toEqual({ moveTo: 'NEXT_CYCLE', overrides: [{ issueId: 'c', moveTo: 'BACKLOG' }], startRetro: true })
  })

  it('a otro ciclo elegido a mano lleva targetCycleId', () => {
    expect(
      buildCloseRequest({ mode: 'OTHER', otherCycleId: 'o', overrides: {}, unfinished: issues, hasTarget: true, startRetro: false }),
    ).toEqual({ moveTo: 'NEXT_CYCLE', overrides: [], startRetro: false, targetCycleId: 'o' })
  })

  it('al backlog con una tarea que sí pasa al ciclo siguiente', () => {
    expect(
      buildCloseRequest({ mode: 'BACKLOG', overrides: { a: 'CYCLE' }, unfinished: issues, hasTarget: true, startRetro: false }),
    ).toEqual({ moveTo: 'BACKLOG', overrides: [{ issueId: 'a', moveTo: 'NEXT_CYCLE' }], startRetro: false })
  })

  it('sin ciclo destino todo va al backlog y no se mandan excepciones', () => {
    expect(
      buildCloseRequest({ mode: 'NEXT', overrides: { a: 'CYCLE' }, unfinished: issues, hasTarget: false, startRetro: true }),
    ).toEqual({ moveTo: 'BACKLOG', overrides: [], startRetro: true })
  })
})

describe('endDateNotice', () => {
  it('avisa si el fin se adelanta a hoy', () => {
    expect(endDateNotice({ endDate: '2026-10-29' }, today)).toEqual({ kind: 'shortens', days: 1 })
    expect(endDateNotice({ endDate: '2026-10-28' }, today)).toEqual({ kind: 'today' })
    expect(endDateNotice({ endDate: '2026-10-25' }, today)).toEqual({ kind: 'ended', days: 3 })
    expect(endDateNotice({ endDate: null }, today)).toEqual({ kind: 'noEnd' })
  })
})

describe('closedText', () => {
  it('dice cuándo y quién cerró el ciclo', () => {
    const ana = { id: 'ana', fullName: 'Ana' }
    expect(closedText({ closedAt: '2026-10-28T08:00:00', closedBy: ana }, today)).toBe('cerrado hoy por Ana')
    expect(closedText({ closedAt: '2026-10-27T08:00:00', closedBy: ana }, today)).toBe('cerrado ayer por Ana')
    expect(closedText({ closedAt: '2026-10-20T08:00:00', closedBy: ana }, today)).toBe('cerrado el 20 oct por Ana')
  })

  it('sin quién lo cerró, solo la fecha; abierto, nada', () => {
    expect(closedText({ closedAt: '2026-10-20T08:00:00', closedBy: null }, today)).toBe('cerrado el 20 oct')
    expect(closedText({ closedAt: null }, today)).toBe('')
  })
})

describe('allBlocked', () => {
  it('explica que van al backlog solo si todas siguen bloqueadas', () => {
    expect(allBlocked([{ blockedByCount: 1 }, { blockedByCount: 2 }])).toBe(true)
    expect(allBlocked([{ blockedByCount: 1 }, { blockedByCount: 0 }])).toBe(false)
    expect(allBlocked([])).toBe(false)
  })
})
