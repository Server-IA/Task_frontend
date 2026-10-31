/**
 * Piezas de cada aviso de la Bandeja: a dónde lleva, de qué proyecto es y el extracto del comentario con mi
 * mención resaltada.
 */

/**
 * `workspace` solo viene en los avisos del workspace (STORAGE_WARNING: el espacio para archivos pasó del 90 %).
 * @typedef {Omit<import('@/api/types').NotificationResponse, 'type'> & { type?: string,
 *           workspace?: { id: string, slug: string, name: string } | null }} NotificationResponse
 */

/** Pestaña de los ajustes del workspace a la que lleva el aviso de espacio (solo la ven los PM). */
export const STORAGE_SETTINGS_TAB = 'storage'

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
 * Ruta a la que lleva el aviso: «Almacenamiento» en los ajustes del workspace (STORAGE_WARNING), la retrospectiva del
 * ciclo (RETRO_STARTED) o la tarea abierta en su proyecto.
 * @param {NotificationResponse} notification
 * @returns {string | null}
 */
export function notificationTarget(notification) {
  const { issue, cycle, workspace } = notification
  if (notification.type === 'STORAGE_WARNING') {
    return workspace?.slug ? `/${workspace.slug}/settings?tab=${STORAGE_SETTINGS_TAB}` : null
  }
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

/**
 * Color del proyecto del aviso (clave de la paleta), del ciclo o de la tarea; null si no lo trae.
 * @param {NotificationResponse} notification
 * @returns {string | null}
 */
export function notificationProjectColor(notification) {
  return notification.cycle?.projectColor ?? notification.issue?.projectColor ?? null
}

/**
 * Workspace del aviso (slug), de la tarea, del ciclo o del propio aviso; null si no lo trae.
 * @param {NotificationResponse} notification
 * @returns {string | null}
 */
export function notificationWorkspaceSlug(notification) {
  return notification.issue?.workspaceSlug ?? notification.cycle?.workspaceSlug ?? notification.workspace?.slug ?? null
}

/**
 * Lo manda TaskFlow (sin autor): historia lista para revisar y espacio casi lleno.
 * @param {NotificationResponse} notification
 */
export const isSystemNotification = (notification) => ['STORY_READY', 'STORAGE_WARNING'].includes(notification.type)

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

/**
 * Tarea abierta junto a la Bandeja: parámetros de la URL que la identifican (la Bandeja no es de ningún workspace
 * ni proyecto, así que van los tres). `comment` es el comentario del aviso, para llevar la vista hasta él.
 */
const OPEN_PARAMS = ['workspace', 'project', 'issue', 'comment']

/** @typedef {{ slug: string, projectId: string, issueId: string, commentId: string | null }} OpenedIssue */

/**
 * La tarea de un aviso para abrirla junto a la Bandeja; null en los avisos de retrospectiva (llevan a su página)
 * o sin tarea.
 * @param {NotificationResponse} notification
 * @returns {OpenedIssue | null}
 */
export function notificationIssue(notification) {
  const { issue, cycle } = notification
  if (cycle || !issue?.workspaceSlug || !issue.projectId || !issue.id) return null
  return { slug: issue.workspaceSlug, projectId: issue.projectId, issueId: issue.id, commentId: notification.comment?.id ?? null }
}

/**
 * Tarea abierta según la URL, o null si falta alguno de sus datos.
 * @param {URLSearchParams} searchParams
 * @returns {OpenedIssue | null}
 */
export function openedIssueFromParams(searchParams) {
  const slug = searchParams.get('workspace')
  const projectId = searchParams.get('project')
  const issueId = searchParams.get('issue')
  if (!slug || !projectId || !issueId) return null
  return { slug, projectId, issueId, commentId: searchParams.get('comment') || null }
}

/**
 * Parámetros con esa tarea abierta (o sin ninguna, con null); conserva lo demás, como la pestaña.
 * @param {URLSearchParams} searchParams
 * @param {OpenedIssue | null} opened
 */
export function withOpenedIssue(searchParams, opened) {
  const next = new URLSearchParams(searchParams)
  for (const key of OPEN_PARAMS) next.delete(key)
  if (opened) {
    next.set('workspace', opened.slug)
    next.set('project', opened.projectId)
    next.set('issue', opened.issueId)
    if (opened.commentId) next.set('comment', opened.commentId)
  }
  return next
}

/**
 * El aviso es el de la tarea abierta (la misma tarea y, si el aviso es de un comentario, el mismo comentario).
 * @param {NotificationResponse} notification
 * @param {OpenedIssue | null} opened
 */
export function isOpenedNotification(notification, opened) {
  const target = notificationIssue(notification)
  if (!target || !opened) return false
  return target.issueId === opened.issueId && (target.commentId ?? null) === (opened.commentId ?? null)
}

/**
 * Marca un aviso como leído dentro de las páginas en caché de una lista (sin quitarlo: en «No leídas» sigue a la
 * vista hasta la próxima recarga).
 * @param {{ pages: { content: NotificationResponse[] }[] } | undefined} data
 * @param {string} notificationId
 */
export function markReadInPages(data, notificationId) {
  if (!data?.pages) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      content: (page.content ?? []).map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    })),
  }
}
