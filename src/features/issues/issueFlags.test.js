import { describe, expect, it } from 'vitest'
import {
  blockedBySummary,
  blockedCount,
  blockingSummary,
  checklistProgress,
  joinCodes,
  needsCriteriaConfirm,
  pendingCriteria,
} from './issueFlags'

describe('dependencias en tarjetas y filas', () => {
  it('bloqueada por: primer código y cuántos más', () => {
    expect(blockedBySummary({ blockedByCount: 0, blockedByCodes: [] })).toBeNull()
    expect(blockedBySummary({ blockedByCount: 1, blockedByCodes: ['WEB-2'] })).toEqual({
      count: 1,
      codes: ['WEB-2'],
      first: 'WEB-2',
      more: 0,
    })
    expect(blockedBySummary({ blockedByCount: 3, blockedByCodes: ['AMC-4', 'WEB-2', 'WEB-7'] })).toMatchObject({
      first: 'AMC-4',
      more: 2,
    })
    // Sin códigos (respuesta sin el campo) queda solo el número
    expect(blockedBySummary({ blockedByCount: 2 })).toEqual({ count: 2, codes: [], first: null, more: 0 })
    expect(blockedCount({ blockedByCodes: ['WEB-2'] })).toBe(1)
  })

  it('bloquea: el código con una, el número con varias', () => {
    expect(blockingSummary({ blockingCodes: [] })).toBeNull()
    expect(blockingSummary({})).toBeNull()
    expect(blockingSummary({ blockingCodes: ['WEB-7'] })).toMatchObject({ count: 1, label: 'WEB-7' })
    expect(blockingSummary({ blockingCodes: ['WEB-7', 'WEB-9'] })).toMatchObject({ count: 2, label: '2' })
  })

  it('une códigos en español', () => {
    expect(joinCodes([])).toBe('')
    expect(joinCodes(['WEB-2'])).toBe('WEB-2')
    expect(joinCodes(['WEB-2', 'WEB-7'])).toBe('WEB-2 y WEB-7')
    expect(joinCodes(['WEB-2', 'WEB-7', 'AMC-3'])).toBe('WEB-2, WEB-7 y AMC-3')
  })
})

const done = { id: 's-done', group: 'COMPLETED' }
const doing = { id: 's-doing', group: 'STARTED' }

describe('avance y confirmación al completar', () => {
  it('suma pasos y criterios y arma la descripción', () => {
    expect(checklistProgress({ checklistTotal: 5, checklistDone: 3, criteriaTotal: 3, criteriaDone: 2 })).toEqual({
      done: 5,
      total: 8,
      complete: false,
      label: '3/5 pasos · 2/3 criterios',
    })
    expect(checklistProgress({ checklistTotal: 1, checklistDone: 1, criteriaTotal: 0, criteriaDone: 0 })).toMatchObject({
      complete: true,
      label: '1/1 paso',
    })
    expect(checklistProgress({ checklistTotal: 0, criteriaTotal: 0 })).toBeNull()
  })

  it('pide confirmar solo al pasar a completado con criterios sin marcar', () => {
    const issue = { state: doing, criteriaTotal: 3, criteriaDone: 2 }
    expect(pendingCriteria(issue)).toBe(1)
    expect(needsCriteriaConfirm(issue, done)).toBe(true)
    expect(needsCriteriaConfirm(issue, doing)).toBe(false)
    expect(needsCriteriaConfirm({ ...issue, criteriaDone: 3 }, done)).toBe(false)
    expect(needsCriteriaConfirm({ ...issue, state: done }, { id: 'otro', group: 'COMPLETED' })).toBe(false)
    expect(needsCriteriaConfirm({ state: doing }, done)).toBe(false)
  })
})
