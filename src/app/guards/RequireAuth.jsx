import { Navigate, Outlet, useLocation } from 'react-router'
import { RealtimeSync } from '@/features/realtime/RealtimeSync'
import { useSessionStore } from '@/stores/sessionStore'

/**
 * Solo deja pasar con sesión; si no, va al login recordando a dónde quería ir. Tras un cierre de sesión
 * explícito no se recuerda: quien entre después no debe aterrizar en la página del usuario anterior.
 */
export function RequireAuth() {
  const status = useSessionStore((state) => state.status)
  const loggedOut = useSessionStore((state) => state.loggedOut)
  const location = useLocation()

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={loggedOut ? undefined : { from: location }} />
  }
  return (
    <>
      {/* Con la sesión abierta, la pantalla se actualiza sola con lo que cambian los demás */}
      <RealtimeSync />
      <Outlet />
    </>
  )
}
