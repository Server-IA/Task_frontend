import { api } from '@/api/client'

/**
 * Archivos en Cloudflare R2. El navegador sube y descarga directo de R2 con URLs firmadas: la API valida, firma y
 * confirma. Los textos guardan referencias estables (`/files/<id>`) y las URLs se piden aparte (vencen en 1 h).
 *
 * @typedef {{ id: string, kind: 'ATTACHMENT' | 'INLINE_IMAGE' | 'AVATAR', status: 'PENDING' | 'READY', fileName: string,
 *             contentType: string, size: number, image: boolean, projectId?: string | null, issueId?: string | null,
 *             uploadedBy?: import('@/api/types').UserSummary | null, createdAt: string, reference: string }} StoredFile
 * @typedef {{ file: StoredFile, url: string, method: 'PUT', headers: Record<string, string>, expiresAt: string,
 *             storage?: StorageUsage | null }} UploadTicket
 * @typedef {{ id: string, url: string, expiresAt: string, fileName: string, contentType: string, size: number,
 *             image: boolean }} FileUrl
 * @typedef {{ usedBytes: number, quotaBytes: number, percent: number, warning: boolean, full: boolean }} StorageUsage
 */

const data = (response) => response.data

export const filesApi = {
  /**
   * Pide la subida (URL firmada) de un archivo de una tarea.
   * @param {{ purpose: 'ATTACHMENT' | 'INLINE_IMAGE', issueId?: string | null, fileName: string, contentType: string, size: number }} body
   * @returns {Promise<UploadTicket>}
   */
  createUpload: (slug, projectId, body) => api.post(`/workspaces/${slug}/projects/${projectId}/files`, body).then(data),

  /** @returns {Promise<StoredFile>} */
  confirm: (slug, projectId, fileId) => api.post(`/workspaces/${slug}/projects/${projectId}/files/${fileId}/confirm`).then(data),

  /** Elimina un archivo (quien lo subió o un PM); también cancela una subida en curso. */
  remove: (slug, projectId, fileId) => api.delete(`/workspaces/${slug}/projects/${projectId}/files/${fileId}`),

  /** @returns {Promise<StoredFile[]>} */
  attachments: (slug, projectId, issueId) => api.get(`/workspaces/${slug}/projects/${projectId}/issues/${issueId}/attachments`).then(data),

  /**
   * URLs firmadas de los archivos que se pueden ver (los demás no vienen).
   * @param {string[]} ids hasta 100
   * @returns {Promise<FileUrl[]>}
   */
  urls: (ids, download = false) => api.get('/files/urls', { params: { ids: ids.join(','), download } }).then(data),

  /** @returns {Promise<StorageUsage>} */
  usage: (slug) => api.get(`/workspaces/${slug}/storage/usage`).then(data),

  /** Pestaña «Almacenamiento» (PM). */
  report: (slug) => api.get(`/workspaces/${slug}/storage`).then(data),

  /** @returns {Promise<UploadTicket>} */
  createAvatarUpload: (body) => api.post('/users/me/avatar', body).then(data),

  /** @returns {Promise<import('@/api/types').UserResponse>} */
  confirmAvatar: (fileId) => api.post(`/users/me/avatar/${fileId}/confirm`).then(data),

  /** @returns {Promise<import('@/api/types').UserResponse>} */
  removeAvatar: () => api.delete('/users/me/avatar').then(data),
}
