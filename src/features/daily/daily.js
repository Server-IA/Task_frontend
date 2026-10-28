import { addDays, differenceInCalendarDays, format, isValid, isWeekend, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Cálculos de la daily (funciones puras): fechas hábiles, el resumen «desde ayer», quién bloquea a quién
 * y la navegación y el tiempo del modo «Presentar».
 */

/** @typedef {import('@/api/types').DailyPerson} DailyPerson */
/** @typedef {import('@/api/types').IssueRef} IssueRef */

/** Tiempo sugerido por persona en el modo «Presentar» (solo visual). */
export const PRESENT_SECONDS = 120

/** Largo máximo de la nota del día. */
export const NOTE_MAX_LENGTH = 5000

/** Fecha local como «2026-10-28». */
export const toIsoDay = (date) => format(date, 'yyyy-MM-dd')

/** `?date=` válido («2026-10-28») o null. */
export function parseDateParam(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return isValid(parseISO(value)) ? value : null
}

/**
 * Día hábil anterior (`delta` = -1) o siguiente (+1): salta sábados y domingos, como la daily del backend
 * (el lunes mira el viernes).
 */
export function shiftWorkday(iso, delta) {
  let date = parseISO(iso)
  do {
    date = addDays(date, delta)
  } while (isWeekend(date))
  return toIsoDay(date)
}

/** «mar 27 oct». */
export const weekdayDate = (iso) => format(parseISO(iso), 'EEE d MMM', { locale: es }).replace('.', '')

/**
 * De qué día habla «Ayer» (el último día con actividad que eligió el backend): «ayer, 27 oct» o, tras un fin de
 * semana o días sin movimiento, «el viernes 23 oct».
 */
export function previousDayLabel(date, previousDate) {
  if (!date || !previousDate) return ''
  const days = differenceInCalendarDays(parseISO(date), parseISO(previousDate))
  const short = format(parseISO(previousDate), 'd MMM', { locale: es }).replace('.', '')
  if (days === 1) return `ayer, ${short}`
  return `el ${format(parseISO(previousDate), 'EEEE', { locale: es })} ${short}`
}

/**
 * Fecha corta de «Ayer» para el título del bloque («vie 23 oct») cuando no es el día anterior a la reunión; null si
 * lo es (entonces «Ayer» ya lo dice todo).
 */
export function yesterdayDetail(date, previousDate) {
  if (!date || !previousDate) return null
  return differenceInCalendarDays(parseISO(date), parseISO(previousDate)) === 1 ? null : weekdayDate(previousDate)
}

/** Tipo de cambio de «Ayer» según el texto del backend (completó > movió a … > creó > comentó > actualizó). */
export function changeKind(change) {
  const text = change ?? ''
  if (text.startsWith('completó')) return 'completed'
  if (text.startsWith('movió')) return 'moved'
  if (text.startsWith('creó')) return 'created'
  if (text.startsWith('comentó')) return 'commented'
  return 'updated'
}

/** «movió a En revisión» → «Movió a En revisión». */
export const changeLabel = (change) => (change ? change[0].toUpperCase() + change.slice(1) : 'Actualizó')

/** Contadores del resumen «desde ayer» que vienen del backend, en el orden en que se muestran. */
const SUMMARY_ITEMS = [
  ['moved', 'tarea movida', 'tareas movidas'],
  ['started', 'nueva en curso', 'nuevas en curso'],
  ['completed', 'completada', 'completadas'],
  ['comments', 'comentario', 'comentarios'],
]

/**
 * Resumen «desde ayer» del backend como frases cortas («2 tareas movidas», «1 nueva en curso»); solo los que no
 * son cero. Los bloqueos van aparte, en rojo.
 * @param {import('@/api/types').DailySummary | null | undefined} summary
 * @returns {{ items: { key: string, value: number, label: string }[], blocked: number }}
 */
export function summaryItems(summary) {
  const items = SUMMARY_ITEMS.filter(([key]) => (summary?.[key] ?? 0) > 0).map(([key, singular, plural]) => ({
    key,
    value: summary[key],
    label: summary[key] === 1 ? singular : plural,
  }))
  return { items, blocked: summary?.blocked ?? 0 }
}

/**
 * En qué día del ciclo va la fecha («día 13 de 15»); null si el ciclo no tiene fechas o la fecha queda fuera.
 * @param {import('@/api/types').DailyCycle | null | undefined} cycle el ciclo en curso que devuelve la daily
 * @param {string} iso
 * @returns {{ day: number, total: number } | null}
 */
export function cycleProgress(cycle, iso) {
  if (!cycle?.startDate || !cycle?.endDate || !iso) return null
  const day = differenceInCalendarDays(parseISO(iso), parseISO(cycle.startDate)) + 1
  const total = differenceInCalendarDays(parseISO(cycle.endDate), parseISO(cycle.startDate)) + 1
  return day >= 1 && day <= total ? { day, total } : null
}

/** «Luis Muñoz Pérez» → «Luis». */
export const firstName = (user) => user?.fullName?.trim().split(/\s+/)[0] ?? ''

/**
 * Fecha límite contada desde el día de la daily (no desde hoy): «venció hace 2 días», «vence hoy»,
 * «vence mañana», «vence en 9 días» o «vence el 3 dic». Rojo si venció y ámbar si vence en menos de una semana.
 * @param {string | null | undefined} dueDate
 * @param {string} iso día de la daily
 * @returns {{ text: string, tone: 'late' | 'soon' | 'normal' } | null}
 */
export function dueNote(dueDate, iso) {
  if (!dueDate || !iso) return null
  const days = differenceInCalendarDays(parseISO(dueDate), parseISO(iso))
  if (days < 0) return { text: days === -1 ? 'venció ayer' : `venció hace ${-days} días`, tone: 'late' }
  if (days === 0) return { text: 'vence hoy', tone: 'soon' }
  if (days === 1) return { text: 'vence mañana', tone: 'soon' }
  const tone = days < 7 ? 'soon' : 'normal'
  if (days < 14) return { text: `vence en ${days} días`, tone }
  return { text: `vence el ${format(parseISO(dueDate), 'd MMM', { locale: es }).replace('.', '')}`, tone }
}

/**
 * Nota de una tarea de «Ayer»: el cambio de estado («Por hacer → En curso») cuando lo hubo; si no, qué hizo
 * («Comentó»). Verde si la completó.
 * @param {import('@/api/types').DailyChange} entry
 * @returns {{ text: string, tone: 'ok' | 'normal' }}
 */
export function changeNote(entry) {
  const tone = changeKind(entry?.change) === 'completed' ? 'ok' : 'normal'
  if (entry?.fromState && entry?.toState) return { text: `${entry.fromState} → ${entry.toState}`, tone }
  return { text: changeLabel(entry?.change), tone }
}

/**
 * Notas de una tarea de «Hoy»: su fecha límite, el avance de sus subtareas y con quién la comparte. Sin nada de
 * eso, el nombre de su estado.
 * @param {IssueRef} issue
 * @param {string | undefined} userId la persona de la tarjeta
 * @param {string} iso día de la daily
 * @returns {{ text: string, tone: 'late' | 'soon' | 'normal' }[]}
 */
export function todayNotes(issue, userId, iso) {
  const notes = []
  const due = dueNote(issue.dueDate, iso)
  if (due) notes.push(due)
  if ((issue.subIssueCount ?? 0) > 0) {
    notes.push({ text: `subtareas ${issue.completedSubIssueCount ?? 0} de ${issue.subIssueCount}`, tone: 'normal' })
  }
  const others = (issue.assignees ?? []).filter((user) => user.id !== userId)
  if (others.length > 0) notes.push({ text: `compartida con ${others.map(firstName).join(' y ')}`, tone: 'normal' })
  if (notes.length === 0 && issue.state?.name) notes.push({ text: issue.state.name, tone: 'normal' })
  return notes
}

/**
 * Quién tiene la tarea que bloquea (sin contar a la persona bloqueada): «Luis», «Luis y Ana» o null.
 * Las tareas de un proyecto sin acceso llegan sin asignados.
 * @param {IssueRef} by tarea que bloquea
 * @param {string | undefined} userId
 */
export function blockerOwner(by, userId) {
  const owners = (by.assignees ?? []).filter((user) => user.id !== userId)
  return owners.length > 0 ? owners.map(firstName).join(' y ') : null
}

/**
 * Quién bloquea a quién: por persona, sus tareas que bloquean tareas de otros («Su WEB-2 bloquea a WEB-15 de
 * Ana»). Los asignados de cada tarea que bloquea vienen en `blockedBy`.
 * @param {DailyPerson[]} people
 * @returns {Map<string, { code: string, blockedCode: string, ownerName: string }[]>} id de persona → avisos
 */
export function blockingByPerson(people) {
  const result = new Map()
  for (const person of people ?? []) {
    for (const blocker of person.blockers ?? []) {
      for (const by of blocker.blockedBy ?? []) {
        for (const assignee of by.assignees ?? []) {
          if (assignee.id === person.user?.id) continue
          const list = result.get(assignee.id) ?? []
          if (!list.some((item) => item.code === by.code && item.blockedCode === blocker.issue?.code)) {
            list.push({ code: by.code, blockedCode: blocker.issue?.code, ownerName: firstName(person.user) })
          }
          result.set(assignee.id, list)
        }
      }
    }
  }
  return result
}

/**
 * Línea de cada persona: con ciclo en curso, «3 tareas asignadas · 1 hecha» (las suyas del ciclo); sin ciclo,
 * «4 tareas abiertas». En «Presentar» (`long`), «4 tareas asignadas en Sprint 1».
 * @param {DailyPerson} person
 * @param {import('@/api/types').DailyCycle | null | undefined} cycle
 * @param {{ long?: boolean }} [options]
 */
export function personMeta(person, cycle, { long = false } = {}) {
  const open = person.openCount ?? 0
  const openText = `${open} ${open === 1 ? 'tarea abierta' : 'tareas abiertas'}`
  if (!cycle) return openText
  const assigned = person.cycleAssignedCount ?? 0
  if (assigned === 0) return `sin tareas en ${cycle.name} · ${openText}`
  const assignedText = `${assigned} ${assigned === 1 ? 'tarea asignada' : 'tareas asignadas'}`
  if (long) return `${assignedText} en ${cycle.name}`
  const done = person.cycleCompletedCount ?? 0
  return `${assignedText} · ${done} ${done === 1 ? 'hecha' : 'hechas'}`
}

/** Índice válido dentro de `count` personas. */
export const clampIndex = (index, count) => Math.min(Math.max(index, 0), Math.max(count - 1, 0))

/** Estado de cada persona en el modo «Presentar»: ya habló, habla ahora, sigue o más adelante. */
export function stepStatus(index, current) {
  if (index < current) return 'done'
  if (index === current) return 'current'
  return index === current + 1 ? 'next' : 'later'
}

/** Cuenta regresiva «1:24»; pasado el tiempo, lo excedido con «+» («+0:12»). */
export function formatTimer(remainingSeconds) {
  const over = remainingSeconds < 0
  const total = Math.abs(Math.trunc(remainingSeconds))
  const text = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
  return over ? `+${text}` : text
}
