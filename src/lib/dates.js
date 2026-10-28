import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  isThisYear,
  isToday,
  isYesterday,
  parseISO,
  startOfToday,
} from 'date-fns'
import { es } from 'date-fns/locale'

const toDate = (value) => (value instanceof Date ? value : parseISO(value))

/** «30 oct» (o «30 oct 2025» si no es de este año). */
export function formatShortDate(value) {
  if (!value) return ''
  const date = toDate(value)
  return format(date, isThisYear(date) ? 'd MMM' : 'd MMM yyyy', { locale: es })
}

/** «30 de octubre de 2026». */
export function formatLongDate(value) {
  if (!value) return ''
  return format(toDate(value), "d 'de' MMMM 'de' yyyy", { locale: es })
}

/** «30 oct 2026, 3:45 p. m.» */
export function formatDateTime(value) {
  if (!value) return ''
  return format(toDate(value), "d MMM yyyy, h:mm aaaa", { locale: es })
}

/** «hace 5 minutos». */
export function formatRelative(value) {
  if (!value) return ''
  return formatDistanceToNow(toDate(value), { addSuffix: true, locale: es })
}

/** «Hoy», «Ayer» o la fecha completa: título de cada día en las listas agrupadas por día. */
export function dayLabel(value) {
  const date = toDate(value)
  if (isToday(date)) return 'Hoy'
  if (isYesterday(date)) return 'Ayer'
  return formatLongDate(date)
}

/**
 * Agrupa por día una lista ya ordenada (más recientes primero), conservando el orden.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} getDate
 * @returns {{ label: string, items: T[] }[]}
 */
export function groupByDay(items, getDate) {
  const days = []
  for (const item of items) {
    const label = dayLabel(getDate(item))
    if (days.at(-1)?.label !== label) days.push({ label, items: [] })
    days.at(-1).items.push(item)
  }
  return days
}

/** Date → «2026-10-30» (formato que espera el backend para LocalDate). */
export function toIsoDate(date) {
  return date ? format(date, 'yyyy-MM-dd') : null
}

/**
 * Fecha límite en lenguaje humano y su tono: «venció hace 2 días» (late), «hoy» / «mañana» / «en 3 días» (soon)
 * o «30 oct» (normal). Si la tarea ya está cerrada la fecha se muestra tal cual.
 * @returns {{ text: string, tone: 'late' | 'soon' | 'normal' }}
 */
export function describeDueDate(value, { closed = false } = {}) {
  const date = toDate(value)
  const days = differenceInCalendarDays(date, startOfToday())
  if (closed) return { text: formatShortDate(date), tone: 'normal' }
  if (days < 0) return { text: days === -1 ? 'venció ayer' : `venció hace ${-days} días`, tone: 'late' }
  if (days === 0) return { text: 'hoy', tone: 'soon' }
  if (days === 1) return { text: 'mañana', tone: 'soon' }
  if (days < 7) return { text: `en ${days} días`, tone: 'soon' }
  return { text: formatShortDate(date), tone: 'normal' }
}
