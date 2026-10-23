import { Link, NavLink } from 'react-router'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { UserMenu } from './UserMenu'

export function Sidebar({ collapsed }) {
  const toggleSidebar = usePreferencesStore((state) => state.toggleSidebar)

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-14 items-center gap-2 px-3', collapsed && 'justify-center px-0')}>
        <Link to="/" aria-label="Inicio" className="min-w-0 flex-1">
          <Logo withText={!collapsed} />
        </Link>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-7 text-muted-foreground md:inline-flex"
            onClick={toggleSidebar}
            aria-label="Contraer menú"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2" aria-label="Principal" />

      <div className="space-y-1 border-t p-2">
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto hidden size-8 text-muted-foreground md:flex"
            onClick={toggleSidebar}
            aria-label="Expandir menú"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        )}
        <UserMenu collapsed={collapsed} />
      </div>
    </div>
  )
}

/** Enlace de navegación de la sidebar con ícono; muestra tooltip cuando está contraída. */
export function SidebarLink({ to, icon: Icon, label, collapsed, end = false, badge }) {
  const link = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex h-8 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
          collapsed && 'justify-center px-0',
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && badge}
    </NavLink>
  )
  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
