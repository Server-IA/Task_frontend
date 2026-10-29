import { api } from '@/api/client'

/** @typedef {import('@/api/types').CommentResponse} CommentResponse */

const data = (response) => response.data
const base = (slug, projectId, issueId) => `/workspaces/${slug}/projects/${projectId}/issues/${issueId}/comments`

export const commentsApi = {
  /** @returns {Promise<CommentResponse[]>} */
  list: (slug, projectId, issueId) => api.get(base(slug, projectId, issueId)).then(data),

  /** @returns {Promise<CommentResponse>} */
  create: (slug, projectId, issueId, body) => api.post(base(slug, projectId, issueId), { body }).then(data),

  /** @returns {Promise<CommentResponse>} */
  update: (slug, projectId, issueId, commentId, body) =>
    api.patch(`${base(slug, projectId, issueId)}/${commentId}`, { body }).then(data),

  remove: (slug, projectId, issueId, commentId) => api.delete(`${base(slug, projectId, issueId)}/${commentId}`),
}
