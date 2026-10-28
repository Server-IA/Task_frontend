import { describe, expect, it } from 'vitest'
import { checklistProgress, needsCriteriaConfirm, pendingCriteria } from './issueFlags'

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
