import { useId } from 'react'
import { ArrowRight, Check, TriangleAlert } from 'lucide-react'
import { LockNote } from '@/components/common/LockNote'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useCreateRetroNote } from '../hooks'
import { buildNewNote, takesOwner } from '../retroNotes'
import { NoteEditor, RetroNoteCard } from './RetroNoteCard'

/** Ícono y colores del encabezado de cada columna. */
const COLUMN_STYLE = {
  WENT_WELL: { icon: Check, className: 'bg-ok-soft text-ok' },
  IMPROVE: { icon: TriangleAlert, className: 'bg-soon-soft text-soon' },
  ACTION: { icon: ArrowRight, className: 'bg-accent-soft text-accent-text' },
}

/**
 * Columna de la retro con sus notas (por votos) y, en curso, «+ nota» para escribir una más.
 * @param {{ column: { key: import('@/api/types').RetroColumn, name: string, placeholder: string },
 *           notes: import('@/api/types').RetroNote[], retro: import('@/api/types').RetroResponse,
 *           open: boolean, composing: boolean, onCompose: (composing: boolean) => void,
 *           ctx: import('./RetroNoteCard').RetroContext }} props
 */
export function RetroColumn({ column, notes, retro, open, composing, onCompose, ctx }) {
  const headingId = useId()
  const create = useCreateRetroNote(ctx.slug, ctx.projectId, ctx.cycleId)
  const style = COLUMN_STYLE[column.key]
  const Icon = style.icon
  const pendingActions = column.key === 'ACTION' && notes.some((note) => !note.issue)

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2 rounded-[18px] bg-column p-2.5">
      <header className="flex items-center gap-2 px-1 pt-1 pb-0.5">
        <span aria-hidden="true" className={cn('flex size-5.5 items-center justify-center rounded-[7px]', style.className)}>
          <Icon className="size-3.5" strokeWidth={2.4} />
        </span>
        <h2 id={headingId} className="text-sm font-semibold">
          {column.name}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{notes.length}</span>
        {notes.length > 1 && <span className="ml-auto text-[11px] text-muted-foreground">orden: votos</span>}
      </header>

      {notes.map((note) => (
        <RetroNoteCard key={note.id} note={note} retro={retro} ctx={ctx} />
      ))}

      {notes.length === 0 && !composing && (
        <p className="px-1 py-2 text-[13px] text-muted-foreground">{open ? 'Todavía no hay notas.' : 'Sin notas.'}</p>
      )}

      {open && composing && (
        <div className="tf-pop rounded-xl border border-ring bg-card p-2.5 shadow-[0_0_0_3px_var(--accent-soft)]">
          <NoteEditor
            label={`Nueva nota en ${column.name}`}
            placeholder={column.placeholder}
            submitLabel="Agregar"
            keepOpen
            withOwner={takesOwner(column.key)}
            members={ctx.members}
            pending={create.isPending}
            onCancel={() => onCompose(false)}
            onSubmit={({ text, ownerId }, reset) =>
              create.mutate(buildNewNote(column.key, text, ownerId), {
                onSuccess: reset,
                onError: (error) => notifyError(error),
              })
            }
          />
        </div>
      )}
      {open && !composing && (
        <button
          type="button"
          onClick={() => onCompose(true)}
          className="rounded-xl border border-dashed border-dash p-2 text-[13px] text-muted-foreground transition-colors duration-150 hover:border-foreground/30 hover:bg-card/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          + nota
        </button>
      )}
      {pendingActions && !ctx.manager && (
        <LockNote className="px-1 pt-0.5">Solo el project manager crea tareas desde las acciones.</LockNote>
      )}
    </section>
  )
}
