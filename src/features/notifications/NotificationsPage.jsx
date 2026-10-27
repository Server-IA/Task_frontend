import { Fragment } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { isToday, isYesterday, parseISO } from 'date-fns'
import { BellOff, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/common/Loaders'
import { Segmented } from '@/components/common/Segmented'
import { EmptyState, ErrorState } from '@/components/common/States'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatDateTime, formatLongDate, formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useMarkAllAsRead, useMarkAsRead, useNotifications, useUnreadCount } from './hooks'

/** Marca pequeña sobre el avatar según el tipo de aviso. */
const TYPE_MARKS = {
  ISSUE_ASSIGNED: '@',
  ISSUE_COMMENTED: '“',
}

/** «Hoy», «Ayer» o la fecha completa. */
function dayLabel(value) {
  const date = parseISO(value)
  if (isToday(date)) return 'Hoy'
  if (isYesterday(date)) return 'Ayer'
  return formatLongDate(date)
}

export function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const unread = searchParams.get('tab') !== 'all'
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({ unread })
  const { data: unreadCount = 0 } = useUnreadCount()
  const markAll = useMarkAllAsRead()
  const notifications = data?.pages.flatMap((page) => page.content) ?? []

  // Agrupadas por día, en el orden en que llegan (más recientes primero)
  const days = []
  for (const notification of notifications) {
    const label = dayLabel(notification.createdAt)
    if (days.at(-1)?.label !== label) days.push({ label, items: [] })
    days.at(-1).items.push(notification)
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] min-h-0 flex-1 flex-col gap-3.5">
      <PageHeader
        path={[{ label: '~' }, { label: 'bandeja' }]}
        title="Bandeja"
        description="Te avisamos cuando te asignan una tarea o comentan en las tuyas."
        actions={
          <Button
            variant="outline"
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() =>
              markAll.mutate(undefined, {
                onSuccess: () => toast.success('Todas las notificaciones quedaron como leídas'),
                onError: (markError) => notifyError(markError),
              })
            }
          >
            <CheckCheck />
            Marcar todas como leídas
          </Button>
        }
      />
      <PageBody className="flex flex-col gap-3.5">
        <Segmented
          label="Filtrar"
          className="self-start bg-card"
          value={unread ? 'unread' : 'all'}
          onChange={(value) => setSearchParams(value === 'all' ? { tab: 'all' } : {}, { replace: true })}
          options={[
            {
              value: 'unread',
              label: (
                <>
                  No leídas{unreadCount > 0 && <span className="ml-1.5 font-mono">{unreadCount}</span>}
                </>
              ),
            },
            { value: 'all', label: 'Todas' },
          ]}
        />

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        )}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {!isLoading && !error && notifications.length === 0 && (
          <EmptyState
            icon={BellOff}
            title={unread ? 'Estás al día' : 'Sin notificaciones'}
            description="Te avisaremos cuando te asignen una tarea o comenten en una tuya."
          />
        )}
        {days.map((day) => (
          <section key={day.label} aria-label={day.label} className="flex flex-col gap-1.5">
            <h2 className="mx-1 mt-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {day.label}
            </h2>
            <ul className="tf-enter overflow-hidden rounded-2xl border bg-card">
              {day.items.map((notification, index) => (
                <NotificationItem key={notification.id} notification={notification} first={index === 0} />
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
  )
}

/** El código de la tarea dentro del mensaje se resalta en monoespaciada. */
function MessageText({ message, code }) {
  if (!code || !message.includes(code)) return message
  const [before, ...rest] = message.split(code)
  return (
    <>
      {before}
      <span className="font-mono text-[13px] text-accent-text">{code}</span>
      {rest.map((part, index) => (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </>
  )
}

/** @param {{ notification: import('@/api/types').NotificationResponse, first: boolean }} props */
function NotificationItem({ notification, first }) {
  const navigate = useNavigate()
  const markAsRead = useMarkAsRead()
  const issue = notification.issue

  const open = () => {
    if (!notification.read) markAsRead.mutate(notification.id)
    if (issue) navigate(`/${issue.workspaceSlug}/projects/${issue.projectId}/issues?issue=${issue.id}`)
  }

  return (
    <li className={cn(!first && 'border-t')}>
      <button
        type="button"
        onClick={open}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-300 hover:bg-subtle',
          !notification.read && 'bg-accent-soft/35',
        )}
      >
        <span className="relative shrink-0">
          <UserAvatar user={notification.actor} size="md" className="size-9" />
          <span className="absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full border bg-card font-mono text-[10px] text-muted-foreground">
            {TYPE_MARKS[notification.type] ?? '·'}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block leading-snug', !notification.read && 'font-semibold')}>
            <MessageText message={notification.message} code={issue?.code} />
          </span>
          <span className="mt-1.5 block font-mono text-[11px] text-muted-foreground" title={formatDateTime(notification.createdAt)}>
            {issue ? `${issue.workspaceSlug} · ` : ''}
            {formatRelative(notification.createdAt)}
          </span>
        </span>
        {!notification.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-badge" aria-label="No leída" />}
      </button>
    </li>
  )
}
