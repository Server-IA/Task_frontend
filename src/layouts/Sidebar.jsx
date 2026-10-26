import { NavLink } from 'react-router'
import { FolderKanban, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NotificationsLink } from '@/features/notifications/NotificationsLink'
import { WorkspaceSwitcher } from '@/features/workspaces/components/WorkspaceSwitcher'
import { useRouteParams } from '@/hooks/useRouteParams'
import { cn } from '@/lib/utils'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { SidebarProjects } from './SidebarProjects'
import { UserMenu } from './UserMenu'

export function Sidebar({ collapsed }) {
  const toggleSidebar = usePreferencesStore((state) => state.toggleSidebar)
  const lastWorkspaceSlug = usePreferencesStore((state) => state.lastWorkspaceSlug)
  const { slug: routeSlug, projectId } = useRouteParams()
  // Fuera de un workspace (perfil, notificaciones) se usa el último abierto
  const slug = routeSlug ?? lastWorkspaceSlug

  return (
    <div className="flex h-full flex-col">
      {/* Contraída: logo del workspace y debajo el botón para expandir, ambos arriba */}
      <div
        className={cn(
          'flex items-center gap-1 px-2',
          collapsed ? 'flex-col justify-center gap-1 py-2.5' : 'h-14',
        )}
      >
        <div className={cn('min-w-0', collapsed ? 'w-full' : 'flex-1')}>
          <WorkspaceSwitcher currentSlug={slug} collapsed={collapsed} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('hidden text-muted-foreground md:inline-flex', collapsed ? 'size-8' : 'size-7')}
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? 'Expandir menú' : 'Contraer menú'}</TooltipContent>
        </Tooltip>
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-2" aria-label="Principal">
        <NotificationsLink collapsed={collapsed} />
        {slug && (
          <>
            <div className="space-y-0.5">
              <SidebarLink to={`/${slug}`} end icon={FolderKanban} label="Proyectos" collapsed={collapsed} />
              <SidebarLink to={`/${slug}/settings`} icon={Settings} label="Ajustes" collapsed={collapsed} />
            </div>
            <SidebarProjects slug={slug} currentProjectId={projectId} collapsed={collapsed} />
          </>
        )}
      </nav>

      <div className="border-t p-2">
        <UserMenu collapsed={collapsed} />
      </div>
    </div>
  )
}

/**
 * Enlace de navegación de la sidebar con ícono; muestra tooltip cuando está contraída.
 * El estado activo se pinta con `aria-current="page"` (lo pone NavLink): así el className es un texto fijo
 * y el TooltipTrigger (Radix Slot) lo puede combinar sin romperlo.
 */
export function SidebarLink({ to, icon: Icon, iconNode, label, collapsed, end = false, badge, iconClassName }) {
  const link = (
    <NavLink
      to={to}
      end={end}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'flex h-8 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-0',
      )}
    >
      {iconNode ?? <Icon className={cn('size-4 shrink-0', iconClassName)} />}
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
