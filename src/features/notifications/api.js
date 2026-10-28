import { api } from '@/api/client'

/** @typedef {import('@/api/types').NotificationResponse} NotificationResponse */
/** @typedef {NonNullable<NotificationResponse['type']>} NotificationType */

const data = (response) => response.data

export const notificationsApi = {
  /**
   * `types` filtra por tipo (sin tipos, todos); `unread` deja solo las sin leer.
   * @param {{ unread?: boolean, types?: NotificationType[], page?: number, size?: number }} [params]
   * @returns {Promise<import('@/api/types').Page<NotificationResponse>>}
   */
  list: ({ unread = false, types, page = 0, size = 20 } = {}) =>
    api.get('/notifications', { params: { unread, type: types?.length ? types : undefined, page, size } }).then(data),

  /** @returns {Promise<{ count: number }>} */
  unreadCount: () => api.get('/notifications/unread-count').then(data),

  /**
   * Contadores de la Bandeja: sin leer, menciones sin leer y menciones en total.
   * @returns {Promise<{ unread: number, unreadMentions: number, mentions: number }>}
   */
  counts: () => api.get('/notifications/counts').then(data),

  /** @returns {Promise<NotificationResponse>} */
  markAsRead: (id) => api.patch(`/notifications/${id}/read`).then(data),

  markAllAsRead: () => api.post('/notifications/read-all'),
}
