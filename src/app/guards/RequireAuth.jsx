import { Navigate, Outlet, useLocation } from 'react-router'
import { useSessionStore } from '@/stores/sessionStore'

/** Solo deja pasar con sesión; si no, va al login recordando a dónde quería ir. */
export function RequireAuth() {
  const status = useSessionStore((state) => state.status)
  const location = useLocation()

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
