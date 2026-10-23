import { useMemo, useState } from 'react'
import { History, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useActivity } from '@/features/issues/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { isAdminRole } from '@/lib/permissions'
import { useSessionStore } from '@/stores/sessionStore'
import { describeActivity } from './describeActivity'
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from './hooks'

/**
 * Comentarios e historial del issue en una sola línea de tiempo, con filtro.
 * Las entradas COMMENT del historial no se repiten: el comentario ya aparece como tarjeta.
 */
export function IssueActivity({ slug, projectId, issueId }) {
  const [filter, setFilter] = useState('all')
  const comments = useComments(slug, projectId, issueId)
  const activity = useActivity(slug, projectId, issueId)

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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Actividad</h3>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs">
              Todo
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs">
              <MessageSquare className="size-3.5" />
              Comentarios
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="size-3.5" />
              Historial
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <CenteredSpinner className="p-4" />
      ) : (
        <ol className="space-y-3">
          {timeline.map((item) =>
            item.type === 'comment' ? (
              <li key={`c-${item.comment.id}`}>
                <CommentCard slug={slug} projectId={projectId} issueId={issueId} comment={item.comment} />
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

      <CommentComposer slug={slug} projectId={projectId} issueId={issueId} />
    </section>
  )
}

function ActivityLine({ entry }) {
  return (
    <div className="flex items-start gap-2 pl-1 text-xs text-muted-foreground">
      <UserAvatar user={entry.actor} size="xs" className="mt-px" />
      <p className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{entry.actor?.fullName ?? 'Alguien'}</span>{' '}
        {describeActivity(entry)}
        <span title={formatDateTime(entry.createdAt)}> · {formatRelative(entry.createdAt)}</span>
      </p>
    </div>
  )
}

function CommentCard({ slug, projectId, issueId, comment }) {
  const workspace = useCurrentWorkspace()
  const currentUserId = useSessionStore((state) => state.user?.id)
  const update = useUpdateComment(slug, projectId, issueId)
  const remove = useDeleteComment(slug, projectId, issueId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isAuthor = comment.author?.id === currentUserId
  const canDelete = isAuthor || isAdminRole(workspace?.myRole)
  const edited = comment.updatedAt !== comment.createdAt

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
      <div className="min-w-0 flex-1 rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs">
          <span className="font-medium">{comment.author?.fullName}</span>
          <span className="text-muted-foreground" title={formatDateTime(comment.createdAt)}>
            {formatRelative(comment.createdAt)}
            {edited && ' · editado'}
          </span>
          {(isAuthor || canDelete) && !editing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto size-6" aria-label="Acciones del comentario">
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
        </div>
        {editing ? (
          <div className="space-y-2 p-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoFocus
              rows={3}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) save()
                if (event.key === 'Escape') setEditing(false)
              }}
            />
            <div className="flex justify-end gap-2">
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
          <p className="px-3 py-2 text-sm break-words whitespace-pre-wrap">{comment.body}</p>
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

function CommentComposer({ slug, projectId, issueId }) {
  const user = useSessionStore((state) => state.user)
  const create = useCreateComment(slug, projectId, issueId)
  const [body, setBody] = useState('')

  const submit = () => {
    const text = body.trim()
    if (!text) return
    create.mutate(text, { onSuccess: () => setBody(''), onError: (error) => notifyError(error) })
  }

  return (
    <div className="flex gap-2.5">
      <UserAvatar user={user} size="md" />
      <div className="min-w-0 flex-1 space-y-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Escribe un comentario…"
          rows={3}
          maxLength={10000}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit()
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Ctrl + Enter para enviar</span>
          <Button size="sm" onClick={submit} disabled={!body.trim() || create.isPending}>
            {create.isPending && <Spinner />}
            Comentar
          </Button>
        </div>
      </div>
    </div>
  )
}
