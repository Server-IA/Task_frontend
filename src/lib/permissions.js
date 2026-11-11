/**
 * Permisos de la interfaz (el backend siempre valida igual). Cada persona tiene un rol en el workspace:
 * - Project manager (OWNER): todos los permisos.
 * - «Miembro» o un rol creado por el workspace («Líder», «Desarrollador»…): los que tenga marcados.
 * El workspace trae los permisos de quien lo pide en `myPermissions` (nombres del catálogo del backend).
 */
import { t } from '@/i18n'

export const ROLE_LABELS = {
  OWNER: t('Project manager'),
  MEMBER: t('Miembro'),
}

/**
 * El nombre de un rol para mostrar. El rol «Miembro» de fábrica se guarda en el backend con ese nombre: mientras lo
 * conserve se ve en el idioma elegido. Uno renombrado o creado por el workspace se ve como lo escribieron.
 */
const shownRoleName = (name) => (name === 'Miembro' ? t('Miembro') : name)

/** Project manager del workspace. */
export const isManager = (role) => role === 'OWNER'

/**
 * Lo que trae el rol «Miembro» de fábrica. Solo se usa si el workspace llega sin `myPermissions` (un backend
 * anterior a los roles): así un miembro sigue viendo lo que siempre pudo hacer.
 */
export const MEMBER_DEFAULT_PERMISSIONS = [
  'ISSUE_CREATE',
  'ISSUE_EDIT',
  'ISSUE_DELETE_OWN',
  'ISSUE_CHECKLIST',
  'ISSUE_RELATIONS',
  'ISSUE_ATTACH',
  'COMMENT_CREATE',
  'COMMENT_IMAGES',
  'CYCLE_ASSIGN',
  'MODULE_ASSIGN',
  'RETRO_PARTICIPATE',
  'DAILY_NOTE',
  'STATS_VIEW',
  'REPORT_GENERATE',
  'ACTIVITY_VIEW',
]

/**
 * Si quien usa la app tiene ese permiso.
 * @param {{ myRole?: string, myPermissions?: string[] } | string | null | undefined} access el workspace (con `myRole`
 *   y `myPermissions`) o, por compatibilidad, solo el rol base ('OWNER' | 'MEMBER')
 * @param {string} permission nombre del permiso («ISSUE_CREATE», «CYCLE_CLOSE»…)
 */
export function can(access, permission) {
  if (!access) return false
  const role = typeof access === 'string' ? access : access.myRole
  if (isManager(role)) return true
  if (role !== 'MEMBER') return false
  const permissions = (typeof access === 'object' && access.myPermissions) || MEMBER_DEFAULT_PERMISSIONS
  return permissions.includes(permission)
}

/** Nombre del rol de quien usa la app en ese workspace («Project manager», «Miembro», «Líder»…). */
export const myRoleName = (workspace) => shownRoleName(workspace?.myRoleName) ?? ROLE_LABELS[workspace?.myRole] ?? ''

/** Nombre del rol de un miembro o de una invitación. */
export const roleNameOf = (member) => shownRoleName(member?.roleName) ?? ROLE_LABELS[member?.role] ?? ''

/**
 * Eliminar una tarea: las propias con «eliminar sus propias tareas» y las de otros con «eliminar cualquier tarea».
 * Una historia, con «gestionar historias».
 */
export function canDeleteIssue(access, issue, userId) {
  if (issue?.type === 'STORY') return can(access, 'STORY_MANAGE')
  if (can(access, 'ISSUE_DELETE_ANY')) return true
  return Boolean(userId) && issue?.createdBy?.id === userId && can(access, 'ISSUE_DELETE_OWN')
}

/** Eliminar un comentario: su autor, o quien puede eliminar comentarios de otros. */
export const canDeleteComment = (access, comment, userId) =>
  can(access, 'COMMENT_DELETE_ANY') || (Boolean(userId) && comment?.author?.id === userId)

/** Eliminar un adjunto: quien lo subió, o quien puede eliminar adjuntos de otros. */
export const canDeleteFile = (access, file, userId) =>
  can(access, 'FILE_DELETE_ANY') || (Boolean(userId) && file?.uploadedBy?.id === userId)
