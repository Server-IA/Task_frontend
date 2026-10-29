import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AtSign, BellOff, CheckCheck, MousePointerClick } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { Segmented } from '@/components/common/Segmented'
import { EmptyState, ErrorState } from '@/components/common/States'
import { UserAvatar } from '@/components/common/UserAvatar'
import { TypeIcon } from '@/features/issues/components/IssueTypeBits'
import { IssueDetailWithExtras } from '@/features/issues/components/IssueDetailWithExtras'
import { markdownToPlainText } from '@/features/editor/markdown/plainText'
import { IssuePeekSheet } from '@/features/issues/components/IssuePeekSheet'
import { MentionText } from '@/features/mentions/MentionText'
import { useProject } from '@/features/projects/hooks'
import { useElementWidth } from '@/hooks/useElementWidth'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatDateTime, formatRelative, groupByDay } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { useMarkAllAsRead, useMarkAsRead, useNotificationCounts, useNotifications } from './hooks'
import {
  excerptSegments,
  inboxTab,
  isOpenedNotification,
  notificationIssue,
  notificationProject,
  notificationProjectColor,
  notificationTarget,
  openedIssueFromParams,
  withOpenedIssue,
} from './notificationParts'

/** Marca pequeña sobre el avatar según el tipo de aviso: las menciones van con el acento y el desbloqueo en verde. */
const TYPE_MARKS = {
  ISSUE_ASSIGNED: { mark: '+', className: 'bg-card text-muted-foreground' },
  ISSUE_COMMENTED: { mark: '“', className: 'bg-card text-muted-foreground' },
  ISSUE_MENTIONED: { mark: '@', className: 'border-transparent bg-primary text-primary-foreground' },
  ISSUE_UNBLOCKED: { mark: '✓', className: 'border-transparent bg-ok-soft text-ok' },
  RETRO_STARTED: { mark: '↻', className: 'bg-card text-accent-text' },
  STORY_READY: { mark: '✓', className: 'border-transparent bg-ok-soft text-ok' },
}
const DEFAULT_MARK = { mark: '·', className: 'bg-card text-muted-foreground' }

const EMPTY = {
  unread: { icon: BellOff, title: 'Estás al día', description: 'Te avisaremos cuando te asignen una tarea, comenten en una tuya o te mencionen.' },
  mentions: { icon: AtSign, title: 'Nadie te ha mencionado', description: 'Cuando alguien escriba @ y tu nombre en un comentario, aparecerá aquí.' },
  all: { icon: BellOff, title: 'Sin notificaciones', description: 'Te avisaremos cuando te asignen una tarea, comenten en una tuya o te mencionen.' },
}

/**
 * Ancho desde el que la tarea de un aviso se abre al lado de la lista (lista de 340 px + panel de 520 px). Más
 * angosto, se abre en el panel flotante de Tareas.
 */
const SPLIT_MIN_WIDTH = 880

/**
 * Bandeja: avisos por día con pestañas (No leídas, Menciones, Todas). Al abrir un aviso, su tarea se muestra al
 * lado con el comentario del aviso a la vista (en pantallas angostas, en el panel flotante). La tarea abierta vive
 * en la URL (?workspace=&project=&issue=&comment=). Los avisos de retrospectiva llevan a su página.
 */
