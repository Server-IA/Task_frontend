import { Link } from 'react-router'
import { GitBranch, GitMerge, GitPullRequest, GitPullRequestClosed } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { stateName } from '@/i18n'
import { cn } from '@/lib/utils'
import { devIndicator, pullState, TONE } from './githubModel'
import { useIssueGithubSummary } from './hooks'

/** Piezas que comparten las pantallas de GitHub: la marca, las píldoras de estado, los iconos y el indicador de tarea. */

/** La marca de GitHub: sus siglas sobre el color del texto (no se usa su logo). */
export function GhMark({ size = 'lg', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-foreground text-background flex shrink-0 items-center justify-center font-mono font-semibold',
        size === 'lg' ? 'size-11 rounded-xl text-sm' : 'size-6 rounded-md text-[10px]',
        className,
      )}
    >
      GH
    </span>
  )
}

/** Una píldora con el color de un estado. `outline`: solo el borde punteado (algo que todavía no empieza). */
export function TonePill({ tone, outline = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold whitespace-nowrap',
        outline ? 'border-dash text-muted-foreground border border-dashed' : TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const ICONS = { pr: GitPullRequest, merge: GitMerge, closed: GitPullRequestClosed, branch: GitBranch }

/** El icono de un pull request según su estado, dentro de un círculo con su color; lo que dice va en `aria-label`. */
export function PullMark({ state, className }) {
  const info = pullState(state)
  const Icon = ICONS[info.icon]
  return (
    <span
      role="img"
      aria-label={info.label}
      className={cn(
        'flex size-7.5 shrink-0 items-center justify-center rounded-full',
        TONE[info.tone],
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
    </span>
  )
}

/** La marca de una ejecución o de un check: ✓, × o · dentro de un círculo (punteado si todavía no empieza). */
export function StateMark({ info, className }) {
  return (
    <span
      role="img"
      aria-label={info.label}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold',
        info.outline ? 'border-dash border border-dashed' : TONE[info.tone],
        className,
      )}
    >
      {info.mark}
    </span>
  )
}

/**
 * El indicador de GitHub de una tarea en el tablero y la lista: nada, «rama», «#128 · falló»… Con pull request es un
 * enlace a él.
 * @param {{ summary: import('./api').IssueSummary | undefined, className?: string }} props
 */
export function DevChip({ summary, className }) {
  const info = devIndicator(summary)
  if (!info) return null
  const Icon = ICONS[info.icon]
  const classes = cn(
    'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold whitespace-nowrap',
    TONE[info.tone],
    className,
  )
  const content = (
    <>
      <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
      {info.text}
    </>
  )
  if (!summary.prUrl) {
    return (
      <span title={info.title} className={classes}>
        {content}
      </span>
    )
  }
  return (
    <a
      href={summary.prUrl}
      target="_blank"
      rel="noreferrer"
      title={info.title}
      // Dentro de una tarjeta o una fila que se abre al hacer clic: el enlace no abre la tarea
      onClick={(event) => event.stopPropagation()}
      className={cn(
        classes,
        'focus-visible:ring-ring hover:underline focus-visible:ring-2 focus-visible:outline-none',
      )}
    >
      {content}
    </a>
  )
}

/** El indicador de GitHub de una tarea, leído del resumen del proyecto (para las tarjetas del tablero y las filas de la lista). */
export function IssueDevChip({ slug, projectId, issueId, className }) {
  return <DevChip summary={useIssueGithubSummary(slug, projectId, issueId)} className={className} />
}

/**
 * Un selector sencillo de una lista de opciones `{ value, label }`.
 * @param {{ value: string, onChange: (value: string) => void, options: { value: string, label: string }[],
 *           label: string, placeholder?: string, disabled?: boolean, mono?: boolean, className?: string }} props
 */
export function Pick({ value, onChange, options, label, placeholder, disabled, mono = false, className }) {
  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        aria-label={label}
        className={cn('h-8.5 min-w-0', mono && 'font-mono text-[12.5px]', className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn(mono && 'font-mono text-[12.5px]')}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** El enlace a una tarea: su código y, si se pasa, en qué estado está. */
export function TaskLink({ slug, projectId, issueId, code, state }) {
  return (
    <Link
      to={`/${slug}/projects/${projectId}/issues/${issueId}`}
      className="hover:border-dash hover:bg-muted focus-visible:ring-ring inline-flex shrink-0 items-center gap-1.75 rounded-lg border px-2 py-1 text-[12.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="font-mono text-xs font-semibold">{code}</span>
      {state && <span className="text-muted-foreground">{stateName(state)}</span>}
    </Link>
  )
}
