/**
 * Piezas de cada aviso de la Bandeja: a dónde lleva, de qué proyecto es y el extracto del comentario con mi
 * mención resaltada.
 */

/** @typedef {import('@/api/types').NotificationResponse} NotificationResponse */

/** Pestañas de la Bandeja y qué pide cada una a la API. */
export const INBOX_TABS = {
  unread: { unread: true },
  mentions: { types: ['ISSUE_MENTIONED'] },
  all: {},
}

/** Pestaña de la URL (?tab=), «No leídas» si no es una conocida. */
export function inboxTab(value) {
  return value in INBOX_TABS && value !== 'unread' ? value : 'unread'
}

/**
 * Ruta a la que lleva el aviso: la retrospectiva del ciclo (RETRO_STARTED) o la tarea abierta en su proyecto.
 * @param {NotificationResponse} notification
 * @returns {string | null}
 */
export function notificationTarget(notification) {
  const { issue, cycle } = notification
  if (cycle?.workspaceSlug && cycle.projectId && cycle.id) {
    return `/${cycle.workspaceSlug}/projects/${cycle.projectId}/cycles/${cycle.id}/retro`
  }
  if (issue?.workspaceSlug && issue.projectId && issue.id) {
    return `/${issue.workspaceSlug}/projects/${issue.projectId}/issues?issue=${issue.id}`
  }
  return null
}

/**
 * Proyecto del aviso en minúsculas («web»), como la ruta de las páginas; del ciclo o del código de la tarea.
 * @param {NotificationResponse} notification
 * @returns {string}
 */
export function notificationProject(notification) {
  const identifier = notification.cycle?.projectIdentifier ?? codePrefix(notification.issue?.code)
  return identifier ? identifier.toLowerCase() : ''
}

function codePrefix(code = '') {
  const dash = code.lastIndexOf('-')
  return dash > 0 ? code.slice(0, dash) : ''
}

/**
 * Extracto del comentario (una línea con las menciones como «@Nombre») partido para resaltar mi mención.
 * Solo se reconoce la mía: los demás nombres pueden tener espacios y no se sabe dónde terminan.
 * @param {string} excerpt
 * @param {string | null | undefined} myName
 * @returns {{ text: string, me: boolean }[]}
 */
export function excerptSegments(excerpt = '', myName) {
  const name = myName?.trim()
  if (!excerpt) return []
  if (!name) return [{ text: excerpt, me: false }]
  const token = `@${name}`
  const segments = []
  let rest = excerpt
  let index = rest.indexOf(token)
  while (index !== -1) {
    if (index > 0) segments.push({ text: rest.slice(0, index), me: false })
    segments.push({ text: token, me: true })
    rest = rest.slice(index + token.length)
    index = rest.indexOf(token)
  }
  if (rest) segments.push({ text: rest, me: false })
  return segments
}
