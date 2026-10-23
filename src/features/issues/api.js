import { api } from '@/api/client'

/** @typedef {import('@/api/types').IssueResponse} IssueResponse */
/** @typedef {import('@/api/types').ActivityResponse} ActivityResponse */

const data = (response) => response.data
const base = (slug, projectId) => `/workspaces/${slug}/projects/${projectId}/issues`

export const issuesApi = {
  /**
   * @param {{ state?: string[], priority?: string[], assignee?: string[], label?: string[], search?: string,
   *           cycle?: string, module?: string, page?: number, size?: number, sort?: string }} params
   * @returns {Promise<import('@/api/types').Page<IssueResponse>>}
   */
  list: (slug, projectId, params) => api.get(base(slug, projectId), { params }).then(data),

  /** @returns {Promise<IssueResponse>} */
  create: (slug, projectId, body) => api.post(base(slug, projectId), body).then(data),

  /** @returns {Promise<IssueResponse>} */
  get: (slug, projectId, issueId) => api.get(`${base(slug, projectId)}/${issueId}`).then(data),

  /** @returns {Promise<IssueResponse>} */
  update: (slug, projectId, issueId, body) => api.patch(`${base(slug, projectId)}/${issueId}`, body).then(data),

  /** @returns {Promise<IssueResponse>} */
  move: (slug, projectId, issueId, body) => api.patch(`${base(slug, projectId)}/${issueId}/move`, body).then(data),

  remove: (slug, projectId, issueId) => api.delete(`${base(slug, projectId)}/${issueId}`),

  /** @returns {Promise<IssueResponse[]>} */
  subIssues: (slug, projectId, issueId) => api.get(`${base(slug, projectId)}/${issueId}/sub-issues`).then(data),

  /** @returns {Promise<ActivityResponse[]>} */
  activity: (slug, projectId, issueId) => api.get(`${base(slug, projectId)}/${issueId}/activity`).then(data),
}
