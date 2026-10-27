import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage({ title = 'Página no encontrada', description }) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">error 404</p>
      <h1 className="font-display text-[34px] leading-tight font-extrabold tracking-[-0.02em]">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {description ?? 'La página que buscas no existe o fue movida.'}
      </p>
      <Button asChild className="mt-2">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  )
}
