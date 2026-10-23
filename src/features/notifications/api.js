import { api } from '@/api/client'

/** @typedef {import('@/api/types').NotificationResponse} NotificationResponse */

const data = (response) => response.data

export const notificationsApi = {
  /** @returns {Promise<import('@/api/types').Page<NotificationResponse>>} */
  list: ({ unread = false, page = 0, size = 20 } = {}) =>
    api.get('/notifications', { params: { unread, page, size } }).then(data),

  /** @returns {Promise<{ count: number }>} */
  unreadCount: () => api.get('/notifications/unread-count').then(data),

  /** @returns {Promise<NotificationResponse>} */
  markAsRead: (id) => api.patch(`/notifications/${id}/read`).then(data),

  markAllAsRead: () => api.post('/notifications/read-all'),
}
