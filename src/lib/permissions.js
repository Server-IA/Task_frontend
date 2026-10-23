/** Permisos de la interfaz según el rol en el workspace (el backend siempre valida igual). */

export const ROLE_LABELS = {
  OWNER: 'Dueño',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro',
}

export const isAdminRole = (role) => role === 'OWNER' || role === 'ADMIN'

export const isOwnerRole = (role) => role === 'OWNER'
