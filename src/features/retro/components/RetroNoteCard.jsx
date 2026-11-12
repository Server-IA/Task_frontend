import { useEffect, useRef, useState } from 'react'
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
import { stateName, t, tn, tx } from '@/i18n'
import { formatDateTime } from '@/lib/dates'
import { useFocusAfterRemoval } from '@/lib/focusReturn'
import { notifyError } from '@/lib/notify'
import { warnUnsavedText } from '@/lib/unsavedText'
import { IS_MAC } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useConvertRetroNote, useDeleteRetroNote, useUpdateRetroNote, useVoteRetroNote } from '../hooks'
import { buildNoteUpdate, MAX_VOTES, NOTE_MAX_LENGTH, shortName, voteState } from '../retroNotes'
import { OwnerButton, OwnerPicker } from './OwnerPicker'

/** Aviso cuando la retro termina con una nota a medio escribir. */
export const RETRO_CLOSED_TITLE = t('La retrospectiva terminó; tu nota no se guardó')

/** Atajo para guardar una nota, como se muestra en la interfaz. */
export const SAVE_HINT = IS_MAC ? '⌘ ↵' : 'ctrl ↵'

/**
 * Una nota de la retro: texto, autor (o responsable, en las acciones), votos y, en las acciones, su tarea
 * (o «Crear tarea» para el PM, que queda asignada al responsable).
 * `focusAfterDelete`: a dónde va el foco al eliminarla (su menú desaparece con ella).
 * @param {{ note: import('@/api/types').RetroNote, retro: import('@/api/types').RetroResponse, ctx: RetroContext,
 *           focusAfterDelete?: React.RefObject<HTMLElement>[] }} props
 */
