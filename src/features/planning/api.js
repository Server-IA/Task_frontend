import { api } from '@/api/client'

/** @typedef {import('@/api/types').CycleResponse} CycleResponse */
/** @typedef {import('@/api/types').ModuleResponse} ModuleResponse */

const data = (response) => response.data
const base = (slug, projectId, kind) => `/workspaces/${slug}/projects/${projectId}/${kind}`

/**
 * Ciclos y módulos tienen la misma API (`kind` = 'cycles' | 'modules').
 */
function planningApi(kind) {
  return {
    /** @returns {Promise<(CycleResponse|ModuleResponse)[]>} */
    list: (slug, projectId) => api.get(base(slug, projectId, kind)).then(data),

    create: (slug, projectId, body) => api.post(base(slug, projectId, kind), body).then(data),

    get: (slug, projectId, id) => api.get(`${base(slug, projectId, kind)}/${id}`).then(data),

    update: (slug, projectId, id, body) => api.patch(`${base(slug, projectId, kind)}/${id}`, body).then(data),

    remove: (slug, projectId, id) => api.delete(`${base(slug, projectId, kind)}/${id}`),

    addIssues: (slug, projectId, id, issueIds) =>
      api.post(`${base(slug, projectId, kind)}/${id}/issues`, { issueIds }).then(data),

    removeIssue: (slug, projectId, id, issueId) =>
      api.delete(`${base(slug, projectId, kind)}/${id}/issues/${issueId}`).then(data),
  }
}

export const cyclesApi = planningApi('cycles')
export const modulesApi = planningApi('modules')
