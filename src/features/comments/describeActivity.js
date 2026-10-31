import { formatShortDate } from '@/lib/dates'
import { markdownToPlainText } from '@/features/editor/markdown/plainText'
import { PRIORITY_LABELS } from '@/features/issues/constants'
import { TYPE_LABELS } from '@/features/issues/issueTypes'

const quote = (value) => `«${value}»`
/** Texto de una casilla de la descripción (se guarda en Markdown): en texto plano y corto. */
const taskText = (value) => quote(markdownToPlainText(value ?? '', { maxLength: 80 }) || 'una casilla')
const date = (value) => (value ? formatShortDate(value) : null)
const typeName = (value) => TYPE_LABELS[value] ?? value

/**
 * Quién hizo el cambio: lo que TaskFlow hace solo (mover una historia cuando empieza su primera tarea) no tiene
 * autor y se muestra como «TaskFlow».
 * @param {{ field?: string, actor?: { fullName: string } | null }} entry
 */
export function activityActorName(entry) {
  if (entry.field === 'STORY_AUTO_STATE') return 'TaskFlow'
  return entry.actor?.fullName ?? 'Alguien'
}

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
      return 'editó la descripción'
    case 'DESCRIPTION_CHECKED':
      return `marcó ${taskText(newValue)} en la descripción`
    case 'DESCRIPTION_UNCHECKED':
      return `desmarcó ${taskText(newValue)} en la descripción`
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
    case 'RELATION':
      return newValue ? `agregó la relación ${quote(newValue)}` : `quitó la relación ${quote(oldValue ?? '')}`
    case 'TYPE':
      return `cambió el tipo de ${typeName(oldValue)} a ${typeName(newValue)}`
    case 'STORY_AUTO_STATE':
      // «TaskFlow movió la historia a In Progress · Luis empezó WEB-41»
      return `movió la historia a ${newValue}${oldValue ? ` · ${oldValue}` : ''}`
    case 'ATTACHMENT':
      // El nombre del archivo: en `newValue` al adjuntarlo y en `oldValue` al eliminarlo
      return newValue ? `adjuntó ${quote(newValue)}` : `eliminó ${oldValue ? quote(oldValue) : 'un archivo'}`
    default:
      return 'actualizó la tarea'
  }
}

function describeDate(name, oldValue, newValue) {
  if (!newValue) return `quitó ${name}`
  if (!oldValue) return `fijó ${name} en ${date(newValue)}`
  return `cambió ${name} de ${date(oldValue)} a ${date(newValue)}`
}

/**
 * @typedef {{ verb: string, suffix?: string, mark: string, tone: 'neutral' | 'accent' | 'ok',
 *             change?: { from: string, to: string, done: boolean }, quote?: string, file?: boolean }} FeedSentence
 */

/**
 * Frase de una entrada del feed de actividad del workspace, alrededor de la tarea:
 * «{quién} {verb} WEB-4 Recuperar contraseña {suffix}». `mark` es el símbolo sobre el avatar. `file`: va la tarjeta del
 * archivo adjuntado (si todavía existe).
 * `stateGroup` es el grupo del estado nuevo (si se conoce) para distinguir «completó» de «movió».
 * @param {import('@/api/types').ActivityFeedItem} entry
 * @param {{ stateGroup?: string }} [options]
 * @returns {FeedSentence}
 */
export function describeFeedEntry({ field, oldValue, newValue }, { stateGroup } = {}) {
  const neutral = (verb, suffix, mark = '·') => ({ verb, suffix, mark, tone: 'neutral' })
  switch (field) {
    case 'CREATED':
      return { verb: 'creó', mark: '+', tone: 'accent' }
    case 'STATE': {
      const done = stateGroup === 'COMPLETED'
      const verb = done ? 'completó' : stateGroup === 'CANCELLED' ? 'canceló' : 'movió'
      return { verb, mark: done ? '✓' : '→', tone: done ? 'ok' : 'neutral', change: { from: oldValue, to: newValue, done } }
    }
    case 'COMMENT':
      return { verb: 'comentó en', mark: '“', tone: 'neutral', quote: newValue ?? '' }
    case 'RELATION': {
      const phrase = relationPhrase(newValue ?? oldValue ?? '')
      return neutral('marcó que', newValue ? phrase : `ya no ${phrase}`, '⊘')
    }
    case 'ASSIGNEES':
      if (!newValue) return neutral('quitó los asignados de', undefined, '@')
      return neutral(oldValue ? 'cambió los asignados de' : 'asignó', `a ${newValue}`, '@')
    case 'TITLE':
      return neutral('cambió el título de')
    case 'DESCRIPTION':
      return neutral('editó la descripción de')
    case 'DESCRIPTION_CHECKED':
      return neutral(`marcó ${taskText(newValue)} en la descripción de`, undefined, '✓')
    case 'DESCRIPTION_UNCHECKED':
      return neutral(`desmarcó ${taskText(newValue)} en la descripción de`)
    case 'PRIORITY':
      return neutral('cambió la prioridad de', `a ${(PRIORITY_LABELS[newValue] ?? newValue ?? '').toLowerCase()}`)
    case 'PARENT':
      return newValue ? neutral('puso', `como subtarea de ${newValue}`) : neutral('quitó el padre de')
    case 'START_DATE':
      if (!newValue) return neutral('quitó la fecha de inicio de')
      return neutral(oldValue ? 'cambió el inicio de' : 'fijó el inicio de', `al ${date(newValue)}`)
    case 'DUE_DATE':
      if (!newValue) return neutral('quitó la fecha límite de')
      return neutral(oldValue ? 'cambió la fecha límite de' : 'fijó la fecha límite de', `al ${date(newValue)}`)
    case 'LABELS':
      if (!newValue) return neutral('quitó las etiquetas de')
      return neutral(oldValue ? 'cambió las etiquetas de' : 'etiquetó', oldValue ? `a ${newValue}` : `como ${newValue}`)
    case 'CYCLE':
      return newValue ? neutral('agregó', `al ciclo ${quote(newValue)}`) : neutral('quitó', `del ciclo ${quote(oldValue)}`)
    case 'MODULE':
      return newValue ? neutral('agregó', `al módulo ${quote(newValue)}`) : neutral('quitó', `del módulo ${quote(oldValue)}`)
    case 'TYPE':
      return neutral('cambió el tipo de', `a ${typeName(newValue).toLowerCase()}`)
    case 'STORY_AUTO_STATE':
      return neutral('movió la historia', `a ${newValue}${oldValue ? ` · ${oldValue}` : ''}`, '→')
    case 'ATTACHMENT':
      return newValue
        ? { verb: `adjuntó ${quote(newValue)} en`, mark: '↑', tone: 'accent', file: true }
        : neutral(`eliminó ${oldValue ? quote(oldValue) : 'un archivo'} de`, undefined, '×')
    default:
      return neutral('actualizó')
  }
}

/**
 * Relación del historial vista desde la tarea, para la frase del feed: «bloquea WEB-12»,
 * «está bloqueada por WEB-3» o «está relacionada con WEB-7».
 */
function relationPhrase(value) {
  return value.startsWith('bloquea ') ? value : `está ${value}`
}
