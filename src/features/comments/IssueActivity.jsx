import { useCallback, useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { Segmented } from '@/components/common/Segmented'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useActivity } from '@/features/issues/hooks'
import { LazyRichEditor, preloadRichEditor } from '@/features/editor/components/LazyRichEditor'
import { MarkdownView } from '@/features/editor/components/MarkdownView'
import { useMentionPeople } from '@/features/mentions/hooks'
import { joinNames, mentionedIds } from '@/features/mentions/mentions'
import { useWorkspace } from '@/features/workspaces/hooks'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { canDeleteComment } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { activityActorName, describeActivity } from './describeActivity'
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from './hooks'

/**
 * Comentarios e historial de la tarea en una sola línea de tiempo, con filtro.
 * Las entradas COMMENT del historial no se repiten: el comentario ya aparece como tarjeta.
 * Los comentarios se escriben con el mismo editor que la descripción, en versión liviana (sin barra: «/» y la barra
 * sobre el texto seleccionado), con menciones («@» abre la lista de personas del proyecto) y ctrl ↵ para enviar.
 * Se guardan en Markdown; los comentarios de antes (texto plano con menciones) se leen igual.
 */
export function IssueActivity({ slug, projectId, issueId, issueCode, projectIdentifier, focusCommentId, onOpenIssue }) {
  const [filter, setFilter] = useState('all')
  const comments = useComments(slug, projectId, issueId)
  const activity = useActivity(slug, projectId, issueId)
  const people = useMentionPeople(slug, projectId)

  const timeline = useMemo(() => {
    const commentItems = (comments.data ?? []).map((comment) => ({ type: 'comment', at: comment.createdAt, comment }))
    const activityItems = (activity.data ?? [])
      .filter((entry) => entry.field !== 'COMMENT')
      .map((entry) => ({ type: 'activity', at: entry.createdAt, entry }))
    const items =
      filter === 'comments' ? commentItems : filter === 'history' ? activityItems : [...commentItems, ...activityItems]
    return items.sort((a, b) => a.at.localeCompare(b.at))
  }, [comments.data, activity.data, filter])

  const isLoading = comments.isLoading || activity.isLoading

  // Abierta desde un aviso de la Bandeja: la vista baja hasta ese comentario
  useEffect(() => {
    if (!focusCommentId || isLoading) return
    document.getElementById(commentAnchor(focusCommentId))?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [focusCommentId, isLoading])

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Actividad</h2>
        <Segmented label="Filtrar actividad" size="sm" className="p-0.5" value={filter} onChange={setFilter} options={FILTERS} />
      </div>

      {isLoading ? (
        <CenteredSpinner className="p-4" />
      ) : (
        <ol className="flex flex-col gap-2.5">
          {timeline.map((item) =>
            item.type === 'comment' ? (
              <li key={`c-${item.comment.id}`} id={commentAnchor(item.comment.id)} className="scroll-mt-4">
                <CommentCard
                  slug={slug}
                  projectId={projectId}
                  issueId={issueId}
                  comment={item.comment}
                  people={people}
                  projectIdentifier={projectIdentifier}
                  onOpenIssue={onOpenIssue}
                />
              </li>
            ) : (
              <li key={`a-${item.entry.id}`}>
                <ActivityLine entry={item.entry} />
              </li>
            ),
          )}
          {timeline.length === 0 && (
            <li className="text-sm text-muted-foreground">
              {filter === 'comments' ? 'Todavía no hay comentarios.' : 'Sin actividad.'}
            </li>
          )}
        </ol>
      )}

      <CommentComposer
        slug={slug}
        projectId={projectId}
        issueId={issueId}
        issueCode={issueCode}
        projectIdentifier={projectIdentifier}
        people={people}
      />
    </section>
  )
}

/** Id del elemento de un comentario (para llevar la vista hasta él). */
const commentAnchor = (commentId) => `comentario-${commentId}`

const FILTERS = [
  { value: 'all', label: 'Todo' },
  { value: 'comments', label: 'Comentarios' },
  { value: 'history', label: 'Historial' },
]

function ActivityLine({ entry }) {
  return (
    <div className="flex items-start gap-2 pl-1.5 text-xs text-muted-foreground">
      {entry.field === 'STORY_AUTO_STATE' ? (
        <span aria-hidden="true" className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[8px] font-bold text-primary-foreground">
          TF
        </span>
      ) : (
        <UserAvatar user={entry.actor} size="xs" className="mt-px" />
      )}
      <p className="min-w-0 flex-1">
        <span className="font-semibold text-foreground">{activityActorName(entry)}</span>{' '}
        {describeActivity(entry)}
        <span className="font-mono" title={formatDateTime(entry.createdAt)}>
          {' '}
          · {formatRelative(entry.createdAt)}
        </span>
      </p>
    </div>
  )
}

