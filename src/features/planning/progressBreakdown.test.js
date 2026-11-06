import { describe, expect, it } from 'vitest'
import { planningListCount, progressBreakdown } from './progressBreakdown'

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

describe('planningListCount', () => {
  it('cuenta como el avance (sin historias ni canceladas) y muestra aparte las historias y canceladas de la lista', () => {
    const issues = [
      ...Array.from({ length: 12 }, () => issue('UNSTARTED')),
      ...Array.from({ length: 4 }, () => issue('COMPLETED', 'BUG')),
      issue('STARTED', 'STORY'),
      issue('UNSTARTED', 'STORY'),
      issue('COMPLETED', 'STORY'),
      issue('CANCELLED'),
    ]
    // El avance diría «4 de 16 completadas»: el número de la lista es el mismo 16
    expect(planningListCount(issues).text).toBe('16 · 3 historias · 1 cancelada')
    expect(planningListCount(issues).title).toBe('16 tareas (tareas y bugs, como el avance) · 3 historias · 1 cancelada')
  })

  it('sin historias ni canceladas, solo el número', () => {
    expect(planningListCount([issue('UNSTARTED'), issue('STARTED', 'BUG')]).text).toBe('02')
  })
})
