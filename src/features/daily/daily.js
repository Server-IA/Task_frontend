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

/** De qué día habla «Ayer»: «ayer, 27 oct» o, tras un fin de semana, «el viernes 23 oct». */
export function previousDayLabel(date, previousDate) {
  if (!date || !previousDate) return ''
  const days = differenceInCalendarDays(parseISO(date), parseISO(previousDate))
  const short = format(parseISO(previousDate), 'd MMM', { locale: es }).replace('.', '')
  if (days === 1) return `ayer, ${short}`
  return `el ${format(parseISO(previousDate), 'EEEE', { locale: es })} ${short}`
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

/**
 * Resumen «desde ayer»: tareas por tipo de cambio y tareas bloqueadas (cada tarea cuenta una vez aunque
 * aparezca en varias personas).
 * @param {DailyPerson[]} people
 */
export function dailySummary(people) {
  const seen = { completed: new Set(), moved: new Set(), created: new Set(), commented: new Set(), updated: new Set() }
  const blocked = new Set()
  for (const person of people ?? []) {
    for (const entry of person.yesterday ?? []) seen[changeKind(entry.change)].add(entry.issue?.id)
    for (const blocker of person.blockers ?? []) blocked.add(blocker.issue?.id)
  }
  return {
    completed: seen.completed.size,
    moved: seen.moved.size,
    created: seen.created.size,
    commented: seen.commented.size,
    updated: seen.updated.size,
    blockers: blocked.size,
  }
}

/**
 * Ciclo que contiene la fecha y en qué día va («día 13 de 15»). Si varios la contienen, el abierto.
 * @param {import('@/api/types').CycleResponse[]} cycles
 * @returns {{ cycle: import('@/api/types').CycleResponse, day: number, total: number } | null}
 */
export function cycleOnDate(cycles, iso) {
  const date = parseISO(iso)
  const matches = (cycles ?? [])
    .filter((cycle) => cycle.startDate && cycle.endDate)
    .map((cycle) => ({
      cycle,
      day: differenceInCalendarDays(date, parseISO(cycle.startDate)) + 1,
      total: differenceInCalendarDays(parseISO(cycle.endDate), parseISO(cycle.startDate)) + 1,
    }))
    .filter(({ day, total }) => day >= 1 && day <= total)
  return matches.find(({ cycle }) => !cycle.closedAt) ?? matches[0] ?? null
}

/**
 * Todas las tareas que aparecen en la daily, por id (para saber de quién es una tarea que bloquea).
 * @param {DailyPerson[]} people
 * @returns {Map<string, IssueRef>}
 */
export function issueIndex(people) {
  const index = new Map()
  for (const person of people ?? []) {
    for (const entry of person.yesterday ?? []) if (entry.issue) index.set(entry.issue.id, entry.issue)
    for (const issue of person.today ?? []) index.set(issue.id, issue)
    for (const blocker of person.blockers ?? []) if (blocker.issue) index.set(blocker.issue.id, blocker.issue)
  }
  return index
}

/** «Luis Muñoz Pérez» → «Luis». */
export const firstName = (user) => user?.fullName?.trim().split(/\s+/)[0] ?? ''

/**
 * Quién bloquea a quién: por persona, sus tareas que bloquean tareas de otros. Solo se sabe cuando la tarea
 * que bloquea aparece en la daily con sus asignados.
 * @param {DailyPerson[]} people
 * @returns {Map<string, { code: string, blockedCode: string, ownerName: string }[]>} id de persona → avisos
 */
export function blockingByPerson(people) {
  const index = issueIndex(people)
  const result = new Map()
  for (const person of people ?? []) {
    for (const blocker of person.blockers ?? []) {
      for (const by of blocker.blockedBy ?? []) {
        for (const assignee of index.get(by.id)?.assignees ?? []) {
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
