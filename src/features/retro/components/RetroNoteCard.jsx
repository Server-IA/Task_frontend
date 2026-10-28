import { useRef, useState } from 'react'
import { Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Spinner } from '@/components/common/Loaders'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useLocalEscape } from '@/hooks/useLocalEscape'
import { formatDateTime } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { IS_MAC } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useConvertRetroNote, useDeleteRetroNote, useUpdateRetroNote, useVoteRetroNote } from '../hooks'
import { MAX_VOTES, NOTE_MAX_LENGTH, voteState } from '../retroNotes'

/** Atajo para guardar una nota, como se muestra en la interfaz. */
export const SAVE_HINT = IS_MAC ? '⌘ ↵' : 'ctrl ↵'

/**
 * Una nota de la retro: texto, autor, votos y, en las acciones, su tarea (o «Convertir en tarea» para el PM).
 * @param {{ note: import('@/api/types').RetroNote, retro: import('@/api/types').RetroResponse, ctx: RetroContext }} props
 */
export function RetroNoteCard({ note, retro, ctx }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const update = useUpdateRetroNote(ctx.slug, ctx.projectId, ctx.cycleId)
  const remove = useDeleteRetroNote(ctx.slug, ctx.projectId, ctx.cycleId)
  const convert = useConvertRetroNote(ctx.slug, ctx.projectId, ctx.cycleId)
  const isAction = note.column === 'ACTION'
  const editable = ctx.canEdit(note)
  const mine = note.author?.id === ctx.userId

  const convertNote = () =>
    convert.mutate(note, {
      onSuccess: (issue) =>
        toast.success(`Se creó ${issue.code}`, {
          description: issue.title,
          action: { label: 'Abrir', onClick: () => ctx.openIssue(issue.id) },
        }),
      onError: (error) => notifyError(error, 'No se pudo crear la tarea'),
    })

  return (
    <article className="tf-pop group/note flex flex-col gap-2.5 rounded-xl border bg-card p-3 shadow-card">
      {editing ? (
        <NoteEditor
          initialText={note.text}
          label="Editar nota"
          submitLabel="Guardar"
          pending={update.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={(text) =>
            update.mutate(
              { noteId: note.id, text },
              { onSuccess: () => setEditing(false), onError: (error) => notifyError(error) },
            )
          }
        />
      ) : (
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{note.text}</p>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
        <UserAvatar user={note.author} size="xs" />
        <span className="min-w-0 truncate text-muted-foreground" title={formatDateTime(note.createdAt)}>
          {mine ? 'Tú' : note.author?.fullName}
        </span>
        {isAction && note.issue && (
          <button
            type="button"
            onClick={() => ctx.openIssue(note.issue.id)}
            title={`${note.issue.code} · ${note.issue.state?.name ?? ''} · abrir`}
            className="inline-flex items-center gap-1 rounded-md bg-ok-soft px-2 py-0.5 font-semibold text-ok transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            <span className="font-mono text-[11px]">{note.issue.code}</span> creada
          </button>
        )}
        {isAction && !note.issue && ctx.manager && (
          <Button variant="outline" size="xs" className="rounded-md" onClick={convertNote} disabled={convert.isPending}>
            {convert.isPending && <Spinner className="size-3" />}
            Convertir en tarea
          </Button>
        )}
        <span className="ml-auto flex items-center gap-1">
          {editable && !editing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground sm:opacity-0 sm:group-hover/note:opacity-100 sm:group-focus-within/note:opacity-100 sm:data-[state=open]:opacity-100"
                  aria-label="Acciones de la nota"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <Pencil />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <VoteButton note={note} retro={retro} ctx={ctx} />
        </span>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar la nota?"
        description={note.votes > 0 ? 'Se pierden también sus votos.' : undefined}
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(note, {
            onSuccess: () => {
              setConfirmDelete(false)
              toast.success('Nota eliminada')
            },
            onError: (error) => notifyError(error),
          })
        }
      />
    </article>
  )
}

/** Triángulo de voto (el mismo del indicador de votos restantes). */
export function VoteMark({ className }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={cn('size-2.5 shrink-0', className)}>
      <path d="M8 3 L14 12 H2 Z" />
    </svg>
  )
}

/** Votar / quitar el voto. Los votos propios van con el acento; terminada la retro, solo muestra el número. */
function VoteButton({ note, retro, ctx }) {
  const vote = useVoteRetroNote(ctx.slug, ctx.projectId, ctx.cycleId)
  const state = voteState(note, retro)
  const votes = note.votes ?? 0
  const label = `${votes} ${votes === 1 ? 'voto' : 'votos'}`

  if (state.reason === 'closed') {
    return (
      <span
        className="inline-flex h-7 items-center gap-1.5 px-1.5 font-mono text-xs font-semibold text-muted-foreground"
        title={label}
        aria-label={label}
      >
        <VoteMark />
        {votes}
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={Boolean(note.votedByMe)}
      aria-label={`${note.votedByMe ? 'Quitar tu voto' : 'Votar'} · ${label}`}
      title={state.reason === 'noVotes' ? `Ya usaste tus ${MAX_VOTES} votos` : note.votedByMe ? 'Quitar tu voto' : 'Votar'}
      disabled={!state.enabled || vote.isPending}
      onClick={() =>
        vote.mutate({ note, vote: !note.votedByMe }, { onError: (error) => notifyError(error, 'No se pudo votar') })
      }
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 font-mono text-xs font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
        note.votedByMe ? 'border-accent-text bg-accent-soft text-accent-text' : 'bg-card hover:bg-accent',
      )}
    >
      <VoteMark />
      {votes}
    </button>
  )
}

/**
 * Campo para escribir o editar una nota: ctrl/⌘ + Enter guarda y Escape cancela.
 * `keepOpen`: al agregar, el campo se vacía y sigue abierto para escribir la siguiente.
 */
export function NoteEditor({ initialText = '', label, placeholder, submitLabel, pending, onSubmit, onCancel, keepOpen = false }) {
  const [text, setText] = useState(initialText)
  const wrapperRef = useRef(null)
  useLocalEscape(wrapperRef, onCancel)
  const value = text.trim()

  const submit = () => {
    if (!value || pending) return
    if (value === initialText.trim() && !keepOpen) return onCancel()
    onSubmit(value, () => setText(''))
  }

  return (
    <div ref={wrapperRef} className="flex flex-col gap-2">
      <textarea
        aria-label={label}
        placeholder={placeholder}
        value={text}
        maxLength={NOTE_MAX_LENGTH}
        rows={2}
        autoFocus
        onChange={(event) => setText(event.target.value)}
        onFocus={(event) => event.currentTarget.setSelectionRange(event.currentTarget.value.length, event.currentTarget.value.length)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            submit()
          }
        }}
        className="field-sizing-content block max-h-60 min-h-12 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-2">
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground" title="Escape cancela">
          {SAVE_HINT} {submitLabel.toLowerCase()}
        </span>
        {text.length > NOTE_MAX_LENGTH - 50 && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {text.length}/{NOTE_MAX_LENGTH}
          </span>
        )}
        <Button size="xs" variant="ghost" className="ml-auto rounded-md" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="xs" className="rounded-md px-2.5" onClick={submit} disabled={!value || pending}>
          {pending && <Spinner className="size-3" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}

/**
 * @typedef {{ slug: string, projectId: string, cycleId: string, userId?: string, manager: boolean,
 *             canEdit: (note: import('@/api/types').RetroNote) => boolean, openIssue: (issueId: string) => void }} RetroContext
 */
