import { api } from '@/api/client'

/** @typedef {import('@/api/types').IssueResponse} IssueResponse */

const data = (response) => response.data

export const searchApi = {
  /**
   * Tareas de todos los proyectos accesibles que coinciden con el texto (título o código).
   * @returns {Promise<IssueResponse[]>}
   */
  issues: (slug, q, limit = 8) => api.get(`/workspaces/${slug}/search`, { params: { q, limit } }).then(data),
}
