import { api } from '@/api/client'

/** @typedef {import('@/api/types').IssueTemplate} IssueTemplate */

const data = (response) => response.data
const base = (slug, projectId) => `/workspaces/${slug}/projects/${projectId}/templates`

export const templatesApi = {
  /** En su orden. @returns {Promise<IssueTemplate[]>} */
  list: (slug, projectId) => api.get(base(slug, projectId)).then(data),

  /**
   * Solo el project manager (403 para los demás).
   * @param {import('@/api/types').IssueTemplateRequest} body
   * @returns {Promise<IssueTemplate>}
   */
  create: (slug, projectId, body) => api.post(base(slug, projectId), body).then(data),

  /** Edición parcial (también `position` para reordenar). @returns {Promise<IssueTemplate>} */
  update: (slug, projectId, templateId, body) => api.patch(`${base(slug, projectId)}/${templateId}`, body).then(data),

  remove: (slug, projectId, templateId) => api.delete(`${base(slug, projectId)}/${templateId}`),
}
