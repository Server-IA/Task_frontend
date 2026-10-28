import { differenceInCalendarDays, endOfWeek, parseISO, startOfDay } from 'date-fns'

/** Grupos de «Mi trabajo» en orden; `tone` decide el color del encabezado. */
export const DUE_GROUPS = [
  { key: 'overdue', label: 'Vencidas', tone: 'late' },
  { key: 'today', label: 'Hoy', tone: 'normal' },
  { key: 'week', label: 'Esta semana', tone: 'normal' },
  { key: 'later', label: 'Más adelante', tone: 'normal' },
  { key: 'none', label: 'Sin fecha', tone: 'normal' },
]

/**
 * Grupo de una fecha límite respecto a `today`: vencida, hoy, esta semana (hasta el domingo; la semana
 * empieza el lunes), más adelante o sin fecha.
 * @param {string | null | undefined} dueDate 'yyyy-MM-dd'
 * @param {Date} today
 * @returns {'overdue' | 'today' | 'week' | 'later' | 'none'}
 */
export function dueGroup(dueDate, today = new Date()) {
  if (!dueDate) return 'none'
  const days = differenceInCalendarDays(parseISO(dueDate), startOfDay(today))
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  const daysToSunday = differenceInCalendarDays(endOfWeek(today, { weekStartsOn: 1 }), startOfDay(today))
  return days <= daysToSunday ? 'week' : 'later'
}

/**
 * Agrupa las tareas por fecha límite conservando el orden en que llegan (el backend ya las ordena por fecha).
 * Solo devuelve los grupos con tareas.
 * @template {{ dueDate?: string | null }} T
 * @param {T[]} issues
 * @param {Date} today
 * @returns {{ key: string, label: string, tone: string, issues: T[] }[]}
 */
export function groupByDue(issues, today = new Date()) {
  const buckets = Object.fromEntries(DUE_GROUPS.map((group) => [group.key, []]))
  for (const issue of issues) buckets[dueGroup(issue.dueDate, today)].push(issue)
  return DUE_GROUPS.filter((group) => buckets[group.key].length > 0).map((group) => ({ ...group, issues: buckets[group.key] }))
}

/**
 * Próxima fecha límite desde hoy (incluido): la primera tarea con fecha de hoy en adelante.
 * @template {{ dueDate?: string | null }} T
 * @param {T[]} issues
 * @returns {T | undefined}
 */
export function nextDue(issues, today = new Date()) {
  return issues
    .filter((issue) => issue.dueDate && differenceInCalendarDays(parseISO(issue.dueDate), startOfDay(today)) >= 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
}