export function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const tab = inboxTab(searchParams.get('tab'))
  const opened = openedIssueFromParams(searchParams)
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({ tab })
  const { data: counts } = useNotificationCounts()
  const unreadCount = counts?.unread ?? 0
  const markAll = useMarkAllAsRead()
  const markAsRead = useMarkAsRead()
  const notifications = data?.pages.flatMap((page) => page.content) ?? []
  const empty = EMPTY[tab]
  const rootRef = useRef(null)
  const split = useElementWidth(rootRef, 0) >= SPLIT_MIN_WIDTH

  // Agrupadas por día, en el orden en que llegan (más recientes primero)
  const days = groupByDay(notifications, (notification) => notification.createdAt)

  // Abrir una tarea suma una entrada al historial (atrás vuelve a la anterior); cerrarla, no
  const setOpened = (next) => setSearchParams((previous) => withOpenedIssue(previous, next), { replace: !next })
  const openNotification = (notification) => {
    if (!notification.read) markAsRead.mutate(notification.id)
    const issueTarget = notificationIssue(notification)
    const route = notificationTarget(notification)
    if (issueTarget) setOpened(issueTarget)
    else if (route) navigate(route)
  }
  // Una subtarea, el padre o una relación del mismo proyecto se abren en el mismo lugar
  const openRelated = (issueId) => opened && setOpened({ ...opened, issueId, commentId: null })
  const setTab = (value) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value === 'unread') next.delete('tab')
        else next.set('tab', value)
        return next
      },
      { replace: true },
    )

  const markAllButton = (
    <Button
      variant="outline"
      size={split ? 'icon' : 'default'}
      className={cn(split && 'size-9 rounded-[10px] bg-card')}
      disabled={unreadCount === 0 || markAll.isPending}
      aria-label={split ? 'Marcar todas como leídas' : undefined}
      title={split ? 'Marcar todas como leídas' : undefined}
      onClick={() =>
        markAll.mutate(undefined, {
          onSuccess: () => toast.success('Todas las notificaciones quedaron como leídas'),
          onError: (markError) => notifyError(markError),
        })
      }
    >
      <CheckCheck />
      {!split && 'Marcar todas como leídas'}
    </Button>
  )

  return (
    <div ref={rootRef} className="flex min-h-0 w-full flex-1 gap-3.5">
      <div className={cn('flex min-h-0 min-w-0 flex-col gap-3.5', split ? 'flex-[1_1_340px]' : 'mx-auto w-full max-w-[820px]')}>
        <PageHeader
          path={[{ label: '~' }, { label: 'bandeja' }]}
          title="Bandeja"
          description="Asignaciones, comentarios en tus tareas, menciones, tareas desbloqueadas y retrospectivas."
          actions={split ? undefined : markAllButton}
        />
        <PageBody className="flex flex-col gap-3.5">
          <div className="flex items-center gap-2">
            <Segmented
              label="Filtrar"
              className="bg-card"
              value={tab}
              onChange={setTab}
              options={[
                {
                  value: 'unread',
                  label: (
                    <>
                      No leídas{unreadCount > 0 && <span className="ml-1.5 font-mono">{unreadCount}</span>}
                    </>
                  ),
                },
                {
                  value: 'mentions',
                  label: (
                    <span className="flex items-center">
                      Menciones
                      {counts?.mentions > 0 && <span className="ml-1.5 font-mono">{counts.mentions}</span>}
                      {counts?.unreadMentions > 0 && (
                        <span
                          className="ml-1 size-1.5 rounded-full bg-ring"
                          title={`${counts.unreadMentions} sin leer`}
                          aria-label={`${counts.unreadMentions} sin leer`}
                        />
                      )}
                    </span>
                  ),
                },
                { value: 'all', label: 'Todas' },
              ]}
            />
            {split && <span className="ml-auto">{markAllButton}</span>}
          </div>

          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          )}
          {error && <ErrorState error={error} onRetry={refetch} />}
          {!isLoading && !error && notifications.length === 0 && (
            <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
          )}
          {days.map((day) => (
            <section key={`${tab}-${day.label}`} aria-label={day.label} className="flex flex-col gap-1.5">
              <h2 className="mx-1 mt-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {day.label}
              </h2>
              <ul className="tf-enter overflow-hidden rounded-2xl border bg-card">
                {day.items.map((notification, index) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    first={index === 0}
                    current={isOpenedNotification(notification, opened)}
                    onOpen={() => openNotification(notification)}
                  />
                ))}
              </ul>
            </section>
          ))}
          {hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage && <Spinner />}
                Cargar más
              </Button>
            </div>
          )}
        </PageBody>
      </div>

      {split ? (
        <section
          aria-label={opened ? 'Tarea del aviso' : 'Ninguna tarea abierta'}
          className="tf-panel flex min-h-0 min-w-0 flex-[1.5_1_520px] flex-col overflow-hidden"
        >
          {opened ? (
            <OpenedIssue key={opened.issueId} opened={opened} onClose={() => setOpened(null)} onOpenIssue={openRelated} />
          ) : (
            <EmptyState
              className="flex-1"
              icon={MousePointerClick}
              title="Elige un aviso"
              description="Su tarea se abre aquí, con el comentario del aviso a la vista."
            />
          )}
        </section>
      ) : (
        <OpenedIssueSheet opened={opened} onClose={() => setOpened(null)} onOpenIssue={openRelated} />
      )}
    </div>
  )
}

/** La tarea abierta junto a la lista: el mismo detalle del panel de Tareas, con su proyecto. */
function OpenedIssue({ opened, onClose, onOpenIssue }) {
  const { data: project, error, refetch } = useProject(opened.slug, opened.projectId)
  if (error) return <ErrorState className="flex-1" error={error} onRetry={refetch} homeLink="/notifications" />
  if (!project) return <CenteredSpinner className="flex-1" />
  return (
    <div className="tf-fade h-full min-h-0">
      <IssueDetailWithExtras
        slug={opened.slug}
        project={project}
        issueId={opened.issueId}
        variant="panel"
        focusCommentId={opened.commentId}
        onClose={onClose}
        onOpenIssue={onOpenIssue}
      />
    </div>
  )
}

/**
 * En pantallas angostas la tarea se abre en el panel flotante de Tareas, cuando ya se cargó su proyecto. Al cerrar,
 * la URL pierde la tarea enseguida: se siguen usando la última tarea y su proyecto mientras el panel sale.
 */
