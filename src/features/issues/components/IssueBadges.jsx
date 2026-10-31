import { ArrowRight, Ban, Paperclip, SquareCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { blockedBySummary, blockingSummary, checklistProgress, joinCodes } from '../issueFlags'

/**
 * «⊘ bloqueada» en rojo cuando otra tarea abierta la bloquea.
 * `codes` muestra cuál: `'by'` → «bloqueada por WEB-2» (tarjetas del tablero), `'inline'` → «bloqueada · WEB-2»
 * (filas de la lista); con varias se agrega «+1». Sin `codes`, «bloqueada» y el número si son varias.
 * @param {{ issue: import('@/api/types').IssueResponse | undefined, codes?: 'by' | 'inline', className?: string }} props
 */
export function BlockedChip({ issue, codes, className }) {
  const summary = blockedBySummary(issue)
  if (!summary) return null
  const { count, first, more } = summary
  const title =
    summary.codes.length > 0
      ? `Bloqueada por ${joinCodes(summary.codes)}`
      : `Bloqueada por ${count} ${count === 1 ? 'tarea abierta' : 'tareas abiertas'}`
  const showCode = Boolean(codes && first)

  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md bg-late-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-late',
        className,
      )}
    >
      <Ban className="size-3" strokeWidth={2.5} aria-hidden="true" />
      {showCode ? (
        <>
          {codes === 'by' ? 'bloqueada por' : 'bloqueada ·'}
          <span className="font-mono text-[11px]">{first}</span>
          {more > 0 && <span className="font-mono text-[11px] opacity-80">+{more}</span>}
        </>
      ) : (
        <>
          bloqueada
          {count > 1 && <span className="font-mono text-[11px]">· {count}</span>}
        </>
      )}
    </span>
  )
}

/** «→ bloquea WEB-7» (o «bloquea 2» si son varias) en gris: tareas abiertas que esperan a esta. Solo informa. */
export function BlockingChip({ issue, className }) {
  const summary = blockingSummary(issue)
  if (!summary) return null
  return (
    <span
      title={`Bloquea a ${joinCodes(summary.codes)}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground',
        className,
      )}
    >
      <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden="true" />
      bloquea
      <span className="font-mono text-[11px] text-foreground">{summary.label}</span>
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

/**
 * «📎 5»: cuántos archivos tiene la tarea en Adjuntos (las imágenes dentro del texto no cuentan). Con 0 no se muestra;
 * `reserve` deja el lugar vacío (la columna fija de la lista).
 * @param {{ issue: { attachmentCount?: number | null } | undefined, reserve?: boolean, className?: string }} props
 */
export function AttachmentsChip({ issue, reserve = false, className }) {
  const count = issue?.attachmentCount ?? 0
  if (count <= 0 && !reserve) return null
  const label = count === 1 ? '1 adjunto' : `${count} adjuntos`
  return (
    <span
      title={count > 0 ? label : 'Sin adjuntos'}
      aria-label={count > 0 ? label : undefined}
      aria-hidden={count > 0 ? undefined : true}
      className={cn('inline-flex shrink-0 items-center gap-0.75 font-mono text-[11px] text-muted-foreground', className)}
    >
      {count > 0 && (
        <>
          <Paperclip className="size-3" strokeWidth={2.2} aria-hidden="true" />
          {count}
        </>
      )}
    </span>
  )
}
