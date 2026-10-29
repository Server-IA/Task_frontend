import { api } from '@/api/client'

/** @typedef {import('@/api/types').AuthResponse} AuthResponse */
/** @typedef {import('@/api/types').UserResponse} UserResponse */

const data = (response) => response.data

export const authApi = {
  /** @returns {Promise<UserResponse>} */
  register: (body) => api.post('/auth/register', body).then(data),

  verifyEmail: (token) => api.post('/auth/verify-email', { token }).then(data),

  resendVerification: (email) => api.post('/auth/resend-verification', { email }).then(data),

  /** @returns {Promise<AuthResponse>} */
  login: (body) => api.post('/auth/login', body).then(data),

  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),

  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(data),

  /** Comprueba el enlace sin usarlo: 204 si sirve, 400 si no es válido, ya se usó o venció. */
  validateResetToken: (token) => api.get('/auth/reset-password/validate', { params: { token } }).then(() => true),

  resetPassword: (body) => api.post('/auth/reset-password', body).then(data),
}

export const userApi = {
  /** @returns {Promise<UserResponse>} */
  me: () => api.get('/users/me').then(data),

  /** @returns {Promise<UserResponse>} */
  updateProfile: (body) => api.patch('/users/me', body).then(data),

  /** @returns {Promise<AuthResponse>} */
  changePassword: (body) => api.patch('/users/me/password', body).then(data),
}
