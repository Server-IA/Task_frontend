import { api } from '@/api/client'

/** @typedef {import('@/api/types').SavedView} SavedView */
/** @typedef {import('@/api/types').SavedViewFilters} SavedViewFilters */

const data = (response) => response.data
const base = (slug, projectId) => `/workspaces/${slug}/projects/${projectId}/views`

export const savedViewsApi = {
  /** Primero las compartidas y luego las personales, cada grupo en su orden. @returns {Promise<SavedView[]>} */
  list: (slug, projectId) => api.get(base(slug, projectId)).then(data),

  /**
   * Personal por defecto; `shared: true` solo para el project manager (403).
   * @param {{ name: string, shared?: boolean, filters?: SavedViewFilters }} body
   * @returns {Promise<SavedView>}
   */
  create: (slug, projectId, body) => api.post(base(slug, projectId), body).then(data),

  /**
   * @param {{ name?: string, filters?: SavedViewFilters, shared?: boolean, position?: number }} body
   * @returns {Promise<SavedView>}
   */
  update: (slug, projectId, viewId, body) => api.patch(`${base(slug, projectId)}/${viewId}`, body).then(data),

  remove: (slug, projectId, viewId) => api.delete(`${base(slug, projectId)}/${viewId}`),
}
