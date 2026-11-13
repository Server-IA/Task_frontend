/**
 * Qué consultas vuelve a pedir un aviso en tiempo real. El servidor solo dice qué cambió (el workspace, el proyecto y,
 * si se sabe, la tarea); aquí se decide qué de lo que se está mostrando depende de eso. Solo se vuelven a pedir las
 * consultas en pantalla (las demás quedan marcadas como viejas y se piden al volver a ellas).
 */

/** Nunca dependen de lo que hagan otros: la sesión, las URLs firmadas de archivos, enlaces de un solo uso… */
const NEVER = new Set([
  'me',
  'fileUrl',
  'resetPasswordToken',
  'invitation',
  'permissionCatalog',
  'search',
  'reportPreview',
])

/**
 * Las de una tarea, un ciclo o un módulo concretos: su clave lleva el id de esa cosa, no el del proyecto. Se vuelven a
 * pedir con cualquier cambio de su workspace (solo están en pantalla las de lo que está abierto: una o dos).
 */
const OPEN_ITEM = new Set([
  'issue',
  'subIssues',
  'comments',
  'activity',
  'relations',
  'checklist',
  'attachments',
  'cycle',
  'module',
  'closePreview',
  'retro',
  'taskRef',
])

const contains = (key, value) => value != null && key.some((part) => part === value)

/**
 * ¿Esta consulta depende de alguno de estos cambios?
 * @param {readonly unknown[]} queryKey
 * @param {{ changes: { workspace?: string, projectId?: string }[], notifications: boolean, everything: boolean, currentSlug?: string }} batch
 *   `everything`: la conexión estuvo caída un rato (pudo perderse algún aviso); `currentSlug`: el workspace en pantalla.
 */
export function shouldRefresh(queryKey, { changes, notifications, everything, currentSlug }) {
  const [root] = queryKey
  if (NEVER.has(root)) return false
  if (root === 'github' && queryKey[1] === 'me') return false
  if (root === 'notifications') return notifications || everything
  if (everything) return true
  return changes.some((change) => {
    if (contains(queryKey, change.workspace) || contains(queryKey, change.projectId)) return true
    const here = change.workspace === currentSlug
    // Un cambio del workspace entero (GitHub, una importación, los miembros…) toca todo lo que se ve de él
    if (here && !change.projectId) return root !== 'workspaces'
    return here && OPEN_ITEM.has(root)
  })
}

/** El workspace en pantalla: la primera parte de la ruta (`/equipo-producto/projects/…`). */
export function slugOf(pathname) {
  const first = pathname.split('/')[1] ?? ''
  return ['profile', 'notifications', 'onboarding', 'github', ''].includes(first)
    ? undefined
    : decodeURIComponent(first)
}
