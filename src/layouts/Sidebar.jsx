import { NavLink } from 'react-router'
import { Activity, FolderClosed, PanelLeftClose, PanelLeftOpen, Search, SlidersHorizontal, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMyWork } from '@/features/my-work/hooks'
import { NotificationsLink } from '@/features/notifications/NotificationsLink'
import { WorkspaceSwitcher } from '@/features/workspaces/components/WorkspaceSwitcher'
import { useLastWorkspaceSlug } from '@/features/workspaces/hooks'
import { useRouteParams } from '@/hooks/useRouteParams'
import { COMMAND_SHORTCUT } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layoutStore'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { SidebarProjects } from './SidebarProjects'
import { UserMenu } from './UserMenu'

export function Sidebar({ collapsed }) {
  const toggleSidebar = usePreferencesStore((state) => state.toggleSidebar)
  const lastWorkspaceSlug = useLastWorkspaceSlug()
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

      {/* overflow-x-hidden: plegada y con scroll vertical, la barra le quitaba ancho y aparecía otra horizontal */}
      <nav className="flex min-h-0 flex-1 flex-col gap-4.5 overflow-x-hidden overflow-y-auto" aria-label="Principal">
        <div className="flex flex-col gap-0.5">
          <SearchButton collapsed={collapsed} />
          <NotificationsLink collapsed={collapsed} />
          {slug && (
            <>
              <MyWorkLink slug={slug} collapsed={collapsed} />
              <SidebarLink to={`/${slug}/activity`} icon={Activity} label="Actividad" collapsed={collapsed} />
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

/** «Mi trabajo» con el número de tareas abiertas asignadas a ti. */
function MyWorkLink({ slug, collapsed }) {
  const { data } = useMyWork(slug, 'assigned')
  const count = data?.assignedCount ?? 0
  return (
    <SidebarLink
      to={`/${slug}/my-work`}
      icon={User}
      label="Mi trabajo"
      meta={count > 0 ? String(count) : undefined}
      collapsed={collapsed}
    />
  )
}

/** Abre la paleta de búsqueda y comandos (también con Ctrl/⌘ K desde cualquier pantalla). */
function SearchButton({ collapsed }) {
  const setCommandOpen = useLayoutStore((state) => state.setCommandOpen)
  const button = (
    <button
      type="button"
      onClick={() => setCommandOpen(true)}
      aria-label={collapsed ? `Buscar (${COMMAND_SHORTCUT})` : undefined}
      aria-keyshortcuts={COMMAND_SHORTCUT === '⌘K' ? 'Meta+K' : 'Control+K'}
      className={cn(
        'flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-sm whitespace-nowrap text-sidebar-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        collapsed && 'justify-center px-0',
      )}
    >
      <Search className="size-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-left">Buscar</span>
          <kbd className="rounded-[5px] border border-sidebar-border px-1.5 font-mono text-[11px] text-sidebar-muted">
            {COMMAND_SHORTCUT}
          </kbd>
        </>
      )}
    </button>
  )
  if (!collapsed) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">Buscar · {COMMAND_SHORTCUT}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Enlace de navegación de la sidebar con ícono; muestra tooltip cuando está contraída.
 * El estado activo se pinta con `aria-current="page"` (lo pone NavLink): así el className es un texto fijo
 * y el TooltipTrigger (Radix Slot) lo puede combinar sin romperlo.
 */
/** `ariaLabel`: nombre accesible de la versión contraída si debe decir más que `label` (p. ej. un contador). */
export function SidebarLink({ to, icon: Icon, iconNode, label, ariaLabel, collapsed, end = false, badge, meta, title, className }) {
  const link = (
    <NavLink
      to={to}
      end={end}
      aria-label={collapsed ? (ariaLabel ?? label) : undefined}
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
