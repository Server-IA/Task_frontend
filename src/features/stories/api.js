import { api } from '@/api/client'

/** @typedef {import('@/api/types').IssueResponse} IssueResponse */
/** @typedef {import('@/api/types').StoryRow} StoryRow */

const data = (response) => response.data
const base = (slug, projectId) => `/workspaces/${slug}/projects/${projectId}`

export const storiesApi = {
  /** Historias del proyecto (abiertas y cerradas) con progreso, personas, tareas, bugs y relacionadas. @returns {Promise<StoryRow[]>} */
  list: (slug, projectId) => api.get(`${base(slug, projectId)}/stories`).then(data),

  /**
   * «Partir en tareas» (project manager): todas las líneas en una transacción.
   * @param {{ items: import('@/api/types').SplitItem[], reopen?: boolean }} body
   * @returns {Promise<IssueResponse[]>}
   */
  split: (slug, projectId, storyId, body) => api.post(`${base(slug, projectId)}/issues/${storyId}/split`, body).then(data),

  /** «Cerrar historia» (project manager). @returns {Promise<IssueResponse>} */
  close: (slug, projectId, storyId) => api.post(`${base(slug, projectId)}/issues/${storyId}/close`).then(data),

  /** «Reabrir» (project manager). @returns {Promise<IssueResponse>} */
  reopen: (slug, projectId, storyId) => api.post(`${base(slug, projectId)}/issues/${storyId}/reopen`).then(data),
}
