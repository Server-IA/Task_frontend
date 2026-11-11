import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { withSessionLock } from '@/api/session'
import { pendingInvitation } from '@/lib/pendingInvitation'
import { tokenStorage } from '@/lib/tokenStorage'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { playLogoutOutro } from '@/lib/intro'
import { useLayoutStore } from '@/stores/layoutStore'
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

/**
 * Comprueba al abrir la página que el enlace para restablecer la contraseña sirve (sin gastarlo). No se reintenta ni
 * se vuelve a pedir: el resultado solo cambia al usarlo, y el token no se guarda en el caché más de lo necesario.
 */
export function useValidateResetToken(token) {
  return useQuery({
    queryKey: ['resetPasswordToken', token],
    queryFn: () => authApi.validateResetToken(token),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword })
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: authApi.verifyEmail })
}

/**
 * Cierra la sesión en el backend (revoca el refresh token) y limpia todo en el navegador, incluido lo que
 * es de este usuario (último workspace, invitación pendiente). RequireAuth lleva al login sin recordar la
 * página: el siguiente usuario no debe aterrizar en la del anterior.
 */
export function useLogout() {
  const forgetSession = useForgetSession()
  return useMutation({
    mutationFn: async () => {
      // Primero la salida animada (la app se va y queda el logo en el centro); después se cierra de verdad
      await playLogoutOutro(() => useLayoutStore.getState().setLeaving(true))
      // Bajo el mismo lock que el refresh: se revoca el token vigente, no uno que se esté rotando
      return withSessionLock(async () => {
        const refreshToken = tokenStorage.get()
        if (refreshToken) {
          await authApi.logout(refreshToken).catch(() => {})
        }
      })
    },
    onSettled: forgetSession,
  })
}

/**
 * Limpia la sesión y lo que es del usuario en este navegador (último workspace, invitación pendiente, caché), sin
 * hablar con el backend. Lo usa el logout después de revocar el token y la pantalla «Sin conexión con el servidor»
 * para volver al login cuando el backend no responde (ahí no se puede revocar).
 */
export function useForgetSession() {
  const clearSession = useSessionStore((state) => state.clearSession)
  const setLastWorkspaceSlug = usePreferencesStore((state) => state.setLastWorkspaceSlug)
  const queryClient = useQueryClient()
  return () => {
    clearSession({ loggedOut: true })
    setLastWorkspaceSlug(null)
    pendingInvitation.clear()
    queryClient.clear()
  }
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

/**
 * Cambia el idioma de la cuenta. Al guardarse, la sesión toma el usuario nuevo y la página se recarga en ese idioma
 * (ver `followAccountLanguage` en la sesión).
 */
export function useUpdateLanguage() {
  const setUser = useSessionStore((state) => state.setUser)
  return useMutation({ mutationFn: userApi.updateLanguage, onSuccess: (user) => setUser(user) })
}

/** El backend cierra las demás sesiones y devuelve tokens nuevos para esta. */
export function useChangePassword() {
  const setSession = useSessionStore((state) => state.setSession)
  return useMutation({
    mutationFn: userApi.changePassword,
    onSuccess: (auth) => setSession(auth),
  })
}
