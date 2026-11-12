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
import { dateLocale, getLanguage, t } from '@/i18n'

const toDate = (value) => (value instanceof Date ? value : parseISO(value))

/** El patrón de date-fns del idioma elegido: en inglés el mes va antes del día («Oct 30, 2026»). */
const pattern = (spanish, english) => (getLanguage() === 'en' ? english : spanish)

/** «30 oct» (o «30 oct 2025» si no es de este año). En inglés, «Oct 30» y «Oct 30, 2025». */
export function formatShortDate(value) {
  if (!value) return ''
  const date = toDate(value)
  return format(date, isThisYear(date) ? pattern('d MMM', 'MMM d') : pattern('d MMM yyyy', 'MMM d, yyyy'), { locale: dateLocale() })
}

/** «30 de octubre de 2026». En inglés, «October 30, 2026». */
export function formatLongDate(value) {
  if (!value) return ''
  return format(toDate(value), pattern("d 'de' MMMM 'de' yyyy", 'MMMM d, yyyy'), { locale: dateLocale() })
}

/** «30 oct 2026, 3:45 p. m.» En inglés, «Oct 30, 2026, 3:45 PM». */
export function formatDateTime(value) {
  if (!value) return ''
  return format(toDate(value), pattern('d MMM yyyy, h:mm aaaa', 'MMM d, yyyy, h:mm a'), { locale: dateLocale() })
}

/** «hace 5 minutos». */
export function formatRelative(value) {
  if (!value) return ''
  return formatDistanceToNow(toDate(value), { addSuffix: true, locale: dateLocale() })
}

/** «Hoy», «Ayer» o la fecha completa: título de cada día en las listas agrupadas por día. */
export function dayLabel(value) {
  const date = toDate(value)
  if (isToday(date)) return t('Hoy')
  if (isYesterday(date)) return t('Ayer')
  return formatLongDate(date)
}

/**
 * La hora de algo dentro de su día: de hoy, «hace 20 minutos»; de otro día (ya dicho en el título del grupo), «14:05»
 * («2:05 PM» en inglés).
 */
export function timeInDay(value) {
  if (!value) return ''
  const date = toDate(value)
  return isToday(date) ? formatRelative(date) : format(date, pattern('HH:mm', 'h:mm a'), { locale: dateLocale() })
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
  if (days < 0) return { text: days === -1 ? t('venció ayer') : t('venció hace {count} días', { count: -days }), tone: 'late' }
  if (days === 0) return { text: t('hoy'), tone: 'soon' }
  if (days === 1) return { text: t('mañana'), tone: 'soon' }
  if (days < 7) return { text: t('en {count} días', { count: days }), tone: 'soon' }
  return { text: formatShortDate(date), tone: 'normal' }
}
