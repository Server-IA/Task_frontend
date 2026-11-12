import { addDays, differenceInCalendarDays, format, isValid, isWeekend, parseISO } from 'date-fns'
import { dateLocale, getLanguage, stateName, t, tn } from '@/i18n'

/**
 * Cálculos de la daily (funciones puras): fechas hábiles, el resumen «desde ayer», quién bloquea a quién
 * y la navegación del modo «Presentar».
 */

/** @typedef {import('@/api/types').DailyPerson} DailyPerson */
/** @typedef {import('@/api/types').IssueRef} IssueRef */

/** Puntos a tratar: cuántos y de qué largo. */
export const AGENDA_MAX = 12
export const AGENDA_ITEM_MAX = 120

/** Bloques que se pueden exponer u ocultar, en el orden de los ajustes. */
export const DAILY_SECTIONS = [
  { key: 'summary', label: t('Resumen «desde ayer»'), hint: t('La franja con tareas movidas, completadas, comentarios y bloqueos.') },
  { key: 'yesterday', label: t('Ayer'), hint: t('Lo que hizo cada persona el último día con actividad.') },
  { key: 'today', label: t('Hoy'), hint: t('Lo que tiene en curso o con fecha para hoy.') },
  { key: 'blockers', label: t('Bloqueos'), hint: t('Sus tareas que esperan a otra tarea abierta.') },
  { key: 'note', label: t('Notas del día'), hint: t('El cuadro de acuerdos y temas para después.') },
]

/** Lo que vale un proyecto que nunca cambió los ajustes de su daily (igual que el backend). */
export const DEFAULT_DAILY_SETTINGS = {
  sections: { summary: true, yesterday: true, today: true, blockers: true, note: true },
  agenda: [],
}

/**
 * Ajustes del formulario → cuerpo de PUT /daily/settings: sin los puntos vacíos (los espacios de los extremos se
 * quitan).
 * @param {{ sections: Record<string, boolean>, agenda: string[] }} draft
 */
export function toSettingsBody(draft) {
  return {
    sections: draft.sections,
    agenda: draft.agenda.map((item) => item.trim()).filter(Boolean),
  }
}

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

/** «27 oct» («Oct 27» en inglés). */
const shortDay = (iso) => format(parseISO(iso), getLanguage() === 'en' ? 'MMM d' : 'd MMM', { locale: dateLocale() }).replace('.', '')

/** «mar 27 oct» («Tue, Oct 27» en inglés). */
export const weekdayDate = (iso) =>
  format(parseISO(iso), getLanguage() === 'en' ? 'EEE, MMM d' : 'EEE d MMM', { locale: dateLocale() }).replace('.', '')

/** «Luis», «Luis y Ana»: nombres unidos con «y». */
const joinNames = (names) => names.reduce((list, name) => (list ? t('{list} y {last}', { list, last: name }) : name), '')

/**
 * De qué día habla «Ayer» (el último día con actividad que eligió el backend): «ayer, 27 oct» o, tras un fin de
 * semana o días sin movimiento, «el viernes 23 oct».
 */
export function previousDayLabel(date, previousDate) {
  if (!date || !previousDate) return ''
  const days = differenceInCalendarDays(parseISO(date), parseISO(previousDate))
  const short = shortDay(previousDate)
  if (days === 1) return t('ayer, {date}', { date: short })
  return t('el {weekday} {date}', { weekday: format(parseISO(previousDate), 'EEEE', { locale: dateLocale() }), date: short })
}

/**
 * Fecha corta de «Ayer» para el título del bloque («vie 23 oct») cuando no es el día anterior a la reunión; null si
 * lo es (entonces «Ayer» ya lo dice todo).
 */
export function yesterdayDetail(date, previousDate) {
  if (!date || !previousDate) return null
  return differenceInCalendarDays(parseISO(date), parseISO(previousDate)) === 1 ? null : weekdayDate(previousDate)
}

/**
 * Tipo de cambio de «Ayer» (completó > movió a … > creó > comentó > actualizó). El backend lo manda en `kind`
 * (COMPLETED, MOVED…); con un backend anterior, que no lo trae, se deduce del texto de `change`.
 */
export function changeKind(change, kind) {
  if (kind) return kind.toLowerCase()
  const text = change ?? ''
  if (text.startsWith('completó')) return 'completed'
  if (text.startsWith('movió')) return 'moved'
  if (text.startsWith('creó')) return 'created'
  if (text.startsWith('comentó')) return 'commented'
  return 'updated'
}

