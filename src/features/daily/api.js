import { api } from '@/api/client'

/** @typedef {import('@/api/types').DailyResponse} DailyResponse */
/** @typedef {import('@/api/types').DailyNote} DailyNote */

const data = (response) => response.data
const base = (slug, projectId) => `/workspaces/${slug}/projects/${projectId}/daily`

/** Daily del proyecto: lo que hizo cada persona el día hábil anterior, lo de hoy, sus bloqueos y la nota del día. */
export const dailyApi = {
  /**
   * @param {string} date «2026-10-28»
   * @returns {Promise<DailyResponse>}
   */
  get: (slug, projectId, date) => api.get(base(slug, projectId), { params: { date } }).then(data),

  /**
   * Guarda la nota del día (cualquier miembro). Texto vacío la borra: el backend responde 204 y aquí, null.
   * @returns {Promise<DailyNote | null>}
   */
  saveNote: (slug, projectId, date, text) =>
    api.put(`${base(slug, projectId)}/note`, { text }, { params: { date } }).then((response) => (response.status === 204 ? null : response.data)),
}
