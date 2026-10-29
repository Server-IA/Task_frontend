import { describe, expect, it } from 'vitest'
import {
  blockerOwner,
  blockingByPerson,
  changeKind,
  changeLabel,
  changeNote,
  clampIndex,
  cycleProgress,
  dueNote,
  formatTimer,
  parseDateParam,
  personMeta,
  previousDayLabel,
  shiftWorkday,
  stepStatus,
  summaryItems,
  todayNotes,
  yesterdayDetail,
} from './daily'

const ana = { id: 'ana', fullName: 'Ana' }
const luis = { id: 'luis', fullName: 'Luis Muñoz Pérez' }
const ref = (id, code, assignees = [], extra = {}) => ({
  id,
  code,
  title: code,
  state: { group: 'UNSTARTED', name: 'Por hacer' },
  assignees,
  ...extra,
})

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
    // «Ayer» es el último día con actividad: tras días sin movimiento puede ser varios días antes
    expect(previousDayLabel('2026-10-28', '2026-10-22')).toBe('el jueves 22 oct')
  })

  it('el bloque «Ayer» lleva la fecha solo si no fue el día anterior', () => {
    expect(yesterdayDetail('2026-10-28', '2026-10-27')).toBeNull()
    expect(yesterdayDetail('2026-10-26', '2026-10-23')).toBe('vie 23 oct')
    expect(yesterdayDetail('2026-10-28', '2026-10-22')).toBe('jue 22 oct')
    expect(yesterdayDetail('2026-10-28', undefined)).toBeNull()
  })

  it('cuenta el día del ciclo en curso que manda el backend', () => {
    const cycle = { id: 's1', name: 'Sprint 1', startDate: '2026-10-15', endDate: '2026-10-29' }
    expect(cycleProgress(cycle, '2026-10-27')).toEqual({ day: 13, total: 15 })
    expect(cycleProgress(cycle, '2026-10-15')).toEqual({ day: 1, total: 15 })
    expect(cycleProgress(cycle, '2026-11-02')).toBeNull()
    expect(cycleProgress(null, '2026-10-27')).toBeNull()
    expect(cycleProgress({ name: 'Ideas', startDate: null, endDate: null }, '2026-10-27')).toBeNull()
  })

  it('cuenta la fecha límite desde el día de la daily, no desde hoy', () => {
    expect(dueNote('2026-10-25', '2026-10-27')).toEqual({ text: 'venció hace 2 días', tone: 'late' })
    expect(dueNote('2026-10-26', '2026-10-27')).toEqual({ text: 'venció ayer', tone: 'late' })
    expect(dueNote('2026-10-27', '2026-10-27')).toEqual({ text: 'vence hoy', tone: 'soon' })
    expect(dueNote('2026-10-28', '2026-10-27')).toEqual({ text: 'vence mañana', tone: 'soon' })
    expect(dueNote('2026-10-30', '2026-10-27')).toEqual({ text: 'vence en 3 días', tone: 'soon' })
    expect(dueNote('2026-11-05', '2026-10-27')).toEqual({ text: 'vence en 9 días', tone: 'normal' })
    expect(dueNote('2026-12-03', '2026-10-27')).toEqual({ text: 'vence el 3 dic', tone: 'normal' })
    expect(dueNote(null, '2026-10-27')).toBeNull()
  })
})

describe('resumen «desde ayer»', () => {
  it('usa los contadores del backend y omite los que son cero', () => {
    const { items, blocked } = summaryItems({ moved: 2, started: 1, completed: 0, comments: 4, blocked: 1 })
    expect(items).toEqual([
      { key: 'moved', value: 2, label: 'tareas movidas' },
      { key: 'started', value: 1, label: 'nueva en curso' },
      { key: 'comments', value: 4, label: 'comentarios' },
    ])
    expect(blocked).toBe(1)
  })

  it('usa el singular y aguanta un resumen vacío', () => {
    expect(summaryItems({ moved: 1, completed: 1, comments: 1 }).items.map((item) => item.label)).toEqual([
      'tarea movida',
      'completada',
      'comentario',
    ])
    expect(summaryItems(null)).toEqual({ items: [], blocked: 0 })
  })
})

