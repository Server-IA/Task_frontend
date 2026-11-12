import { useState } from 'react'
import { Link } from 'react-router'
import { Check, ChevronDown, GitBranch, GitMerge, GitPullRequest, GitPullRequestClosed } from 'lucide-react'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { stateName, t } from '@/i18n'
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

/** Desde cuántas opciones la lista trae buscador. */
const SEARCH_FROM = 8
/** Cuántas opciones se dibujan a la vez: con cientos de ramas, el resto se encuentra buscando. */
const SHOWN = 100

/**
 * Un selector de una lista de opciones `{ value, label }`. La lista se abre debajo del campo (no lo tapa), los textos
 * largos se cortan con «…» y, con muchas opciones (las ramas de un repositorio), trae buscador y dibuja solo las
 * primeras que coinciden.
 * @param {{ value: string, onChange: (value: string) => void, options: { value: string, label: string }[],
 *           label: string, placeholder?: string, disabled?: boolean, mono?: boolean, className?: string }} props
 */
export function Pick({ value, onChange, options, label, placeholder, disabled, mono = false, className }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const chosen = options.find((option) => option.value === value)
  const searchable = options.length > SEARCH_FROM
  const needle = query.trim().toLowerCase()
  const matches = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options
  const shown = matches.slice(0, SHOWN)

  const handleOpen = (next) => {
    setOpen(next)
    if (!next) setQuery('')
  }
  const handlePick = (option) => {
    onChange(option.value)
    handleOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          title={chosen?.label}
          className={cn(
            'border-input dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 flex h-8.5 min-w-0 items-center gap-2 rounded-md border bg-transparent px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
            mono && 'font-mono text-[12.5px]',
            className,
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate text-left', !chosen && 'text-muted-foreground')}>
            {chosen?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-(--radix-popover-trigger-width) max-w-[min(30rem,calc(100vw-2rem))] min-w-56 p-0"
      >
        <Command shouldFilter={false} label={label}>
          {searchable && <CommandInput value={query} onValueChange={setQuery} placeholder={t('Buscar…')} />}
          <CommandList className="max-h-72">
            <CommandEmpty>{t('Sin resultados')}</CommandEmpty>
            {shown.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => handlePick(option)}
                className={cn('gap-2', mono && 'font-mono text-[12.5px]')}
              >
                <span className="min-w-0 flex-1 truncate" title={option.label}>
                  {option.label}
                </span>
                {option.value === value && <Check className="size-4 shrink-0" aria-hidden="true" />}
              </CommandItem>
            ))}
          </CommandList>
          {matches.length > shown.length && (
            <p className="text-muted-foreground border-t px-3 py-2 font-mono text-[11.5px]">
              {t('{shown} de {total} · escribe para buscar', { shown: shown.length, total: matches.length })}
            </p>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * «Mostrar más» al final de una lista larga (cientos de ramas o pull requests): se dibujan de a poco.
 * @param {{ shown: number, total: number, onMore: () => void }} props
 */
export function ShowMore({ shown, total, onMore }) {
  if (shown >= total) return null
  return (
    <div className="flex items-center justify-center gap-3 border-t px-4 py-2.5">
      <span className="text-muted-foreground font-mono text-[11.5px]">
        {t('{shown} de {total}', { shown, total })}
      </span>
      <button
        type="button"
        onClick={onMore}
        className="hover:bg-muted focus-visible:ring-ring rounded-full border px-3 py-1 text-[12.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {t('Mostrar más')}
      </button>
    </div>
  )
}

/** El enlace a una tarea: su código y, si se pasa, en qué estado está. */
export function TaskLink({ slug, projectId, issueId, code, state }) {
  return (
    <Link
      to={`/${slug}/projects/${projectId}/issues/${issueId}`}
      className="hover:border-dash hover:bg-muted focus-visible:ring-ring inline-flex max-w-full min-w-0 shrink-0 items-center gap-1.75 rounded-lg border px-2 py-1 text-[12.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="shrink-0 font-mono text-xs font-semibold">{code}</span>
      {state && <span className="text-muted-foreground truncate">{stateName(state)}</span>}
    </Link>
  )
}
