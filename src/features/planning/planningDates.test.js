import { describe, expect, it } from 'vitest'
import { planningUpdateBody } from './planningDates'

const cycle = { id: 'c1', startDate: '2026-11-02', endDate: '2026-11-13' }
const values = (startDate, endDate) => ({ name: 'Ciclo 4', description: '', startDate, endDate })

describe('planningUpdateBody', () => {
  it('con las dos fechas manda ambas', () => {
    expect(planningUpdateBody(cycle, values('2026-11-03', '2026-11-14'), 'endDate')).toEqual({
      body: { id: 'c1', name: 'Ciclo 4', description: '', startDate: '2026-11-03', endDate: '2026-11-14' },
    })
  })

  it('quitar las dos se pide con clearDates', () => {
    expect(planningUpdateBody(cycle, values(null, null), 'endDate')).toEqual({
      body: { id: 'c1', name: 'Ciclo 4', description: '', clearDates: true },
    })
  })

  it('quitar solo una no se puede (el backend ignoraría el null): marca el campo', () => {
    expect(planningUpdateBody(cycle, values('2026-11-02', null), 'endDate')).toEqual({ error: 'endDate' })
    expect(planningUpdateBody(cycle, values(null, '2026-11-13'), 'endDate')).toEqual({ error: 'startDate' })
  })

  it('en un módulo la fecha final es targetDate', () => {
    const module = { id: 'm1', startDate: null, targetDate: '2026-12-01' }
    expect(planningUpdateBody(module, values('2026-11-20', '2026-12-01'), 'targetDate').body).toMatchObject({
      startDate: '2026-11-20',
      targetDate: '2026-12-01',
    })
    expect(planningUpdateBody(module, values(null, null), 'targetDate').body.clearDates).toBe(true)
  })

  it('sin fechas guardadas, dejarlas vacías no manda clearDates', () => {
    const empty = { id: 'c2', startDate: null, endDate: null }
    expect(planningUpdateBody(empty, values(null, null), 'endDate').body).not.toHaveProperty('clearDates')
  })
})