describe('notas de cada tarea', () => {
  it('clasifica el texto del backend', () => {
    expect(changeKind('completó')).toBe('completed')
    expect(changeKind('movió a En revisión')).toBe('moved')
    expect(changeKind('creó')).toBe('created')
    expect(changeKind('comentó')).toBe('commented')
    expect(changeKind('actualizó')).toBe('updated')
    expect(changeLabel('movió a En curso')).toBe('Movió a En curso')
  })

  it('«Ayer» muestra el cambio de estado y, sin él, qué hizo', () => {
    expect(changeNote({ change: 'movió a En curso', fromState: 'Por hacer', toState: 'En curso' })).toEqual({
      text: 'Por hacer → En curso',
      tone: 'normal',
    })
    expect(changeNote({ change: 'completó', fromState: 'En revisión', toState: 'Hecho' })).toEqual({
      text: 'En revisión → Hecho',
      tone: 'ok',
    })
    expect(changeNote({ change: 'comentó', fromState: null, toState: null })).toEqual({ text: 'Comentó', tone: 'normal' })
  })

  it('«Hoy» junta la fecha límite, las subtareas y con quién la comparte', () => {
    const issue = ref('19', 'WEB-19', [ana, luis], { dueDate: '2026-10-28', subIssueCount: 3, completedSubIssueCount: 1 })
    expect(todayNotes(issue, 'ana', '2026-10-27')).toEqual([
      { text: 'vence mañana', tone: 'soon' },
      { text: 'subtareas 1 de 3', tone: 'normal' },
      { text: 'compartida con Luis', tone: 'normal' },
    ])
  })

  it('«Hoy» sin fecha ni nada más muestra el estado', () => {
    expect(todayNotes(ref('4', 'WEB-4', [ana]), 'ana', '2026-10-27')).toEqual([{ text: 'Por hacer', tone: 'normal' }])
  })
})

describe('bloqueos', () => {
  it('el dueño de la tarea que bloquea viene en blockedBy (sin la persona bloqueada)', () => {
    expect(blockerOwner(ref('2', 'WEB-2', [luis]), 'ana')).toBe('Luis')
    expect(blockerOwner(ref('2', 'WEB-2', [luis, ana]), 'ana')).toBe('Luis')
    expect(blockerOwner(ref('2', 'WEB-2', [ana]), 'ana')).toBeNull()
    // De un proyecto sin acceso llega sin título ni asignados
    expect(blockerOwner({ id: '9', code: 'AMC-9', title: null, assignees: [] }, 'ana')).toBeNull()
  })

  it('avisa a quien tiene la tarea que bloquea a otra persona, aunque no aparezca en su daily', () => {
    const people = [
      { user: ana, blockers: [{ issue: ref('15', 'WEB-15', [ana]), blockedBy: [ref('2', 'WEB-2', [luis])] }] },
      { user: luis, blockers: [] },
    ]
    const result = blockingByPerson(people)
    expect(result.get('luis')).toEqual([{ code: 'WEB-2', blockedCode: 'WEB-15', ownerName: 'Ana' }])
    expect(result.has('ana')).toBe(false)
  })

  it('no avisa si la tarea que bloquea es de la misma persona o no tiene asignados', () => {
    const people = [
      {
        user: luis,
        blockers: [{ issue: ref('15', 'WEB-15', [luis]), blockedBy: [ref('2', 'WEB-2', [luis]), ref('9', 'WEB-9')] }],
      },
    ]
    expect(blockingByPerson(people).size).toBe(0)
  })
})

describe('línea de cada persona', () => {
  const cycle = { id: 's1', name: 'Sprint 1' }

  it('con ciclo en curso: sus tareas del ciclo y cuántas hizo', () => {
    const person = { openCount: 3, cycleAssignedCount: 4, cycleCompletedCount: 1 }
    expect(personMeta(person, cycle)).toBe('4 tareas asignadas · 1 hecha')
    expect(personMeta({ ...person, cycleAssignedCount: 1, cycleCompletedCount: 0 }, cycle)).toBe('1 tarea asignada · 0 hechas')
    expect(personMeta(person, cycle, { long: true })).toBe('4 tareas asignadas en Sprint 1')
  })

  it('sin tareas en el ciclo o sin ciclo: sus tareas abiertas', () => {
    expect(personMeta({ openCount: 2, cycleAssignedCount: 0, cycleCompletedCount: 0 }, cycle)).toBe(
      'sin tareas en Sprint 1 · 2 tareas abiertas',
    )
    expect(personMeta({ openCount: 1, cycleAssignedCount: 0, cycleCompletedCount: 0 }, null)).toBe('1 tarea abierta')
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
