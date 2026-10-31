/**
 * Permisos de la interfaz según el rol en el workspace (el backend siempre valida igual).
 * Hay dos roles: el project manager (OWNER), que gestiona proyectos, ciclos, módulos y miembros,
 * y los miembros (MEMBER), que trabajan las tareas de los proyectos a los que pertenecen.
 */

export const ROLE_LABELS = {
  OWNER: 'Project manager',
  MEMBER: 'Miembro',
}

/** Project manager del workspace. */
export const isManager = (role) => role === 'OWNER'

/** Eliminar una tarea: el project manager o quien la creó. Una historia, solo el project manager. */
export const canDeleteIssue = (role, issue, userId) =>
  isManager(role) || (issue?.type !== 'STORY' && Boolean(userId) && issue?.createdBy?.id === userId)

/** Eliminar un comentario: su autor o el project manager. */
export const canDeleteComment = (role, comment, userId) =>
  isManager(role) || (Boolean(userId) && comment?.author?.id === userId)

/** Eliminar un adjunto: quien lo subió o el project manager. */
export const canDeleteFile = (role, file, userId) =>
  isManager(role) || (Boolean(userId) && file?.uploadedBy?.id === userId)
