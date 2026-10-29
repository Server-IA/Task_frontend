import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { WifiOff } from 'lucide-react'
import { listenToOtherTabs, restoreSession } from '@/api/session'
import { Button } from '@/components/ui/button'
import { FullScreenLoader } from '@/components/common/Loaders'
import { EmptyState } from '@/components/common/States'
import { useForgetSession } from '@/features/auth/hooks'
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
  if (status === 'offline') return <OfflineScreen />
  return <Outlet />
}

/**
 * El backend no respondió al abrir la app: se conserva la sesión y se reintenta al volver la conexión. Si el servidor
 * sigue fallando, «Iniciar sesión de nuevo» olvida la sesión en este navegador y lleva al login (o a otra cuenta).
 */
function OfflineScreen() {
  const forgetSession = useForgetSession()

  useEffect(() => {
    const retry = () => restoreSession()
    window.addEventListener('online', retry)
    window.addEventListener('focus', retry)
    return () => {
      window.removeEventListener('online', retry)
      window.removeEventListener('focus', retry)
    }
  }, [])

  return (
    <EmptyState
      className="h-full"
      icon={WifiOff}
      title="Sin conexión con el servidor"
      description="No pudimos recuperar tu sesión. Revisa tu conexión; reintentaremos cuando vuelva."
      action={
        <div className="flex gap-2">
          <Button onClick={() => restoreSession()}>Reintentar</Button>
          <Button variant="outline" onClick={forgetSession}>
            Iniciar sesión de nuevo
          </Button>
        </div>
      }
    />
  )
}
