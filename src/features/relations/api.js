import { api } from '@/api/client'

/** @typedef {import('@/api/types').IssueRelations} IssueRelations */
/** @typedef {import('@/api/types').IssueRelation} IssueRelation */

const data = (response) => response.data
const base = (slug, projectId, issueId) => `/workspaces/${slug}/projects/${projectId}/issues/${issueId}/relations`

export const relationsApi = {
  /** @returns {Promise<IssueRelations>} */
  list: (slug, projectId, issueId) => api.get(base(slug, projectId, issueId)).then(data),

  /**
   * @param {{ type: import('@/api/types').RelationType, issueId: string }} body
   * @returns {Promise<IssueRelation>}
   */
  create: (slug, projectId, issueId, body) => api.post(base(slug, projectId, issueId), body).then(data),

  remove: (slug, projectId, issueId, relationId) => api.delete(`${base(slug, projectId, issueId)}/${relationId}`),
}
