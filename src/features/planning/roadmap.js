import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Escalas de la hoja de ruta: píxeles por día, la unidad de cada columna, cuántas columnas como mínimo
 * y cuánto margen dejar antes y después de lo planificado.
 */
export const ROADMAP_SCALES = {
  weeks: {
    label: 'Semanas',
    pxPerDay: 14,
    start: (date) => startOfWeek(date, { weekStartsOn: 1 }),
    add: addWeeks,
    minColumns: 10,
    before: 1,
    after: 2,
    column: (date) => format(date, 'd'),
    group: (date) => capitalize(format(date, 'LLLL', { locale: es })),
    groupStart: startOfMonth,
    addGroup: addMonths,
  },
  months: {
    label: 'Meses',
    pxPerDay: 4,
    start: startOfMonth,
    add: addMonths,
    minColumns: 6,
    before: 1,
    after: 1,
    column: (date) => capitalize(format(date, 'LLL', { locale: es }).replace('.', '')),
    group: (date) => format(date, 'yyyy'),
    groupStart: (date) => new Date(date.getFullYear(), 0, 1),
    addGroup: (date, amount) => new Date(date.getFullYear() + amount, 0, 1),
  },
  quarters: {
    label: 'Trimestre',
    pxPerDay: 1.6,
    start: startOfQuarter,
    add: addQuarters,
    minColumns: 4,
    before: 0,
    after: 1,
    column: (date) => `T${Math.floor(date.getMonth() / 3) + 1}`,
    group: (date) => format(date, 'yyyy'),
    groupStart: (date) => new Date(date.getFullYear(), 0, 1),
    addGroup: (date, amount) => new Date(date.getFullYear() + amount, 0, 1),
  },
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

/** Fecha de fin de un ciclo (endDate) o de un módulo (targetDate). */
export const itemEnd = (item) => item.endDate ?? item.targetDate ?? null

/**
 * Inicio y fin de un elemento en la línea de tiempo. Con una sola fecha ocupa ese día;
 * sin ninguna devuelve null (va a la lista «Sin fechas»).
 * @returns {{ start: Date, end: Date } | null}
 */
export function itemRange(item) {
  const start = item.startDate ? parseISO(item.startDate) : null
  const end = itemEnd(item) ? parseISO(itemEnd(item)) : null
  if (!start && !end) return null
  return { start: start ?? end, end: end ?? start }
}

/**
 * Columnas, grupos del encabezado (meses o años) y posición de hoy para los elementos con fechas.
 * Todo en píxeles desde el borde izquierdo de la línea de tiempo.
 * @param {{ startDate?: string, endDate?: string, targetDate?: string }[]} items
 * @param {keyof ROADMAP_SCALES} scaleKey
 * @param {Date} today
 * @param {number} minWidth ancho mínimo en píxeles: se agregan columnas hasta llenarlo
 */
export function buildTimeline(items, scaleKey, today = new Date(), minWidth = 0) {
  const scale = ROADMAP_SCALES[scaleKey]
  const day = startOfDay(today)
  const ranges = items.map(itemRange).filter(Boolean)
  const earliest = minDate([day, ...ranges.map((range) => range.start)])
  const latest = maxDate([day, ...ranges.map((range) => range.end)])

  const start = scale.add(scale.start(earliest), -scale.before)
  let end = scale.add(scale.start(latest), scale.after + 1)
  if (isBefore(end, scale.add(start, scale.minColumns))) end = scale.add(start, scale.minColumns)

  const x = (date) => differenceInCalendarDays(startOfDay(date), start) * scale.pxPerDay
  while (x(end) < minWidth) end = scale.add(end, 1)
  const width = x(end)

  const columns = []
  for (let cursor = start; isBefore(cursor, end); cursor = scale.add(cursor, 1)) {
    const next = scale.add(cursor, 1)
    columns.push({
      key: cursor.toISOString(),
      label: scale.column(cursor),
      x: x(cursor),
      width: x(next) - x(cursor),
      current: !isBefore(day, cursor) && isBefore(day, next),
    })
  }

  // Grupos del encabezado (meses o años), recortados al rango visible
  const groups = []
  for (let cursor = scale.groupStart(start); isBefore(cursor, end); cursor = scale.addGroup(cursor, 1)) {
    const from = isAfter(cursor, start) ? cursor : start
    const nextGroup = scale.addGroup(cursor, 1)
    const to = isBefore(nextGroup, end) ? nextGroup : end
    groups.push({ key: cursor.toISOString(), label: scale.group(cursor), x: x(from), width: x(to) - x(from) })
  }

  return {
    start,
    end,
    width,
    columns,
    groups,
    // La línea de hoy va a mitad del día
    todayX: x(day) + scale.pxPerDay / 2,
    /** Posición y ancho de una barra (mínimo un día y nunca menos de 6 px). */
    bar: (item) => {
      const range = itemRange(item)
      if (!range) return null
      const left = x(range.start)
      return { left, width: Math.max(6, x(addDays(range.end, 1)) - left) }
    },
  }
}
