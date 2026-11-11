import { Inbox } from 'lucide-react'
import { PulseOnChange } from '@/components/common/Pulse'
import { t } from '@/i18n'
import { SidebarLink } from '@/layouts/Sidebar'
import { useUnreadCount } from './hooks'

/** Enlace a la Bandeja con el número de notificaciones sin leer. */
export function NotificationsLink({ collapsed }) {
  const { data } = useUnreadCount()
  const count = data ?? 0
  const label = count > 99 ? '99+' : String(count)

  return (
    <div className="relative">
      <SidebarLink
        to="/notifications"
        icon={Inbox}
        label={t('Bandeja')}
        ariaLabel={collapsed && count > 0 ? t('Bandeja, {count} sin leer', { count: label }) : undefined}
        collapsed={collapsed}
        badge={
          // Hace un pulso cada vez que cambia el número, también cuando aparece porque llegó el primer aviso (no al
          // cargar: hasta que el número se conoce, el valor es `undefined`)
          <PulseOnChange
            value={data == null ? undefined : label}
            show={count > 0}
            className="min-w-5 rounded-full bg-badge px-1.5 text-center font-mono text-[11px] leading-5 font-semibold text-badge-foreground"
          />
        }
      />
      {collapsed && count > 0 && (
        <span aria-hidden="true" className="pointer-events-none absolute top-1 right-3 size-2 rounded-full bg-badge" />
      )}
    </div>
  )
}
