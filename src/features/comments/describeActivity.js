import { formatShortDate } from '@/lib/dates'
import { markdownToPlainText } from '@/features/editor/markdown/plainText'
import { PRIORITY_LABELS } from '@/features/issues/constants'
import { TYPE_LABELS } from '@/features/issues/issueTypes'
import { stateName, t, tc } from '@/i18n'

/** Texto de una casilla de la descripción (se guarda en Markdown): en texto plano y corto. */
const taskText = (value) => markdownToPlainText(value ?? '', { maxLength: 80 }) || t('una casilla')
const date = (value) => (value ? formatShortDate(value) : null)
const typeName = (value) => TYPE_LABELS[value] ?? value

/**
 * La relación como la guarda el backend en el historial, siempre en español: «bloquea WEB-12», «bloqueada por WEB-3»
 * o «relacionada con WEB-7».
 */
const RELATION = /^(bloquea|bloqueada por|relacionada con) (.+)$/
/** Lo que movió una historia sola, como lo guarda el backend: «Luis empezó WEB-41» o «Luis terminó WEB-41». */
const AUTO_REASON = /^(.+) (empezó|terminó) (\S+)$/

/** La relación del historial en el idioma elegido (si no sigue el formato conocido, tal como llegó). */
function relationText(value) {
  const match = RELATION.exec(value ?? '')
  if (!match) return value ?? ''
  const code = match[2]
  if (match[1] === 'bloquea') return t('bloquea {code}', { code })
  if (match[1] === 'bloqueada por') return t('bloqueada por {code}', { code })
  return t('relacionada con {code}', { code })
}

/** «Luis empezó WEB-41» en el idioma elegido (si no sigue el formato conocido, tal como llegó). */
function autoReason(value) {
  const match = AUTO_REASON.exec(value ?? '')
  if (!match) return value
  const name = match[1] === 'Alguien' ? t('Alguien') : match[1]
  const code = match[3]
  return match[2] === 'empezó' ? t('{name} empezó {code}', { name, code }) : t('{name} terminó {code}', { name, code })
}

/**
 * Quién hizo el cambio: lo que TaskFlow hace solo (mover una historia cuando empieza su primera tarea) no tiene
 * autor y se muestra como «TaskFlow».
 * @param {{ field?: string, actor?: { fullName: string } | null }} entry
 */
export function activityActorName(entry) {
  if (entry.field === 'STORY_AUTO_STATE') return 'TaskFlow'
  return entry.actor?.fullName ?? t('Alguien')
}

/**
 * Frase legible para una entrada del historial (sin el nombre de quien la hizo).
 * Ej.: «cambió el estado de «Todo» a «Done»».
 * @param {import('@/api/types').ActivityResponse} activity
 */
