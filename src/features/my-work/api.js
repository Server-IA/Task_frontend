import { api } from '@/api/client'

/** @typedef {import('@/api/types').MyWorkResponse} MyWorkResponse */

const data = (response) => response.data

export const myWorkApi = {
  /**
   * Tareas abiertas del usuario en el workspace (ordenadas por fecha límite) y los contadores de cada vista.
   * @param {'assigned' | 'created' | 'commented'} view
   * @returns {Promise<MyWorkResponse>}
   */
  get: (slug, view) => api.get(`/workspaces/${slug}/my-work`, { params: { view } }).then(data),
}
