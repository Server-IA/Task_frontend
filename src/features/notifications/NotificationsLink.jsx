import { Inbox } from 'lucide-react'
import { SidebarLink } from '@/layouts/Sidebar'
import { useUnreadCount } from './hooks'

/** Enlace a la Bandeja con el número de notificaciones sin leer. */
export function NotificationsLink({ collapsed }) {
  const { data: count = 0 } = useUnreadCount()
  const label = count > 99 ? '99+' : String(count)

  return (
    <div className="relative">
      <SidebarLink
        to="/notifications"
        icon={Inbox}
        label="Bandeja"
        collapsed={collapsed}
        badge={
          count > 0 && (
            <span className="min-w-5 rounded-full bg-badge px-1.5 text-center font-mono text-[11px] leading-5 font-semibold text-badge-foreground">
              {label}
            </span>
          )
        }
      />
      {collapsed && count > 0 && (
        <span className="pointer-events-none absolute top-1 right-3 size-2 rounded-full bg-badge" aria-label={`${label} sin leer`} />
      )}
    </div>
  )
}
