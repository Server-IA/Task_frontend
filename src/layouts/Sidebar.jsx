import { NavLink } from 'react-router'
import { FolderKanban, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
      <div className={cn('flex h-14 items-center gap-1 px-2', collapsed && 'justify-center')}>
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher currentSlug={slug} collapsed={collapsed} />
        </div>
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

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-2" aria-label="Principal">
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
export function SidebarLink({ to, icon: Icon, iconNode, label, collapsed, end = false, badge, iconClassName }) {
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
