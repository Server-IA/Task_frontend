import { Ban, SquareCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { blockedCount, checklistProgress } from '../issueFlags'

/** «⊘ bloqueada» en rojo cuando otra tarea abierta la bloquea (con el número si son varias). */
export function BlockedChip({ issue, className }) {
  const count = blockedCount(issue)
  if (count === 0) return null
  return (
    <span
      title={`Bloqueada por ${count} ${count === 1 ? 'tarea abierta' : 'tareas abiertas'}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md bg-late-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-late',
        className,
      )}
    >
      <Ban className="size-3" strokeWidth={2.5} aria-hidden="true" />
      bloqueada
      {count > 1 && <span className="font-mono text-[11px]">· {count}</span>}
    </span>
  )
}

/** «☑ 3/5»: criterios y pasos marcados (verde cuando están todos). */
export function ChecklistChip({ issue, className }) {
  const progress = checklistProgress(issue)
  if (!progress) return null
  return (
    <span
      title={progress.label}
      aria-label={`Checklist: ${progress.label}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground',
        progress.complete && 'text-ok',
        className,
      )}
    >
      <SquareCheck className="size-3" aria-hidden="true" />
      {progress.done}/{progress.total}
    </span>
  )
}