function CommentCard({ slug, projectId, issueId, comment, people, projectIdentifier, onOpenIssue }) {
  // Del workspace de la tarea (no de la URL): la actividad también se ve desde la Bandeja
  const { data: workspace } = useWorkspace(slug)
  const currentUserId = useSessionStore((state) => state.user?.id)
  const update = useUpdateComment(slug, projectId, issueId)
  const remove = useDeleteComment(slug, projectId, issueId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isAuthor = comment.author?.id === currentUserId
  const canDelete = canDeleteComment(workspace?.myRole, comment, currentUserId)
  const edited = comment.updatedAt !== comment.createdAt
  // Un comentario de otra persona que me menciona se resalta
  const mentionsMe = !isAuthor && Boolean(currentUserId) && mentionedIds(comment.body).includes(currentUserId)

  const save = () => {
    const body = draft.trim()
    if (!body || body === comment.body) {
      setEditing(false)
      return
    }
    update.mutate(
      { commentId: comment.id, body },
      { onSuccess: () => setEditing(false), onError: (error) => notifyError(error) },
    )
  }

  return (
    <div className="flex gap-2.5">
      <UserAvatar user={comment.author} size="md" />
      <div
        className={cn(
          'min-w-0 flex-1 rounded-xl border bg-card',
          mentionsMe && 'border-accent-text shadow-[0_0_0_3px_var(--accent-soft)]',
        )}
      >
        <div className={cn('flex items-center gap-2 rounded-t-[11px] border-b px-3 py-1.5 text-xs', mentionsMe && 'bg-accent-soft')}>
          <span className="shrink-0 font-semibold">{comment.author?.fullName}</span>
          {/* En un panel angosto la fecha se corta (completa en el título) y «te mencionó» no se parte */}
          <span className="min-w-0 truncate font-mono text-muted-foreground" title={formatDateTime(comment.createdAt)}>
            · {formatRelative(comment.createdAt)}
            {edited && ' · editado'}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {mentionsMe && <span className="font-semibold whitespace-nowrap text-accent-text">te mencionó</span>}
            {(isAuthor || canDelete) && !editing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6" aria-label="Acciones del comentario">
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAuthor && (
                    <DropdownMenuItem
                      onSelect={() => {
                        setDraft(comment.body)
                        setEditing(true)
                      }}
                    >
                      <Pencil />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                      <Trash2 />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </span>
        </div>
        {editing ? (
          <div className="space-y-2 p-2">
            <div className="rounded-lg border bg-background focus-within:border-ring focus-within:shadow-[0_0_0_3px_var(--accent-soft)] dark:bg-input/30">
              <LazyRichEditor
                value={draft}
                onChange={setDraft}
                size="sm"
                ariaLabel="Editar comentario"
                placeholder=""
                people={people}
                slug={slug}
                projectIdentifier={projectIdentifier}
                autoFocus
                onSubmit={save}
                onEscape={() => setEditing(false)}
                contentClassName="min-h-16 px-3 py-2"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="mr-auto font-mono text-[11px] text-muted-foreground">@ mencionar · ctrl ↵ guardar · esc cancelar</span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={save} disabled={update.isPending}>
                {update.isPending && <Spinner />}
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <MarkdownView
            markdown={comment.body}
            size="sm"
            slug={slug}
            projectId={projectId}
            onOpenIssue={onOpenIssue}
            className="px-3 py-2.5"
          />
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar el comentario?"
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(comment.id, {
            onSuccess: () => {
              setConfirmDelete(false)
              toast.success('Comentario eliminado')
            },
            onError: (error) => notifyError(error),
          })
        }
      />
    </div>
  )
}

function CommentComposer({ slug, projectId, issueId, issueCode, projectIdentifier, people }) {
  const user = useSessionStore((state) => state.user)
  const create = useCreateComment(slug, projectId, issueId)
  const [body, setBody] = useState('')
  // El editor se monta al enfocar la caja (hasta entonces es solo un recuadro: abrir una tarea sigue siendo liviano)
  const [active, setActive] = useState(false)

  // Quiénes recibirán el aviso de la mención (quien escribe no se avisa a sí mismo)
  const mentioned = mentionedIds(body)
  const notified = people.filter((person) => person.id !== user?.id && mentioned.includes(person.id))

  const blurComposer = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }, [])

  const submit = () => {
    const text = body.trim()
    if (!text || create.isPending) return
    create.mutate(text, { onSuccess: () => setBody(''), onError: (error) => notifyError(error) })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2.5">
        <UserAvatar user={user} size="md" />
        <div className="min-w-0 flex-1 rounded-xl border bg-card transition-shadow duration-150 focus-within:border-ring focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
          {active ? (
            <LazyRichEditor
              value={body}
              onChange={setBody}
              size="sm"
              ariaLabel="Escribe un comentario"
              placeholder="Escribe un comentario…"
              people={people}
              slug={slug}
              projectIdentifier={projectIdentifier}
              autoFocus
              onSubmit={submit}
              // Con texto, Escape suelta el campo en vez de cerrar el panel (y perder el comentario sin enviar)
              onEscape={body.trim() ? blurComposer : undefined}
              contentClassName="min-h-11 px-3 pt-2.5 pb-1"
            />
          ) : (
            <div
              role="textbox"
              tabIndex={0}
              aria-label="Escribe un comentario"
              onFocus={() => setActive(true)}
              onPointerEnter={preloadRichEditor}
              className="min-h-11 cursor-text px-3 pt-2.5 pb-1 text-sm leading-relaxed text-muted-foreground outline-none"
            >
              Escribe un comentario…
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 pr-2 pb-2 pl-3">
            <span className="font-mono text-[11px] text-muted-foreground">
              <kbd className="text-foreground">/</kbd> insertar · <kbd className="text-foreground">@</kbd> mencionar · selecciona para dar
              formato
            </span>
            <span className="ml-auto flex items-center gap-2.5">
              <span className="font-mono text-[11px] text-muted-foreground">ctrl ↵ enviar</span>
              <Button size="sm" className="rounded-[9px]" onClick={submit} disabled={!body.trim() || create.isPending}>
                {create.isPending && <Spinner />}
                Comentar
              </Button>
            </span>
          </div>
        </div>
      </div>
      {notified.length > 0 && (
        <p className="tf-fade ml-10.5 text-xs text-muted-foreground">
          {joinNames(notified.map((person) => person.fullName.split(' ')[0]))}{' '}
          {notified.length === 1 ? 'recibirá' : 'recibirán'} «{user?.fullName} te mencionó en {issueCode ?? 'la tarea'}» en su
          bandeja.
        </p>
      )}
    </div>
  )
}
