import { useNavigate, useSearchParams } from 'react-router'
import { BellOff, CheckCheck, MessageSquare, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/common/Loaders'
import { EmptyState, ErrorState } from '@/components/common/States'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useMarkAllAsRead, useMarkAsRead, useNotifications, useUnreadCount } from './hooks'

const TYPE_ICONS = {
  ISSUE_ASSIGNED: UserPlus,
  ISSUE_COMMENTED: MessageSquare,
}

export function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const unread = searchParams.get('tab') !== 'all'
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({ unread })
  const { data: unreadCount = 0 } = useUnreadCount()
  const markAll = useMarkAllAsRead()
  const notifications = data?.pages.flatMap((page) => page.content) ?? []

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Notificaciones' }]}
        actions={
          <Button
            size="sm"
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
      <PageBody>
        <div className="mx-auto max-w-3xl p-4 sm:p-8">
          <Tabs
            value={unread ? 'unread' : 'all'}
            onValueChange={(value) => setSearchParams(value === 'all' ? { tab: 'all' } : {}, { replace: true })}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="unread">No leídas{unreadCount > 0 && ` (${unreadCount})`}</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          )}
          {error && <ErrorState error={error} onRetry={refetch} />}
          {!isLoading && !error && notifications.length === 0 && (
            <EmptyState
              icon={BellOff}
              title={unread ? 'Estás al día' : 'Sin notificaciones'}
              description="Te avisaremos cuando te asignen un issue o comenten en uno tuyo."
            />
          )}
          {notifications.length > 0 && (
            <ul className="divide-y rounded-xl border">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </ul>
          )}
          {hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage && <Spinner />}
                Cargar más
              </Button>
            </div>
          )}
        </div>
      </PageBody>
    </>
  )
}

/** @param {{ notification: import('@/api/types').NotificationResponse }} props */
function NotificationItem({ notification }) {
  const navigate = useNavigate()
  const markAsRead = useMarkAsRead()
  const Icon = TYPE_ICONS[notification.type] ?? MessageSquare
  const issue = notification.issue

  const open = () => {
    if (!notification.read) markAsRead.mutate(notification.id)
    if (issue) navigate(`/${issue.workspaceSlug}/projects/${issue.projectId}/issues?issue=${issue.id}`)
  }

  return (
    <li>
      <button
        type="button"
        onClick={open}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
          !notification.read && 'bg-primary/5',
        )}
      >
        <div className="relative">
          <UserAvatar user={notification.actor} size="md" />
          <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-background">
            <Icon className="size-3 text-muted-foreground" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm', !notification.read && 'font-medium')}>{notification.message}</p>
          <p className="text-xs text-muted-foreground" title={formatDateTime(notification.createdAt)}>
            {formatRelative(notification.createdAt)}
          </p>
        </div>
        {!notification.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="No leída" />}
      </button>
    </li>
  )
}
