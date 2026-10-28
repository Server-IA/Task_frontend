import { describe, expect, it } from 'vitest'
import {
  blockingByPerson,
  changeKind,
  changeLabel,
  clampIndex,
  cycleOnDate,
  dailySummary,
  formatTimer,
  parseDateParam,
  previousDayLabel,
  shiftWorkday,
  stepStatus,
} from './daily'

const ana = { id: 'ana', fullName: 'Ana' }
const luis = { id: 'luis', fullName: 'Luis Muñoz Pérez' }
const ref = (id, code, assignees = []) => ({ id, code, title: code, state: { group: 'UNSTARTED' }, assignees })

describe('fechas', () => {
  it('acepta solo fechas válidas en la URL', () => {
    expect(parseDateParam('2026-10-28')).toBe('2026-10-28')
    expect(parseDateParam('2026-13-40')).toBeNull()
    expect(parseDateParam('ayer')).toBeNull()
    expect(parseDateParam(null)).toBeNull()
  })

  it('salta los fines de semana al ir al día anterior o siguiente', () => {
    // 26 oct 2026 es lunes
    expect(shiftWorkday('2026-10-26', -1)).toBe('2026-10-23')
    expect(shiftWorkday('2026-10-23', 1)).toBe('2026-10-26')
    expect(shiftWorkday('2026-10-28', -1)).toBe('2026-10-27')
  })

  it('nombra el día de «Ayer» (el viernes después de un fin de semana)', () => {
    expect(previousDayLabel('2026-10-28', '2026-10-27')).toBe('ayer, 27 oct')
    expect(previousDayLabel('2026-10-26', '2026-10-23')).toBe('el viernes 23 oct')
  })

  it('ubica la fecha en su ciclo y cuenta el día', () => {
    const cycles = [
      { id: 'old', startDate: '2026-10-01', endDate: '2026-10-14', closedAt: '2026-10-14T20:00:00Z' },
      { id: 's1', startDate: '2026-10-15', endDate: '2026-10-29' },
      { id: 'ideas', startDate: null, endDate: null },
    ]
    expect(cycleOnDate(cycles, '2026-10-27')).toMatchObject({ cycle: { id: 's1' }, day: 13, total: 15 })
    expect(cycleOnDate(cycles, '2026-10-10')).toMatchObject({ cycle: { id: 'old' }, day: 10 })
    expect(cycleOnDate(cycles, '2026-11-02')).toBeNull()
  })
})

describe('cambios de «Ayer»', () => {
  it('clasifica el texto del backend', () => {
    expect(changeKind('completó')).toBe('completed')
    expect(changeKind('movió a En revisión')).toBe('moved')
    expect(changeKind('creó')).toBe('created')
    expect(changeKind('comentó')).toBe('commented')
    expect(changeKind('actualizó')).toBe('updated')
    expect(changeLabel('movió a En curso')).toBe('Movió a En curso')
  })

  it('resume por tipo y cuenta cada tarea una vez', () => {
    const people = [
      {
        user: ana,
        yesterday: [
          { issue: ref('1', 'WEB-1'), change: 'movió a En curso' },
          { issue: ref('2', 'WEB-2'), change: 'comentó' },
        ],
        blockers: [{ issue: ref('15', 'WEB-15'), blockedBy: [] }],
      },
      {
        user: luis,
        yesterday: [
          { issue: ref('1', 'WEB-1'), change: 'movió a En curso' },
          { issue: ref('3', 'WEB-3'), change: 'completó' },
        ],
        blockers: [{ issue: ref('15', 'WEB-15'), blockedBy: [] }],
      },
    ]
    expect(dailySummary(people)).toEqual({ completed: 1, moved: 1, created: 0, commented: 1, updated: 0, blockers: 1 })
  })
})

describe('blockingByPerson', () => {
  it('avisa a quien tiene la tarea que bloquea a otra persona', () => {
    const web2 = ref('2', 'WEB-2', [luis])
    const people = [
      { user: ana, yesterday: [], today: [], blockers: [{ issue: ref('15', 'WEB-15', [ana]), blockedBy: [{ id: '2', code: 'WEB-2' }] }] },
      { user: luis, yesterday: [], today: [web2], blockers: [] },
    ]
    const result = blockingByPerson(people)
    expect(result.get('luis')).toEqual([{ code: 'WEB-2', blockedCode: 'WEB-15', ownerName: 'Ana' }])
    expect(result.has('ana')).toBe(false)
  })

  it('no inventa dueños: si la tarea que bloquea no aparece en la daily, no avisa', () => {
    const people = [{ user: ana, blockers: [{ issue: ref('15', 'WEB-15'), blockedBy: [{ id: '9', code: 'WEB-9' }] }] }]
    expect(blockingByPerson(people).size).toBe(0)
  })
})

describe('modo Presentar', () => {
  it('no se sale de la lista al avanzar o retroceder', () => {
    expect(clampIndex(-1, 3)).toBe(0)
    expect(clampIndex(3, 3)).toBe(2)
    expect(clampIndex(1, 3)).toBe(1)
    expect(clampIndex(0, 0)).toBe(0)
  })

  it('marca quién ya habló, quién habla y quién sigue', () => {
    expect([0, 1, 2, 3].map((index) => stepStatus(index, 1))).toEqual(['done', 'current', 'next', 'later'])
  })

  it('muestra la cuenta regresiva y lo excedido', () => {
    expect(formatTimer(120)).toBe('2:00')
    expect(formatTimer(84)).toBe('1:24')
    expect(formatTimer(0)).toBe('0:00')
    expect(formatTimer(-12)).toBe('+0:12')
  })
})