/** Lo que el backend escribe en `change` cuando no es «movió a …», con su etiqueta. */
const CHANGE_LABELS = {
  completó: t('Completó'),
  creó: t('Creó'),
  comentó: t('Comentó'),
  actualizó: t('Actualizó'),
}

/**
 * «movió a En revisión» → «Movió a En revisión». Los textos conocidos del backend se muestran en el idioma elegido
 * (y el estado de «movió a …», con su nombre traducido); cualquier otro, tal como llega.
 */
export function changeLabel(change) {
  if (!change) return t('Actualizó')
  const moved = /^movió a (.+)$/.exec(change)
  if (moved) return t('Movió a {state}', { state: stateName(moved[1]) })
  return CHANGE_LABELS[change] ?? change[0].toUpperCase() + change.slice(1)
}

/** Contadores del resumen «desde ayer» que vienen del backend, en el orden en que se muestran. */
const SUMMARY_ITEMS = [
  ['moved', (count) => tn(count, 'tarea movida', 'tareas movidas')],
  ['started', (count) => tn(count, 'nueva en curso', 'nuevas en curso')],
  ['completed', (count) => tn(count, 'completada', 'completadas')],
  ['comments', (count) => tn(count, 'comentario', 'comentarios')],
]

/**
 * Resumen «desde ayer» del backend como frases cortas («2 tareas movidas», «1 nueva en curso»); solo los que no
 * son cero. Los bloqueos van aparte, en rojo.
 * @param {import('@/api/types').DailySummary | null | undefined} summary
 * @returns {{ items: { key: string, value: number, label: string }[], blocked: number }}
 */
export function summaryItems(summary) {
  const items = SUMMARY_ITEMS.filter(([key]) => (summary?.[key] ?? 0) > 0).map(([key, label]) => ({
    key,
    value: summary[key],
    label: label(summary[key]),
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
  if (days < 0) return { text: days === -1 ? t('venció ayer') : t('venció hace {days} días', { days: -days }), tone: 'late' }
  if (days === 0) return { text: t('vence hoy'), tone: 'soon' }
  if (days === 1) return { text: t('vence mañana'), tone: 'soon' }
  const tone = days < 7 ? 'soon' : 'normal'
  if (days < 14) return { text: t('vence en {days} días', { days }), tone }
  return { text: t('vence el {date}', { date: shortDay(dueDate) }), tone }
}

/**
 * Nota de una tarea de «Ayer»: el cambio de estado («Por hacer → En curso») cuando lo hubo; si no, qué hizo
 * («Comentó»). Verde si la completó.
 * @param {import('@/api/types').DailyChange} entry
 * @returns {{ text: string, tone: 'ok' | 'normal' }}
 */
export function changeNote(entry) {
  const tone = changeKind(entry?.change, entry?.kind) === 'completed' ? 'ok' : 'normal'
  if (entry?.fromState && entry?.toState) return { text: `${stateName(entry.fromState)} → ${stateName(entry.toState)}`, tone }
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
    notes.push({
      text: t('subtareas {done} de {total}', { done: issue.completedSubIssueCount ?? 0, total: issue.subIssueCount }),
      tone: 'normal',
    })
  }
  const others = (issue.assignees ?? []).filter((user) => user.id !== userId)
  if (others.length > 0) notes.push({ text: t('compartida con {names}', { names: joinNames(others.map(firstName)) }), tone: 'normal' })
  if (notes.length === 0 && issue.state?.name) notes.push({ text: stateName(issue.state), tone: 'normal' })
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
  return owners.length > 0 ? joinNames(owners.map(firstName)) : null
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
  const openText = tn(open, '{count} tarea abierta', '{count} tareas abiertas')
  if (!cycle) return openText
  const assigned = person.cycleAssignedCount ?? 0
  if (assigned === 0) return t('sin tareas en {cycle} · {open}', { cycle: cycle.name, open: openText })
  if (long) return tn(assigned, '{count} tarea asignada en {cycle}', '{count} tareas asignadas en {cycle}', { cycle: cycle.name })
  const done = person.cycleCompletedCount ?? 0
  return `${tn(assigned, '{count} tarea asignada', '{count} tareas asignadas')} · ${tn(done, '{count} hecha', '{count} hechas')}`
}

/** Índice válido dentro de `count` personas. */
export const clampIndex = (index, count) => Math.min(Math.max(index, 0), Math.max(count - 1, 0))

/** Estado de cada persona en el modo «Presentar»: ya habló, habla ahora, sigue o más adelante. */
export function stepStatus(index, current) {
  if (index < current) return 'done'
  if (index === current) return 'current'
  return index === current + 1 ? 'next' : 'later'
}
