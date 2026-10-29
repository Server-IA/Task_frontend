import { api } from '@/api/client'

/** @typedef {import('@/api/types').ProjectResponse} ProjectResponse */
/** @typedef {import('@/api/types').ProjectMember} ProjectMember */
/** @typedef {import('@/api/types').StateResponse} StateResponse */
/** @typedef {import('@/api/types').LabelResponse} LabelResponse */

const data = (response) => response.data
const base = (slug) => `/workspaces/${slug}/projects`

export const projectsApi = {
  /** @returns {Promise<ProjectResponse[]>} */
  list: (slug) => api.get(base(slug)).then(data),

  /** @returns {Promise<ProjectResponse>} */
  create: (slug, body) => api.post(base(slug), body).then(data),

  /** @returns {Promise<ProjectResponse>} */
  get: (slug, projectId) => api.get(`${base(slug)}/${projectId}`).then(data),

  /** @returns {Promise<ProjectResponse>} */
  update: (slug, projectId, body) => api.patch(`${base(slug)}/${projectId}`, body).then(data),

  remove: (slug, projectId) => api.delete(`${base(slug)}/${projectId}`),

  /** @returns {Promise<ProjectMember[]>} */
  members: (slug, projectId) => api.get(`${base(slug)}/${projectId}/members`).then(data),

  /** @returns {Promise<ProjectMember>} */
  addMember: (slug, projectId, userId) => api.post(`${base(slug)}/${projectId}/members`, { userId }).then(data),

  removeMember: (slug, projectId, userId) => api.delete(`${base(slug)}/${projectId}/members/${userId}`),
}

export const statesApi = {
  /** @returns {Promise<StateResponse[]>} */
  list: (slug, projectId) => api.get(`${base(slug)}/${projectId}/states`).then(data),

  /** @returns {Promise<StateResponse>} */
  create: (slug, projectId, body) => api.post(`${base(slug)}/${projectId}/states`, body).then(data),

  /** @returns {Promise<StateResponse>} */
  update: (slug, projectId, stateId, body) =>
    api.patch(`${base(slug)}/${projectId}/states/${stateId}`, body).then(data),

  remove: (slug, projectId, stateId) => api.delete(`${base(slug)}/${projectId}/states/${stateId}`),

  /**
   * Nuevo orden de las columnas: `stateIds` trae todos los estados del proyecto, cada uno una vez.
   * @returns {Promise<StateResponse[]>} los estados en el orden nuevo
   */
  reorder: (slug, projectId, stateIds) =>
    api.put(`${base(slug)}/${projectId}/states/order`, { stateIds }).then(data),
}

export const labelsApi = {
  /** @returns {Promise<LabelResponse[]>} */
  list: (slug, projectId) => api.get(`${base(slug)}/${projectId}/labels`).then(data),

  /** @returns {Promise<LabelResponse>} */
  create: (slug, projectId, body) => api.post(`${base(slug)}/${projectId}/labels`, body).then(data),

  /** @returns {Promise<LabelResponse>} */
  update: (slug, projectId, labelId, body) =>
    api.patch(`${base(slug)}/${projectId}/labels/${labelId}`, body).then(data),

  remove: (slug, projectId, labelId) => api.delete(`${base(slug)}/${projectId}/labels/${labelId}`),
}
