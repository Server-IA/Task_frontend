import { api } from '@/api/client'

/** @typedef {import('@/api/types').ProjectStats} ProjectStats */

const data = (response) => response.data

export const statsApi = {
  /**
   * Estadísticas del proyecto; `weeks` (4, 8 o 12) fija el periodo del ritmo de cierre y del tiempo de ciclo.
   * @returns {Promise<ProjectStats>}
   */
  get: (slug, projectId, weeks) =>
    api.get(`/workspaces/${slug}/projects/${projectId}/stats`, { params: { weeks } }).then(data),
}
