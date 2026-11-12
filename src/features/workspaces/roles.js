import { can, isManager } from '@/lib/permissions'

/**
 * Roles del workspace (funciones puras): cómo se elige un rol en un selector, cómo se marcan los permisos de un
 * módulo completo y qué roles puede asignar o editar cada quien.
 */

/** @typedef {{ key: string, id: string | null, kind: 'MANAGER' | 'MEMBER' | 'CUSTOM', name: string,
 *              description?: string | null, permissions: string[], memberCount: number }} Role */
/** @typedef {{ key: string, label: string, permissions: { key: string, label: string, description: string,
 *              memberDefault: boolean }[] }} PermissionGroup */

export const MANAGER_KEY = 'MANAGER'
export const MEMBER_KEY = 'MEMBER'

/** Largo máximo del nombre y de la descripción de un rol (los mismos del backend). */
export const ROLE_NAME_MAX = 40
export const ROLE_DESCRIPTION_MAX = 200

/** Clave del rol de un miembro o de una invitación, como la de la lista de roles. */
export function roleKeyOf(member) {
  if (member?.role === 'OWNER') return MANAGER_KEY
  return member?.roleId ?? MEMBER_KEY
}

/** Clave de un rol → cuerpo para cambiar el rol de un miembro. */
export function memberRoleBody(key) {
  if (key === MANAGER_KEY) return { role: 'OWNER', roleId: null }
  return { role: 'MEMBER', roleId: key === MEMBER_KEY ? null : key }
}

/** Clave de un rol → `roleId` de una invitación (null = «Miembro»). Nadie entra como project manager. */
export const invitationRoleId = (key) => (key === MEMBER_KEY || key === MANAGER_KEY ? null : key)

/** Todos los permisos del catálogo, en orden. */
export const allPermissionKeys = (groups = []) => groups.flatMap((group) => group.permissions.map((permission) => permission.key))

/**
 * Cómo está un módulo: 'all' (todo marcado), 'some' o 'none'.
 * @param {PermissionGroup} group
 * @param {Set<string>} selected
 */
export function groupState(group, selected) {
  const count = group.permissions.filter((permission) => selected.has(permission.key)).length
  if (count === 0) return 'none'
  return count === group.permissions.length ? 'all' : 'some'
}

/**
 * Marca o desmarca un módulo completo. Solo toca los permisos que la persona puede dar (`grantable`): los demás se
 * quedan como estaban.
 * @param {PermissionGroup} group
 * @param {Set<string>} selected
 * @param {boolean} checked
 * @param {(permission: string) => boolean} [grantable]
 * @returns {Set<string>}
 */
export function toggleGroup(group, selected, checked, grantable = () => true) {
  const next = new Set(selected)
  for (const permission of group.permissions) {
    if (!grantable(permission.key)) continue
    if (checked) next.add(permission.key)
    else next.delete(permission.key)
  }
  return next
}

/** Marca o desmarca un permiso. */
export function togglePermission(selected, key) {
  const next = new Set(selected)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

/** Los permisos marcados, en el orden del catálogo (así dos listas iguales se comparan bien). */
export const orderedPermissions = (groups, selected) => allPermissionKeys(groups).filter((key) => selected.has(key))

/** Si dos listas de permisos son la misma (sin importar el orden). */
export function samePermissions(a = [], b = []) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((key) => set.has(key))
}

/**
 * Si quien usa la app tiene todos los permisos de un rol: quien no es project manager no asigna, edita ni elimina un
 * rol que tenga algo que a él le falta (el backend responde 403).
 */
export function coversRole(workspace, role) {
  if (isManager(workspace?.myRole)) return true
  if (!role || role.kind === 'MANAGER') return false
  return role.permissions.every((permission) => can(workspace, permission))
}

/** Roles que se pueden elegir para otra persona (al cambiarle el rol o al invitarla). */
export function assignableRoles(roles = [], workspace, { includeManager = true } = {}) {
  return roles.filter((role) => (role.kind === 'MANAGER' ? includeManager && isManager(workspace?.myRole) : coversRole(workspace, role)))
}

/**
 * Rol nuevo para el editor: sin nombre y con los permisos de «Miembro» como punto de partida, sin los que quien lo
 * crea no puede dar (quedarían marcados sin poder quitarse y el backend rechazaría el rol).
 * @param {Role[]} roles
 * @param {(permission: string) => boolean} [grantable]
 */
export function blankRole(roles = [], grantable = () => true) {
  const member = roles.find((role) => role.kind === 'MEMBER')
  const permissions = (member?.permissions ?? []).filter(grantable)
  return { key: 'new', id: null, kind: 'CUSTOM', name: '', description: '', permissions, memberCount: 0 }
}