export function describeActivity({ field, oldValue, newValue }) {
  switch (field) {
    case 'CREATED':
      return t('creó la tarea')
    case 'TITLE':
      return t('cambió el título a «{title}»', { title: newValue })
    case 'DESCRIPTION':
      return t('editó la descripción')
    case 'DESCRIPTION_CHECKED':
      return t('marcó «{text}» en la descripción', { text: taskText(newValue) })
    case 'DESCRIPTION_UNCHECKED':
      return t('desmarcó «{text}» en la descripción', { text: taskText(newValue) })
    case 'STATE':
      return t('cambió el estado de «{from}» a «{to}»', { from: stateName(oldValue), to: stateName(newValue) })
    case 'PRIORITY':
      return t('cambió la prioridad de {from} a {to}', { from: PRIORITY_LABELS[oldValue] ?? oldValue, to: PRIORITY_LABELS[newValue] ?? newValue })
    case 'PARENT':
      if (newValue) return t('estableció como padre a {code}', { code: newValue })
      return oldValue ? t('quitó el padre {code}', { code: oldValue }) : t('quitó el padre')
    case 'START_DATE':
      if (!newValue) return t('quitó la fecha de inicio')
      if (!oldValue) return t('fijó la fecha de inicio en {date}', { date: date(newValue) })
      return t('cambió la fecha de inicio de {from} a {to}', { from: date(oldValue), to: date(newValue) })
    case 'DUE_DATE':
      if (!newValue) return t('quitó la fecha límite')
      if (!oldValue) return t('fijó la fecha límite en {date}', { date: date(newValue) })
      return t('cambió la fecha límite de {from} a {to}', { from: date(oldValue), to: date(newValue) })
    case 'ASSIGNEES':
      if (!newValue) return t('quitó a todos los asignados')
      return oldValue ? t('cambió los asignados a {names}', { names: newValue }) : t('asignó a {names}', { names: newValue })
    case 'LABELS':
      if (!newValue) return t('quitó todas las etiquetas')
      return oldValue ? t('cambió las etiquetas a {labels}', { labels: newValue }) : t('agregó las etiquetas {labels}', { labels: newValue })
    case 'CYCLE':
      return newValue ? t('agregó la tarea al ciclo «{name}»', { name: newValue }) : t('quitó la tarea del ciclo «{name}»', { name: oldValue })
    case 'MODULE':
      return newValue ? t('agregó la tarea al módulo «{name}»', { name: newValue }) : t('quitó la tarea del módulo «{name}»', { name: oldValue })
    case 'COMMENT':
      return t('comentó')
    case 'RELATION':
      return newValue
        ? t('agregó la relación «{relation}»', { relation: relationText(newValue) })
        : t('quitó la relación «{relation}»', { relation: relationText(oldValue) })
    case 'TYPE':
      return t('cambió el tipo de {from} a {to}', { from: typeName(oldValue), to: typeName(newValue) })
    case 'STORY_AUTO_STATE':
      // «TaskFlow movió la historia a In Progress · Luis empezó WEB-41»
      return oldValue
        ? t('movió la historia a {state} · {reason}', { state: stateName(newValue), reason: autoReason(oldValue) })
        : t('movió la historia a {state}', { state: stateName(newValue) })
    case 'ATTACHMENT':
      // El nombre del archivo: en `newValue` al adjuntarlo y en `oldValue` al eliminarlo
      if (newValue) return t('adjuntó «{name}»', { name: newValue })
      return oldValue ? t('eliminó «{name}»', { name: oldValue }) : t('eliminó un archivo')
    default:
      return t('actualizó la tarea')
  }
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
 *
 * `verb` y `suffix` son los dos pedazos de una misma frase (la tarea va en medio): cada uno se traduce con el contexto
 * «actividad» para que en inglés queden en el mismo orden («changed the priority of» … «to urgent»).
 * @param {import('@/api/types').ActivityFeedItem} entry
 * @param {{ stateGroup?: string }} [options]
 * @returns {FeedSentence}
 */
export function describeFeedEntry({ field, oldValue, newValue }, { stateGroup } = {}) {
  const neutral = (verb, suffix, mark = '·') => ({ verb, suffix, mark, tone: 'neutral' })
  switch (field) {
    case 'CREATED':
      return { verb: tc('actividad', 'creó'), mark: '+', tone: 'accent' }
    case 'STATE': {
      const done = stateGroup === 'COMPLETED'
      const verb = done ? tc('actividad', 'completó') : stateGroup === 'CANCELLED' ? tc('actividad', 'canceló') : tc('actividad', 'movió')
      return { verb, mark: done ? '✓' : '→', tone: done ? 'ok' : 'neutral', change: { from: stateName(oldValue), to: stateName(newValue), done } }
    }
    case 'COMMENT':
      return { verb: tc('actividad', 'comentó en'), mark: '“', tone: 'neutral', quote: newValue ?? '' }
    case 'RELATION':
      return neutral(tc('actividad', 'marcó que'), relationSuffix(newValue ?? oldValue ?? '', !newValue), '⊘')
    case 'ASSIGNEES':
      if (!newValue) return neutral(tc('actividad', 'quitó los asignados de'), undefined, '@')
      return neutral(oldValue ? tc('actividad', 'cambió los asignados de') : tc('actividad', 'asignó'), tc('actividad', 'a {names}', { names: newValue }), '@')
    case 'TITLE':
      return neutral(tc('actividad', 'cambió el título de'))
    case 'DESCRIPTION':
      return neutral(tc('actividad', 'editó la descripción de'))
    case 'DESCRIPTION_CHECKED':
      return neutral(tc('actividad', 'marcó «{text}» en la descripción de', { text: taskText(newValue) }), undefined, '✓')
    case 'DESCRIPTION_UNCHECKED':
      return neutral(tc('actividad', 'desmarcó «{text}» en la descripción de', { text: taskText(newValue) }))
    case 'PRIORITY':
      return neutral(tc('actividad', 'cambió la prioridad de'), tc('actividad', 'a {priority}', { priority: (PRIORITY_LABELS[newValue] ?? newValue ?? '').toLowerCase() }))
    case 'PARENT':
      return newValue ? neutral(tc('actividad', 'puso'), tc('actividad', 'como subtarea de {code}', { code: newValue })) : neutral(tc('actividad', 'quitó el padre de'))
    case 'START_DATE':
      if (!newValue) return neutral(tc('actividad', 'quitó la fecha de inicio de'))
      return neutral(oldValue ? tc('actividad', 'cambió el inicio de') : tc('actividad', 'fijó el inicio de'), tc('actividad', 'al {date}', { date: date(newValue) }))
    case 'DUE_DATE':
      if (!newValue) return neutral(tc('actividad', 'quitó la fecha límite de'))
      return neutral(oldValue ? tc('actividad', 'cambió la fecha límite de') : tc('actividad', 'fijó la fecha límite de'), tc('actividad', 'al {date}', { date: date(newValue) }))
    case 'LABELS':
      if (!newValue) return neutral(tc('actividad', 'quitó las etiquetas de'))
      return oldValue
        ? neutral(tc('actividad', 'cambió las etiquetas de'), tc('actividad', 'a {labels}', { labels: newValue }))
        : neutral(tc('actividad', 'etiquetó'), tc('actividad', 'como {labels}', { labels: newValue }))
    case 'CYCLE':
      return newValue
        ? neutral(tc('actividad', 'agregó'), tc('actividad', 'al ciclo «{name}»', { name: newValue }))
        : neutral(tc('actividad', 'quitó'), tc('actividad', 'del ciclo «{name}»', { name: oldValue }))
    case 'MODULE':
      return newValue
        ? neutral(tc('actividad', 'agregó'), tc('actividad', 'al módulo «{name}»', { name: newValue }))
        : neutral(tc('actividad', 'quitó'), tc('actividad', 'del módulo «{name}»', { name: oldValue }))
    case 'TYPE':
      return neutral(tc('actividad', 'cambió el tipo de'), tc('actividad', 'a {type}', { type: typeName(newValue).toLowerCase() }))
    case 'STORY_AUTO_STATE':
      return neutral(
        tc('actividad', 'movió la historia'),
        oldValue
          ? tc('actividad', 'a {state} · {reason}', { state: stateName(newValue), reason: autoReason(oldValue) })
          : tc('actividad', 'a {state}', { state: stateName(newValue) }),
        '→',
      )
    case 'ATTACHMENT':
      if (newValue) return { verb: tc('actividad', 'adjuntó «{name}» en', { name: newValue }), mark: '↑', tone: 'accent', file: true }
      return neutral(oldValue ? tc('actividad', 'eliminó «{name}» de', { name: oldValue }) : tc('actividad', 'eliminó un archivo de'), undefined, '×')
    default:
      return neutral(tc('actividad', 'actualizó'))
  }
}

/**
 * Relación del historial vista desde la tarea, para la frase del feed: «bloquea WEB-12»,
 * «está bloqueada por WEB-3» o «está relacionada con WEB-7»; con `removed`, «ya no …».
 */
function relationSuffix(value, removed) {
  const match = RELATION.exec(value)
  if (!match) {
    // Un formato que no se conoce: tal como llegó
    const phrase = value.startsWith('bloquea ') ? value : `está ${value}`
    return removed ? `ya no ${phrase}` : phrase
  }
  const code = match[2]
  if (match[1] === 'bloquea') return removed ? tc('actividad', 'ya no bloquea {code}', { code }) : tc('actividad', 'bloquea {code}', { code })
  if (match[1] === 'bloqueada por') {
    return removed ? tc('actividad', 'ya no está bloqueada por {code}', { code }) : tc('actividad', 'está bloqueada por {code}', { code })
  }
  return removed ? tc('actividad', 'ya no está relacionada con {code}', { code }) : tc('actividad', 'está relacionada con {code}', { code })
}
