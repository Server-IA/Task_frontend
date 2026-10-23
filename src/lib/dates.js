import { format, formatDistanceToNow, isThisYear, parseISO } from 'date-fns'
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

/** Date → «2026-10-30» (formato que espera el backend para LocalDate). */
export function toIsoDate(date) {
  return date ? format(date, 'yyyy-MM-dd') : null
}
