import { Loader2 } from 'lucide-react'
import { SplashStage } from '@/components/common/Splash'
import { cn } from '@/lib/utils'

export function Spinner({ className }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden="true" />
}

/**
 * Pantalla de carga mientras se recupera la sesión al abrir la app: el logo que se dibuja y una línea de «cargando».
 * Ocupa toda la ventana, igual que la entrada del login que la continúa (el logo no salta de lugar entre las dos).
 */
export function FullScreenLoader() {
  return (
    <div role="status" aria-label="Cargando" className="fixed inset-0 bg-background">
      <SplashStage />
    </div>
  )
}

export function CenteredSpinner({ className }) {
  return (
    <div className={cn('flex items-center justify-center p-10', className)}>
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}
