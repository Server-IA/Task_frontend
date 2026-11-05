import { describe, expect, it } from 'vitest'
import { progressBreakdown } from './progressBreakdown'

const issue = (group, type = 'TASK') => ({ type, state: { group } })

describe('progressBreakdown', () => {
  it('no cuenta las historias: por hacer + en curso + hechas suma el total del avance', () => {
    const issues = [
      issue('STARTED', 'STORY'),
      issue('UNSTARTED', 'STORY'),
      issue('STARTED'),
      issue('STARTED', 'BUG'),
      issue('UNSTARTED'),
      issue('BACKLOG'),
      issue('COMPLETED'),
      issue('CANCELLED'),
    ]
    // El backend: 5 en el total (sin historias ni canceladas), 1 completada
    expect(progressBreakdown(issues)).toEqual({ started: 2, pending: 2 })
  })

  it('sin tipo cuenta como tarea', () => {
    expect(progressBreakdown([{ state: { group: 'STARTED' } }])).toEqual({ started: 1, pending: 0 })
  })
})
