import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { getPostLoginPath } from '@/lib/pendingInvitation'
import { useSessionStore } from '@/stores/sessionStore'

/** Login, registro, etc.: si ya hay sesión no tiene sentido mostrarlas. */
export function PublicOnlyRoute() {
  const status = useSessionStore((state) => state.status)
  const loggedOut = useSessionStore((state) => state.loggedOut)
  const location = useLocation()

  // Ya en el login tras cerrar sesión: desde aquí, una página protegida vuelve a recordarse para después del login
  useEffect(() => {
    if (loggedOut) useSessionStore.setState({ loggedOut: false })
  }, [loggedOut])

  if (status === 'authenticated') {
    return <Navigate to={getPostLoginPath(location)} replace />
  }
  return <Outlet />
}