function OpenedIssueSheet({ opened, onClose, onOpenIssue }) {
  const { data: project } = useProject(opened?.slug, opened?.projectId)
  const current = opened && project ? { ...opened, project } : null
  const [last, setLast] = useState(current)
  const keyOf = (item) => (item ? `${item.project.id}:${item.issueId}:${item.commentId ?? ''}` : '')
  if (current && keyOf(current) !== keyOf(last)) setLast(current)
  const shown = current ?? last

  return (
    <IssuePeekSheet
      slug={shown?.slug}
      project={shown?.project}
      issueId={current?.issueId ?? null}
      focusCommentId={shown?.commentId}
      onClose={onClose}
      onOpenIssue={onOpenIssue}
    />
  )
}

/** El código de la tarea dentro del mensaje se resalta en monoespaciada (y las menciones, como «@Nombre»). */
function MessageText({ message = '', code, type }) {
  if (!code || !message.includes(code)) return <MentionText body={message} />
  const [before, ...rest] = message.split(code)
  return (
    <>
      <MentionText body={before} />
      {type && <TypeIcon type={type} size={13} className="mr-1 inline-block align-[-1px]" />}
      <span className="font-mono text-[13px] text-accent-text">{code}</span>
      <MentionText body={rest.join(code)} />
    </>
  )
}

/** «Extracto del comentario» entre comillas, con mi mención resaltada. */
function CommentExcerpt({ excerpt }) {
  const myName = useSessionStore((state) => state.user?.fullName)
  return (
    <span className="mt-1.5 block rounded-[10px] bg-subtle px-2.5 py-1.5 leading-snug break-words text-muted-foreground">
      «
      {excerptSegments(markdownToPlainText(excerpt), myName).map((segment, index) =>
        segment.me ? (
          <span key={index} className="rounded-md bg-accent-soft px-1 font-semibold text-accent-text [box-decoration-break:clone]">
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
      »
    </span>
  )
}

/**
 * Un aviso: abre su tarea (al lado o en el panel flotante) o, si es de una retrospectiva, la retro. El de la tarea
 * abierta queda marcado.
 * @param {{ notification: import('@/api/types').NotificationResponse, first: boolean, current: boolean,
 *           onOpen: () => void }} props
 */
function NotificationItem({ notification, first, current, onOpen }) {
  const issue = notification.issue
  const mark = TYPE_MARKS[notification.type] ?? DEFAULT_MARK
  const project = notificationProject(notification)
  const workspaceSlug = issue?.workspaceSlug ?? notification.cycle?.workspaceSlug

  return (
    <li className={cn(!first && 'border-t')}>
      <button
        type="button"
        onClick={onOpen}
        aria-current={current ? 'true' : undefined}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-300 hover:bg-subtle',
          !notification.read && 'bg-accent-soft/35',
          current && 'bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-text)] hover:bg-accent-soft',
        )}
      >
        <span className="relative shrink-0">
          {notification.type === 'STORY_READY' ? (
            // Lo manda TaskFlow (sin autor)
            <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
              TF
            </span>
          ) : (
            <UserAvatar user={notification.actor} size="md" className="size-9" />
          )}
          <span
            aria-hidden="true"
            className={cn(
              'absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full border font-mono text-[10px] font-semibold',
              mark.className,
            )}
          >
            {mark.mark}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          {notification.type === 'STORY_READY' && issue ? (
            <>
              <span className="block leading-snug">
                <span className={cn(!notification.read && 'font-semibold')}>TaskFlow</span>{' '}
                <span className="text-muted-foreground">avisa: lista para revisar</span>
              </span>
              <span className={cn('mt-0.5 flex min-w-0 items-center gap-1.5 leading-snug', !notification.read && 'font-semibold')}>
                <TypeIcon type="STORY" size={14} />
                <span className="font-mono text-[13px] text-accent-text">{issue.code}</span>
                <span className="truncate">{issue.title}</span>
              </span>
            </>
          ) : (
            <span className={cn('block leading-snug', !notification.read && 'font-semibold')}>
              <MessageText message={notification.message} code={issue?.code} type={issue?.type} />
            </span>
          )}
          {notification.comment?.excerpt && <CommentExcerpt excerpt={notification.comment.excerpt} />}
          <span
            className="mt-1.5 block font-mono text-[11px] text-muted-foreground"
            title={[workspaceSlug, formatDateTime(notification.createdAt)].filter(Boolean).join(' · ')}
          >
            {project && (
              <>
                <span
                  aria-hidden="true"
                  data-project-color={notificationProjectColor(notification) ?? ''}
                  className="mr-1.5 inline-block size-2 rounded-[3px] bg-(--project) align-[0.5px]"
                />
                {project} ·{' '}
              </>
            )}
            {formatRelative(notification.createdAt)}
          </span>
        </span>
        {!notification.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-badge" aria-label="No leída" />}
      </button>
    </li>
  )
}
