import { Navigate, Outlet, useLocation } from 'react-router'
import { getPostLoginPath } from '@/lib/pendingInvitation'
import { useSessionStore } from '@/stores/sessionStore'

/** Login, registro, etc.: si ya hay sesión no tiene sentido mostrarlas. */
export function PublicOnlyRoute() {
  const status = useSessionStore((state) => state.status)
  const location = useLocation()

  if (status === 'authenticated') {
    return <Navigate to={getPostLoginPath(location)} replace />
  }
  return <Outlet />
}
