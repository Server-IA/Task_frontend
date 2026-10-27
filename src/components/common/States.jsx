import { Link } from 'react-router'
import { Lock, SearchX, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

/** Estado vacío con ícono, texto y una acción opcional. */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-2xl border bg-card text-muted-foreground">
          <Icon className="size-5.5" />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** Error al cargar una página o sección, según el código HTTP. */
export function ErrorState({ error, onRetry, homeLink = '/', className }) {
  const { status, message } = toApiError(error)

  if (status === 403) {
    return (
      <EmptyState
        className={className}
        icon={Lock}
        title="No tienes acceso"
        description="No eres miembro de este espacio o no tienes permiso para verlo."
        action={
          <Button asChild variant="outline">
            <Link to={homeLink}>Volver</Link>
          </Button>
        }
      />
    )
  }
  if (status === 404) {
    return (
      <EmptyState
        className={className}
        icon={SearchX}
        title="No encontrado"
        description={message}
        action={
          <Button asChild variant="outline">
            <Link to={homeLink}>Volver</Link>
          </Button>
        }
      />
    )
  }
  return (
    <EmptyState
      className={className}
      icon={TriangleAlert}
      title="Algo salió mal"
      description={message}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        )
      }
    />
  )
}
