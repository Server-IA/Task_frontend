import { api } from '@/api/client'

/** @typedef {import('@/api/types').WorkspaceResponse} WorkspaceResponse */
/** @typedef {import('@/api/types').WorkspaceMember} WorkspaceMember */
/** @typedef {import('@/api/types').InvitationResponse} InvitationResponse */
/** @typedef {import('@/api/types').InvitationDetails} InvitationDetails */

const data = (response) => response.data

export const workspacesApi = {
  /** @returns {Promise<WorkspaceResponse[]>} */
  list: () => api.get('/workspaces').then(data),

  /** @returns {Promise<WorkspaceResponse>} */
  create: (body) => api.post('/workspaces', body).then(data),

  /** @returns {Promise<WorkspaceResponse>} */
  get: (slug) => api.get(`/workspaces/${slug}`).then(data),

  /** @returns {Promise<WorkspaceResponse>} */
  update: (slug, body) => api.patch(`/workspaces/${slug}`, body).then(data),

  remove: (slug) => api.delete(`/workspaces/${slug}`),

  /** @returns {Promise<WorkspaceMember[]>} */
  members: (slug) => api.get(`/workspaces/${slug}/members`).then(data),

  /**
   * `role` es 'OWNER' (project manager) o 'MEMBER'; con 'MEMBER', `roleId` elige un rol creado por el workspace
   * (sin él, «Miembro»).
   * @returns {Promise<WorkspaceMember>}
   */
  updateMemberRole: (slug, userId, role, roleId = null) =>
    api.patch(`/workspaces/${slug}/members/${userId}`, { role, roleId }).then(data),

  removeMember: (slug, userId) => api.delete(`/workspaces/${slug}/members/${userId}`),
}

/** Roles del workspace y el catálogo de permisos. */
export const rolesApi = {
  /** @returns {Promise<{ groups: import('./roles').PermissionGroup[] }>} */
  catalog: () => api.get('/permissions').then(data),

  /** @returns {Promise<import('./roles').Role[]>} */
  list: (slug) => api.get(`/workspaces/${slug}/roles`).then(data),

  /** @returns {Promise<import('./roles').Role>} */
  create: (slug, body) => api.post(`/workspaces/${slug}/roles`, body).then(data),

  /** @returns {Promise<import('./roles').Role>} */
  update: (slug, roleId, body) => api.patch(`/workspaces/${slug}/roles/${roleId}`, body).then(data),

  /** Permisos del rol «Miembro». @returns {Promise<import('./roles').Role>} */
  updateMemberPermissions: (slug, permissions) =>
    api.put(`/workspaces/${slug}/roles/member/permissions`, { permissions }).then(data),

  remove: (slug, roleId) => api.delete(`/workspaces/${slug}/roles/${roleId}`),
}

export const invitationsApi = {
  /** @returns {Promise<InvitationResponse[]>} */
  pending: (slug) => api.get(`/workspaces/${slug}/invitations`).then(data),

  /** @returns {Promise<InvitationResponse>} */
  invite: (slug, body) => api.post(`/workspaces/${slug}/invitations`, body).then(data),

  revoke: (slug, invitationId) => api.delete(`/workspaces/${slug}/invitations/${invitationId}`),

  /** @returns {Promise<InvitationDetails>} */
  details: (token) => api.get(`/invitations/${token}`).then(data),

  /** @returns {Promise<WorkspaceResponse>} */
  accept: (token) => api.post(`/invitations/${token}/accept`).then(data),
}
