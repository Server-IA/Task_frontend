import { useState } from 'react'
import { NavLink } from 'react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePlanningList } from '@/features/planning/hooks'
import { CreateProjectDialog } from '@/features/projects/components/CreateProjectDialog'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { useWorkspace } from '@/features/workspaces/hooks'
import { t, tn } from '@/i18n'
import { can } from '@/lib/permissions'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { orderItems, PROJECT_SECTIONS, SECTION_PERMISSIONS } from './menuOrder'
import { SidebarLink } from './Sidebar'

/** «12 abiertas» / «1 abierta». */
const openLabel = (count = 0) => tn(count, '{count} abierta', '{count} abiertas')

/** Lista «// proyectos»: el proyecto abierto se despliega con sus secciones, los demás son un enlace. */
export function SidebarProjects({ slug, currentProjectId, collapsed }) {
  const { data: projects = [] } = useProjects(slug)
  const [createOpen, setCreateOpen] = useState(false)
  // Crear proyectos va por permiso
  const workspace = useWorkspace(slug).data
  const canCreate = can(workspace, 'PROJECT_CREATE')

  return (
    <div className="flex flex-col gap-0.5">
      {!collapsed && (
        <div className="flex min-h-7.5 items-center justify-between pr-1 pb-1.5 pl-2.5">
          <span className="font-mono text-[11px] text-sidebar-muted">{t('// proyectos')}</span>
          {canCreate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-sidebar-muted hover:bg-sidebar-accent"
                  onClick={() => setCreateOpen(true)}
                  aria-label={t('Nuevo proyecto')}
                >
                  <Plus className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('Nuevo proyecto')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      {projects.map((project) => {
        const base = `/${slug}/projects/${project.id}`
        if (collapsed || project.id !== currentProjectId) {
          return (
            <SidebarLink
              key={project.id}
              // A la raíz del proyecto (redirige a tareas): así queda marcado en cualquiera de sus secciones
              to={base}
              // Un identificador largo (hasta 12 letras) se corta: abierta, para no dejar el nombre en «Pl…»; plegada, para
              // caber junto a la barra de scroll
              iconNode={<ProjectIcon project={project} className={collapsed ? 'max-w-full' : 'max-w-[4.5rem]'} />}
              label={project.name}
              // El nombre suele quedar cortado («Plat…»): completo al pasar el mouse
              title={collapsed ? undefined : project.name}
              meta={project.openIssueCount > 0 ? openLabel(project.openIssueCount) : undefined}
              collapsed={collapsed}
            />
          )
        }
        return <CurrentProject key={project.id} slug={slug} project={project} base={base} workspace={workspace} />
      })}
      {canCreate && <CreateProjectDialog slug={slug} open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  )
}

/**
 * Proyecto abierto con sus secciones. A la derecha de cada una va un dato útil:
 * tareas abiertas, el ciclo en curso, la daily de hoy y los módulos sin terminar.
 */
function CurrentProject({ slug, project, base, workspace }) {
  const { data: cycles } = usePlanningList('cycles', slug, project.id)
  const { data: modules } = usePlanningList('modules', slug, project.id)
  const currentCycle = cycles?.find((cycle) => cycle.status === 'CURRENT' && !cycle.closedAt)
  const activeModules = modules?.filter((module) => module.progress.percentage < 100).length ?? 0
  // El orden de las secciones lo elige cada persona («Personalizar menú»)
  const menuOrder = usePreferencesStore((state) => state.menuOrder)
  // Las secciones que piden un permiso (estadísticas, reportes) no se ofrecen a quien no lo tiene
  const allowed = PROJECT_SECTIONS.filter((section) => !SECTION_PERMISSIONS[section.path] || can(workspace, SECTION_PERMISSIONS[section.path]))
  const sections = orderItems(allowed, menuOrder.mode, menuOrder.sections, (section) => section.path)

  const meta = {
    issues: openLabel(project.openIssueCount),
    // «2 sin partir» (o, si están todas partidas, cuántas hay abiertas)
    stories:
      project.unsplitStoryCount > 0
        ? t('{count} sin partir', { count: project.unsplitStoryCount })
        : project.openStoryCount > 0
          ? openLabel(project.openStoryCount)
          : undefined,
    cycles: currentCycle?.name,
    daily: t('hoy'),
    modules: activeModules > 0 ? tn(activeModules, '{count} activo', '{count} activos') : undefined,
  }

  return (
    <div className="tf-pop rounded-[14px] bg-sidebar-accent p-1.5">
      <NavLink to={`${base}/issues`} className="flex items-center gap-2 px-1.5 py-1.5 text-sm font-semibold text-sidebar-foreground">
        <ProjectIcon project={project} className="max-w-[4.5rem]" />
        <span className="min-w-0 flex-1 truncate">{project.name}</span>
      </NavLink>
      <div className="mt-0.5 flex flex-col gap-0.5">
        {sections.map((section) => (
          <SidebarLink
            key={section.path}
            to={`${base}/${section.path}`}
            label={section.label}
            meta={meta[section.path]}
            title={t('{section} · atajo {key}', { section: section.label, key: section.hint })}
            className="h-8 pl-3 hover:bg-sidebar-active/60"
          />
        ))}
      </div>
    </div>
  )
}
