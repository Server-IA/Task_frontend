import { CircleCheck, CornerLeftUp, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { bugsAfterCloseLabel, openBugsLabel, storyProgress, TYPE_LABELS, typeOf } from '../issueTypes'

/**
 * Piezas visuales de los tipos de tarea: el icono de cada tipo (cuadro redondeado de su color con su glifo), la
 * pastilla de tipo, el chip de la historia padre («↰ WEB-15»), la barra «3 de 5 tareas» y las insignias de una
 * historia («sin partir», «lista para revisar», «1 bug abierto», «1 bug después de cerrar»).
 */

/** Glifo y colores de cada tipo (los colores son tokens de globals.css: --ty-story, --ty-task, --ty-bug). */
const GLYPHS = {
  STORY: { d: 'M5 3.5h6v9l-3-2.2-3 2.2z', fill: true },
  TASK: { d: 'M4.6 8.3l2.2 2.2L11.4 5.9', fill: false },
  BUG: { d: 'M8 5.1a2.9 2.9 0 1 1 0 5.8a2.9 2.9 0 1 1 0-5.8z', fill: true },
}
const RECT = { STORY: 'fill-ty-story', TASK: 'fill-ty-task', BUG: 'fill-ty-bug' }
const TYPE_SOFT = {
  STORY: 'bg-ty-story-soft text-ty-story-text',
  TASK: 'bg-ty-task-soft text-ty-task-text',
  BUG: 'bg-ty-bug-soft text-ty-bug-text',
}

/**
 * Icono del tipo (16px; `size` para las filas densas).
 * @param {{ type?: 'STORY' | 'TASK' | 'BUG', size?: number, className?: string, title?: string }} props
 */
export function TypeIcon({ type = 'TASK', size = 16, className, title }) {
  const glyph = GLYPHS[type] ?? GLYPHS.TASK
  const label = title ?? TYPE_LABELS[type]
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={label} className={cn('shrink-0', className)}>
      <title>{label}</title>
      <rect width="16" height="16" rx="4" className={RECT[type] ?? RECT.TASK} />
      <path
        d={glyph.d}
        className={glyph.fill ? 'fill-ty-glyph' : 'fill-none stroke-ty-glyph'}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Icono del tipo de una tarea. */
export const IssueTypeIcon = ({ issue, ...props }) => <TypeIcon type={typeOf(issue)} {...props} />

/** Pastilla «▣ Historia» con el color suave del tipo (sin menú). */
export function TypePill({ type = 'TASK', className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-[7px] py-0.5 pr-2 pl-1 text-xs font-semibold', TYPE_SOFT[type], className)}>
      <TypeIcon type={type} size={14} />
      {TYPE_LABELS[type]}
      {children}
    </span>
  )
}

/**
 * «↰ WEB-15»: la historia de una tarea o un bug (en el color de las historias). Sin `onOpen` es solo informativo.
 * @param {{ parent: { id: string, code: string, title?: string, type?: string } | null | undefined, onOpen?: Function,
 *           label?: string, className?: string }} props
 */
export function ParentStoryChip({ parent, onOpen, label, className }) {
  if (!parent) return null
  const story = parent.type === 'STORY'
  const content = (
    <>
      {label ? <span className="font-sans font-medium">{label}</span> : <CornerLeftUp className="size-3" strokeWidth={2.5} aria-hidden="true" />}
      {parent.code}
    </>
  )
  const classes = cn(
    'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold whitespace-nowrap',
    story ? 'bg-ty-story-soft text-ty-story-text' : 'bg-muted text-muted-foreground',
    className,
  )
  const title = `${story ? 'Historia' : 'Subtarea de'} ${parent.code}${parent.title ? ` · ${parent.title}` : ''}`
  if (!onOpen) {
    return (
      <span className={classes} title={title}>
        {content}
      </span>
    )
  }
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onOpen(parent.id)
      }}
      className={cn(classes, 'outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring')}
    >
      {content}
    </button>
  )
}

/**
 * «3 de 5 tareas» y la barra (completadas en verde, en curso en naranja). `compact`: sin el texto.
 * @param {{ story: import('@/api/types').IssueResponse, className?: string, barClassName?: string, compact?: boolean }} props
 */
export function StoryProgress({ story, className, barClassName, compact = false }) {
  const progress = storyProgress(story)
  return (
    <span className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {!compact && <span className="font-mono text-xs text-muted-foreground tabular-nums">{progress.label}</span>}
      <span
        className={cn('flex h-1 w-full overflow-hidden rounded-full bg-column', barClassName)}
        role="progressbar"
        aria-label={`Progreso: ${progress.label}`}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
      >
        <span className="h-full bg-ok-dot transition-[width] duration-300" style={{ width: `${progress.donePct}%` }} />
        <span className="h-full bg-started transition-[width] duration-300" style={{ width: `${progress.startedPct}%` }} />
      </span>
    </span>
  )
}

const BADGE = 'inline-flex shrink-0 items-center gap-1.5 rounded-[7px] px-2 py-0.5 text-xs font-semibold whitespace-nowrap'

/** «⚠ sin partir»: una historia abierta sin tareas. */
export function UnsplitBadge({ className }) {
  return (
    <span className={cn(BADGE, 'bg-soon-soft text-soon', className)}>
      <TriangleAlert className="size-3" strokeWidth={2.5} aria-hidden="true" />
      sin partir
    </span>
  )
}

/**
 * «✓ lista para revisar»: todas sus tareas terminadas y ningún bug ligado abierto. Con `wrap` se achica y parte en dos
 * líneas (en la columna angosta de propiedades se salía del panel).
 */
export function ReadyBadge({ className, wrap = false }) {
  return (
    <span
      className={cn(BADGE, 'bg-ok-soft text-ok', wrap && 'min-w-0 shrink whitespace-normal', className)}
      title="Todas sus tareas terminadas y ningún bug ligado abierto"
    >
      <CircleCheck className="size-3" strokeWidth={2.5} aria-hidden="true" />
      lista para revisar
    </span>
  )
}

/** «▣ 1 bug abierto» o «▣ 1 bug después de cerrar». */
export function BugCountBadge({ count, afterClose = false, className, title }) {
  if (!count) return null
  return (
    <span
      className={cn(BADGE, 'bg-ty-bug-soft pl-1 text-ty-bug-text', className)}
      title={title ?? (afterClose ? 'Bugs reportados después de cerrar la historia; no la reabren' : 'Bugs ligados abiertos: frenan «lista para revisar»')}
    >
      <TypeIcon type="BUG" size={14} />
      {afterClose ? bugsAfterCloseLabel(count) : openBugsLabel(count)}
    </span>
  )
}
