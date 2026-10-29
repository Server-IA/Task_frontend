import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Aviso de solo lectura para quien no es project manager («Solo el project manager puede…»). */
export function LockNote({ children, className }) {
  return (
    <p className={cn('flex items-center gap-1.5 font-mono text-xs text-muted-foreground', className)}>
      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
