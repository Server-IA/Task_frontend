import { api } from '@/api/client'

/** @typedef {import('@/api/types').IssueResponse} IssueResponse */

const data = (response) => response.data

export const searchApi = {
  /**
   * Tareas de todos los proyectos accesibles que coinciden con el texto (título o código).
   * @returns {Promise<IssueResponse[]>}
   */
  issues: (slug, q, limit = 8) => api.get(`/workspaces/${slug}/search`, { params: { q, limit } }).then(data),

  /**
   * Tareas con esos códigos («WEB-12»), de los proyectos accesibles (las que no existen no vienen).
   * @param {string[]} codes hasta 50
   * @returns {Promise<IssueResponse[]>}
   */
  byCodes: (slug, codes) => api.get(`/workspaces/${slug}/search/codes`, { params: { codes: codes.join(',') } }).then(data),
}
