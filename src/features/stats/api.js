import { api } from '@/api/client'

/** @typedef {import('@/api/types').ProjectStats} ProjectStats */
/** @typedef {import('@/api/types').DevelopmentStats} DevelopmentStats */

const data = (response) => response.data

export const statsApi = {
  /**
   * Estadísticas del proyecto; `weeks` (4, 8 o 12) fija el periodo del ritmo de cierre y del tiempo de ciclo.
   * `assignee` («+ persona», repetible) limita todas las métricas a las tareas asignadas a esas personas.
   * @param {{ weeks: number, assignee?: string[] }} params
   * @returns {Promise<ProjectStats>}
   */
  get: (slug, projectId, { weeks, assignee = [] }) =>
    api
      .get(`/workspaces/${slug}/projects/${projectId}/stats`, {
        params: { weeks, ...(assignee.length > 0 && { assignee }) },
      })
      .then(data),

  /**
   * Pull requests y ejecuciones de GitHub Actions de los repositorios enlazados al proyecto en las últimas `weeks`
   * semanas. Sin repositorios, `repositories` es 0 y lo demás viene vacío.
   * @param {{ weeks: number }} params
   * @returns {Promise<DevelopmentStats>}
   */
  development: (slug, projectId, { weeks }) =>
    api.get(`/workspaces/${slug}/projects/${projectId}/stats/development`, { params: { weeks } }).then(data),
}
