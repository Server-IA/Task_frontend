import { describe, expect, it } from 'vitest'
import { planningUpdateBody } from './planningDates'

const cycle = { id: 'c1', startDate: '2026-11-02', endDate: '2026-11-13' }
const values = (startDate, endDate) => ({ name: 'Ciclo 4', description: '', startDate, endDate })

describe('planningUpdateBody', () => {
  it('con las dos fechas manda ambas', () => {
    expect(planningUpdateBody(cycle, values('2026-11-03', '2026-11-14'), 'endDate')).toEqual({
      id: 'c1',
      name: 'Ciclo 4',
      description: '',
      startDate: '2026-11-03',
      endDate: '2026-11-14',
    })
  })

  it('quitar las dos manda las dos banderas', () => {
    expect(planningUpdateBody(cycle, values(null, null), 'endDate')).toEqual({
      id: 'c1',
      name: 'Ciclo 4',
      description: '',
      clearStartDate: true,
      clearEndDate: true,
    })
  })

  it('quitar solo una manda su bandera y deja la otra fecha', () => {
    expect(planningUpdateBody(cycle, values('2026-11-02', null), 'endDate')).toEqual({
      id: 'c1',
      name: 'Ciclo 4',
      description: '',
      startDate: '2026-11-02',
      clearEndDate: true,
    })
    expect(planningUpdateBody(cycle, values(null, '2026-11-13'), 'endDate')).toEqual({
      id: 'c1',
      name: 'Ciclo 4',
      description: '',
      clearStartDate: true,
      endDate: '2026-11-13',
    })
  })

  it('nunca manda una fecha junto con su bandera', () => {
    for (const [start, end] of [['2026-11-03', null], [null, '2026-11-14'], [null, null], ['2026-11-03', '2026-11-14']]) {
      const body = planningUpdateBody(cycle, values(start, end), 'endDate')
      expect(body.startDate && body.clearStartDate).toBeFalsy()
      expect(body.endDate && body.clearEndDate).toBeFalsy()
    }
  })

  it('en un módulo la fecha final es targetDate y su bandera clearTargetDate', () => {
    const module = { id: 'm1', startDate: '2026-11-20', targetDate: '2026-12-01' }
    expect(planningUpdateBody(module, values('2026-11-20', '2026-12-01'), 'targetDate')).toMatchObject({
      startDate: '2026-11-20',
      targetDate: '2026-12-01',
    })
    const cleared = planningUpdateBody(module, values('2026-11-20', null), 'targetDate')
    expect(cleared).toMatchObject({ startDate: '2026-11-20', clearTargetDate: true })
    expect(cleared).not.toHaveProperty('targetDate')
    expect(cleared).not.toHaveProperty('clearEndDate')
  })

  it('sin fechas guardadas, dejarlas vacías no manda banderas', () => {
    const empty = { id: 'c2', startDate: null, endDate: null }
    expect(planningUpdateBody(empty, values(null, null), 'endDate')).toEqual({ id: 'c2', name: 'Ciclo 4', description: '' })
  })
})
