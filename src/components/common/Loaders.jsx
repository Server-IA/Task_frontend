import { Loader2 } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils'

export function Spinner({ className }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden="true" />
}

/** Pantalla de carga mientras se recupera la sesión al abrir la app. */
export function FullScreenLoader() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Logo withText={false} className="animate-pulse" />
      <Spinner className="size-5 text-muted-foreground" />
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
