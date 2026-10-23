import { Bell } from 'lucide-react'
import { SidebarLink } from '@/layouts/Sidebar'
import { useUnreadCount } from './hooks'

/** Enlace a la bandeja con el número de notificaciones sin leer. */
export function NotificationsLink({ collapsed }) {
  const { data: count = 0 } = useUnreadCount()
  const label = count > 99 ? '99+' : String(count)

  return (
    <div className="relative">
      <SidebarLink
        to="/notifications"
        icon={Bell}
        label="Notificaciones"
        collapsed={collapsed}
        badge={
          count > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-primary-foreground">
              {label}
            </span>
          )
        }
      />
      {collapsed && count > 0 && (
        <span className="pointer-events-none absolute top-1 right-3 size-2 rounded-full bg-primary" aria-label={`${label} sin leer`} />
      )}
    </div>
  )
}
