import { NavLink } from 'react-router'
import { FolderClosed, PanelLeftClose, PanelLeftOpen, SlidersHorizontal } from 'lucide-react'
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
    <div className={cn('flex h-full flex-col gap-4.5 py-3.5', collapsed ? 'px-2' : 'px-3')}>
      {/* Contraída: logo del workspace y debajo el botón para expandir, ambos arriba */}
      <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
        <div className={cn('min-w-0', collapsed ? 'w-full' : 'flex-1')}>
          <WorkspaceSwitcher currentSlug={slug} collapsed={collapsed} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-8 text-sidebar-muted hover:bg-sidebar-accent md:inline-flex"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? 'Expandir menú' : 'Contraer menú'}</TooltipContent>
        </Tooltip>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-4.5 overflow-y-auto" aria-label="Principal">
        <div className="flex flex-col gap-0.5">
          <NotificationsLink collapsed={collapsed} />
          {slug && (
            <>
              <SidebarLink to={`/${slug}`} end icon={FolderClosed} label="Proyectos" collapsed={collapsed} />
              <SidebarLink to={`/${slug}/settings`} icon={SlidersHorizontal} label="Ajustes" collapsed={collapsed} />
            </>
          )}
        </div>
        {slug && <SidebarProjects slug={slug} currentProjectId={projectId} collapsed={collapsed} />}
      </nav>

      <UserMenu collapsed={collapsed} />
    </div>
  )
}

/**
 * Enlace de navegación de la sidebar con ícono; muestra tooltip cuando está contraída.
 * El estado activo se pinta con `aria-current="page"` (lo pone NavLink): así el className es un texto fijo
 * y el TooltipTrigger (Radix Slot) lo puede combinar sin romperlo.
 */
export function SidebarLink({ to, icon: Icon, iconNode, label, collapsed, end = false, badge, meta, title, className }) {
  const link = (
    <NavLink
      to={to}
      end={end}
      aria-label={collapsed ? label : undefined}
      title={title}
      className={cn(
        'group/link flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm whitespace-nowrap text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent',
        'aria-[current=page]:bg-sidebar-active aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-active-foreground',
        collapsed && 'justify-center px-0',
        className,
      )}
    >
      {iconNode ?? (Icon && <Icon className="size-4 shrink-0" />)}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && badge}
      {!collapsed && meta && (
        <span className="max-w-[55%] truncate font-mono text-[11px] font-normal text-sidebar-muted group-aria-[current=page]/link:text-sidebar-active-foreground">
          {meta}
        </span>
      )}
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
