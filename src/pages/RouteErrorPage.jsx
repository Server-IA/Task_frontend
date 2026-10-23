import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotFoundPage } from './NotFoundPage'

/** Pantalla para errores inesperados de renderizado (en lugar de la pantalla técnica de React Router). */
export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  if (import.meta.env.DEV) {
    console.error(error)
  }

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </div>
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ocurrió un error inesperado al mostrar esta página. Recarga para intentarlo de nuevo.
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={() => window.location.reload()}>Recargar</Button>
        <Button asChild variant="outline">
          <Link to="/">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
