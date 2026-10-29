import { api } from '@/api/client'

/** @typedef {import('@/api/types').ActivityFeedItem} ActivityFeedItem */
/** @typedef {import('@/api/types').ActivitySummary} ActivitySummary */

const data = (response) => response.data

export const activityApi = {
  /**
   * Historial de las tareas de todos los proyectos accesibles, de lo más reciente a lo más antiguo. `before` es
   * el `nextCursor` de la página anterior (sin él, la primera página).
   * @param {{ type?: 'all' | 'state' | 'comments' | 'assignments', projectId?: string, actorId?: string,
   *           before?: string, size?: number }} params
   * @returns {Promise<import('@/api/types').Page<ActivityFeedItem>>}
   */
  feed: (slug, params) => api.get(`/workspaces/${slug}/activity`, { params }).then(data),

  /** @returns {Promise<ActivitySummary>} */
  summary: (slug, days = 7) => api.get(`/workspaces/${slug}/activity/summary`, { params: { days } }).then(data),
}