export function RetroNoteCard({ note, retro, ctx, focusAfterDelete = [] }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const update = useUpdateRetroNote(ctx.slug, ctx.projectId, ctx.cycleId)
  const remove = useDeleteRetroNote(ctx.slug, ctx.projectId, ctx.cycleId)
  const convert = useConvertRetroNote(ctx.slug, ctx.projectId, ctx.cycleId)
  const removal = useFocusAfterRemoval(...focusAfterDelete)
  const isAction = note.column === 'ACTION'
  const editable = ctx.canEdit(note)

  /** Guarda solo lo que cambió (texto, responsable o ambos). */
  const save = (changes, options) => {
    const patch = buildNoteUpdate(note, changes)
    if (!patch) return options?.onSuccess?.()
    update.mutate({ noteId: note.id, ...patch }, { onError: (error) => notifyError(error), ...options })
  }

  const convertNote = () =>
    convert.mutate(note, {
      onSuccess: (issue) => {
        const assignee = issue.assignees?.[0]
        toast.success(t('Se creó {code}', { code: issue.code }), {
          description: assignee ? t('{title} · asignada a {name}', { title: issue.title, name: assignee.fullName }) : issue.title,
          action: { label: t('Abrir'), onClick: () => ctx.openIssue(issue.id) },
        })
      },
      onError: (error) => notifyError(error, t('No se pudo crear la tarea')),
    })

  return (
    <article className="tf-pop group/note flex flex-col gap-2.5 rounded-xl border bg-card p-3 shadow-card">
      {editing ? (
        <NoteEditor
          initialText={note.text}
          initialOwner={note.owner ?? null}
          withOwner={isAction}
          members={ctx.members}
          label={t('Editar nota')}
          submitLabel={t('Guardar')}
          closed={ctx.open === false}
          pending={update.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={(changes) => save(changes, { onSuccess: () => setEditing(false) })}
        />
      ) : (
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{note.text}</p>
      )}
      {/* Quién y la tarea a la izquierda (bajan de línea dentro de su grupo si no caben); el voto siempre arriba a la derecha */}
      <div className="flex min-w-0 items-start gap-2 text-xs">
        <div className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
          {isAction && note.owner ? (
            <NoteOwner note={note} ctx={ctx} editable={editable && !editing} pending={update.isPending} onChange={save} />
          ) : (
            <NoteAuthor note={note} ctx={ctx} />
          )}
          {isAction && !note.owner && editable && !editing && (
            <OwnerPicker members={ctx.members} value={null} onChange={(ownerId) => save({ ownerId })} disabled={update.isPending}>
              <OwnerButton owner={null} className="h-6" />
            </OwnerPicker>
          )}
          {isAction && note.issue && (
            <button
              type="button"
              onClick={() => ctx.openIssue(note.issue.id)}
              title={t('{code} · {state} · abrir', { code: note.issue.code, state: stateName(note.issue.state) })}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ok-soft px-2 py-0.5 font-semibold text-ok transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              {tx('{code} creada', { code: <span className="font-mono text-[11px]">{note.issue.code}</span> })}
            </button>
          )}
          {isAction && !note.issue && ctx.manager && ctx.canCreateIssues !== false && (
            <Button
              variant="outline"
              size="xs"
              className="shrink-0 rounded-md"
              onClick={convertNote}
              disabled={convert.isPending}
              title={note.owner ? t('Crea la tarea asignada a {name}', { name: note.owner.fullName }) : t('Crea la tarea sin asignar')}
            >
              {convert.isPending && <Spinner className="size-3" />}
              {t('Crear tarea')}
            </Button>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1">
          {editable && !editing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground sm:opacity-0 sm:group-hover/note:opacity-100 sm:group-focus-within/note:opacity-100 sm:data-[state=open]:opacity-100"
                  aria-label={t('Acciones de la nota')}
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <Pencil />
                  {t('Editar')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 />
                  {t('Eliminar')}
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
        title={t('¿Eliminar la nota?')}
        description={note.votes > 0 ? t('Se pierden también sus votos.') : undefined}
        confirmLabel={t('Eliminar')}
        loading={remove.isPending}
        returnFocusRef={focusAfterDelete}
        focusAfterConfirmRef={removal.ref}
        onConfirm={() => {
          removal.start()
          remove.mutate(note, {
            onSuccess: () => {
              removal.done()
              setConfirmDelete(false)
              toast.success(t('Nota eliminada'))
            },
            onError: (error) => notifyError(error),
          })
        }}
      />
    </article>
  )
}

/** Avatar y nombre de quien escribió la nota («Tú» si es tuya). */
function NoteAuthor({ note, ctx }) {
  const mine = note.author?.id === ctx.userId
  return (
    <span className="flex min-w-0 items-center gap-2">
      <UserAvatar user={note.author} size="xs" />
      <span className="min-w-0 truncate text-muted-foreground" title={formatDateTime(note.createdAt)}>
        {mine ? t('Tú') : note.author?.fullName}
      </span>
    </span>
  )
}

/**
 * «responsable: Luis Muñoz» con su avatar (quién la escribió va en el globo). Quien puede editar la nota lo
 * cambia o lo quita desde aquí mismo.
 */
function NoteOwner({ note, ctx, editable, pending, onChange }) {
  const owner = note.owner
  const date = formatDateTime(note.createdAt)
  const title =
    note.author?.id === ctx.userId
      ? t('Responsable: {owner} · escrita por ti · {date}', { owner: owner.fullName, date })
      : t('Responsable: {owner} · escrita por {author} · {date}', { owner: owner.fullName, author: note.author?.fullName, date })
  const content = (
    <>
      <UserAvatar user={owner} size="xs" />
      <span className="min-w-0 truncate text-muted-foreground">
        {owner.id === ctx.userId ? t('responsable: tú') : t('responsable: {name}', { name: shortName(owner) })}
      </span>
    </>
  )

  if (!editable) {
    return (
      <span className="flex min-w-0 items-center gap-2" title={title}>
        {content}
      </span>
    )
  }
  return (
    <OwnerPicker members={ctx.members} value={owner.id} onChange={(ownerId) => onChange({ ownerId })} disabled={pending}>
      <button
        type="button"
        title={t('{title}. Cambiar responsable', { title })}
        aria-label={t('Responsable: {name}. Cambiar', { name: owner.fullName })}
        className="-mx-1 flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {content}
      </button>
    </OwnerPicker>
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
  const label = tn(votes, '{count} voto', '{count} votos')

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
      aria-label={note.votedByMe ? t('Quitar tu voto · {votes}', { votes: label }) : t('Votar · {votes}', { votes: label })}
      title={
        ctx.canParticipate === false
          ? t('Tu rol no permite votar')
          : state.reason === 'noVotes'
            ? t('Ya usaste tus {max} votos', { max: MAX_VOTES })
            : note.votedByMe
              ? t('Quitar tu voto')
              : t('Votar')
      }
      disabled={!state.enabled || ctx.canParticipate === false || vote.isPending}
      onClick={() =>
        vote.mutate({ note, vote: !note.votedByMe }, { onError: (error) => notifyError(error, t('No se pudo votar')) })
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
 * Campo para escribir o editar una nota: ctrl/⌘ + Enter guarda y Escape cancela. En las acciones
 * (`withOwner`) se elige también el responsable entre los miembros del proyecto.
 * `keepOpen`: al agregar, el campo se vacía y sigue abierto para escribir la siguiente.
 * `onSubmit({ text, ownerId }, reset)`: `ownerId` solo viene con `withOwner` (null = sin responsable).
 * `closed`: la retro terminó mientras se escribía (la terminó el PM). El campo se cierra y, si había texto sin
 * guardar, un aviso persistente lo ofrece con «Copiar mi texto» para no perderlo.
 */
export function NoteEditor({
  initialText = '',
  initialOwner = null,
  withOwner = false,
  members = [],
  label,
  placeholder,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
  keepOpen = false,
  closed = false,
}) {
  const [text, setText] = useState(initialText)
  const draftRef = useRef({ text, initialText, onCancel })
  useEffect(() => {
    draftRef.current = { text, initialText, onCancel }
  })
  useEffect(() => {
    if (!closed) return
    const draft = draftRef.current
    const unsaved = draft.text.trim()
    if (unsaved && unsaved !== draft.initialText.trim()) {
      warnUnsavedText(RETRO_CLOSED_TITLE, t('Copia tu texto para no perderlo.'), unsaved)
    }
    draft.onCancel()
  }, [closed])
  const [ownerId, setOwnerId] = useState(initialOwner?.id ?? null)
  const wrapperRef = useRef(null)
  useLocalEscape(wrapperRef, onCancel)
  const value = text.trim()
  // Quien ya no es miembro sigue apareciendo mientras sea el responsable guardado
  const owner = members.find((user) => user.id === ownerId) ?? (ownerId && ownerId === initialOwner?.id ? initialOwner : null)

  const submit = () => {
    if (!value || pending) return
    const unchanged = value === initialText.trim() && ownerId === (initialOwner?.id ?? null)
    if (unchanged && !keepOpen) return onCancel()
    onSubmit({ text: value, ...(withOwner && { ownerId }) }, () => {
      setText('')
      setOwnerId(null)
    })
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
      {withOwner && (
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono text-[11px]">{t('responsable')}</span>
          <OwnerPicker members={members} value={ownerId} onChange={setOwnerId}>
            <OwnerButton owner={owner} />
          </OwnerPicker>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground" title={t('Escape cancela')}>
          {SAVE_HINT} {submitLabel.toLowerCase()}
        </span>
        {text.length > NOTE_MAX_LENGTH - 50 && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {text.length}/{NOTE_MAX_LENGTH}
          </span>
        )}
        <Button size="xs" variant="ghost" className="ml-auto rounded-md" onClick={onCancel}>
          {t('Cancelar')}
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
 *             open: boolean, members: import('@/api/types').UserSummary[],
 *             canEdit: (note: import('@/api/types').RetroNote) => boolean, openIssue: (issueId: string) => void }} RetroContext
 */
