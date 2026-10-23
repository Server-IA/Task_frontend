import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { tokenStorage } from '@/lib/tokenStorage'
import { useSessionStore } from '@/stores/sessionStore'
import { authApi, userApi } from './api'

export function useLogin() {
  const setSession = useSessionStore((state) => state.setSession)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (auth) => {
      queryClient.clear()
      setSession(auth)
    },
  })
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register })
}

export function useResendVerification() {
  return useMutation({ mutationFn: authApi.resendVerification })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword })
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword })
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: authApi.verifyEmail })
}

/** Cierra la sesión en el backend (revoca el refresh token) y limpia todo en el navegador. */
export function useLogout() {
  const clearSession = useSessionStore((state) => state.clearSession)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokenStorage.get()
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => {})
      }
    },
    onSettled: () => {
      clearSession()
      queryClient.clear()
    },
  })
}

export function useMe() {
  const setUser = useSessionStore((state) => state.setUser)
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const user = await userApi.me()
      setUser(user)
      return user
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const setUser = useSessionStore((state) => state.setUser)
  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user)
      setUser(user)
      // El nombre y el avatar aparecen en miembros, asignados, comentarios…
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'me' })
    },
  })
}

/** El backend cierra las demás sesiones y devuelve tokens nuevos para esta. */
export function useChangePassword() {
  const setSession = useSessionStore((state) => state.setSession)
  return useMutation({
    mutationFn: userApi.changePassword,
    onSuccess: (auth) => setSession(auth),
  })
}
