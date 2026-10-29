import { api } from '@/api/client'

/** @typedef {import('@/api/types').ChecklistItem} ChecklistItem */

const data = (response) => response.data
const base = (slug, projectId, issueId) => `/workspaces/${slug}/projects/${projectId}/issues/${issueId}/checklist`

export const checklistApi = {
  /** Criterios primero y luego pasos, cada grupo por posición. @returns {Promise<ChecklistItem[]>} */
  list: (slug, projectId, issueId) => api.get(base(slug, projectId, issueId)).then(data),

  /**
   * @param {{ kind: 'CRITERION' | 'CHECK', text: string }} body
   * @returns {Promise<ChecklistItem>}
   */
  create: (slug, projectId, issueId, body) => api.post(base(slug, projectId, issueId), body).then(data),

  /**
   * @param {{ text?: string, done?: boolean, position?: number }} body
   * @returns {Promise<ChecklistItem>}
   */
  update: (slug, projectId, issueId, itemId, body) =>
    api.patch(`${base(slug, projectId, issueId)}/${itemId}`, body).then(data),

  remove: (slug, projectId, issueId, itemId) => api.delete(`${base(slug, projectId, issueId)}/${itemId}`),
}
