import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { listenToOtherTabs, restoreSession } from '@/api/session'
import { FullScreenLoader } from '@/components/common/Loaders'
import { useSessionStore } from '@/stores/sessionStore'

// Fuera del componente: en desarrollo StrictMode monta los efectos dos veces y el refresh
// inicial no debe salir dos veces (el backend rota el token).
let restoreStarted = false

/** Raíz de todas las rutas: recupera la sesión al abrir la app antes de mostrar nada. */
export function SessionGate() {
  const status = useSessionStore((state) => state.status)

  useEffect(() => {
    if (!restoreStarted) {
      restoreStarted = true
      restoreSession()
    }
    return listenToOtherTabs()
  }, [])

  if (status === 'loading') return <FullScreenLoader />
  return <Outlet />
}
