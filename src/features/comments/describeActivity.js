import { formatShortDate } from '@/lib/dates'
import { PRIORITY_LABELS } from '@/features/issues/constants'

const quote = (value) => `«${value}»`
const date = (value) => (value ? formatShortDate(value) : null)

/**
 * Frase legible para una entrada del historial (sin el nombre de quien la hizo).
 * Ej.: «cambió el estado de «Todo» a «Done»».
 * @param {import('@/api/types').ActivityResponse} activity
 */
export function describeActivity({ field, oldValue, newValue }) {
  switch (field) {
    case 'CREATED':
      return 'creó la tarea'
    case 'TITLE':
      return `cambió el título a ${quote(newValue)}`
    case 'DESCRIPTION':
      return 'actualizó la descripción'
    case 'STATE':
      return `cambió el estado de ${quote(oldValue)} a ${quote(newValue)}`
    case 'PRIORITY':
      return `cambió la prioridad de ${PRIORITY_LABELS[oldValue] ?? oldValue} a ${PRIORITY_LABELS[newValue] ?? newValue}`
    case 'PARENT':
      return newValue ? `estableció como padre a ${newValue}` : `quitó el padre ${oldValue ?? ''}`.trim()
    case 'START_DATE':
      return describeDate('la fecha de inicio', oldValue, newValue)
    case 'DUE_DATE':
      return describeDate('la fecha límite', oldValue, newValue)
    case 'ASSIGNEES':
      if (!newValue) return 'quitó a todos los asignados'
      return oldValue ? `cambió los asignados a ${newValue}` : `asignó a ${newValue}`
    case 'LABELS':
      if (!newValue) return 'quitó todas las etiquetas'
      return oldValue ? `cambió las etiquetas a ${newValue}` : `agregó las etiquetas ${newValue}`
    case 'CYCLE':
      return newValue ? `agregó la tarea al ciclo ${quote(newValue)}` : `quitó la tarea del ciclo ${quote(oldValue)}`
    case 'MODULE':
      return newValue ? `agregó la tarea al módulo ${quote(newValue)}` : `quitó la tarea del módulo ${quote(oldValue)}`
    case 'COMMENT':
      return 'comentó'
    default:
      return 'actualizó la tarea'
  }
}

function describeDate(name, oldValue, newValue) {
  if (!newValue) return `quitó ${name}`
  if (!oldValue) return `fijó ${name} en ${date(newValue)}`
  return `cambió ${name} de ${date(oldValue)} a ${date(newValue)}`
}
