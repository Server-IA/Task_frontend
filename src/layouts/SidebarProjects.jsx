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
import { isManager } from '@/lib/permissions'
import { SidebarLink } from './Sidebar'

/** Secciones de un proyecto con su atajo de teclado (ver ProjectLayout). */
export const PROJECT_SECTIONS = [
  { path: 'issues', label: 'Tareas', hint: 'I' },
  { path: 'cycles', label: 'Ciclos', hint: 'Y' },
  { path: 'modules', label: 'Módulos', hint: 'M' },
  { path: 'roadmap', label: 'Hoja de ruta', hint: 'R' },
  { path: 'stats', label: 'Estadísticas', hint: 'S' },
  { path: 'settings', label: 'Ajustes', hint: ',' },
]

/** «12 abiertas» / «1 abierta». */
const openLabel = (count = 0) => `${count} ${count === 1 ? 'abierta' : 'abiertas'}`

/** Lista «// proyectos»: el proyecto abierto se despliega con sus secciones, los demás son un enlace. */
export function SidebarProjects({ slug, currentProjectId, collapsed }) {
  const { data: projects = [] } = useProjects(slug)
  const [createOpen, setCreateOpen] = useState(false)
  // Solo el project manager crea proyectos
  const canCreate = isManager(useWorkspace(slug).data?.myRole)

  return (
    <div className="flex flex-col gap-0.5">
      {!collapsed && (
        <div className="flex min-h-7.5 items-center justify-between pr-1 pb-1.5 pl-2.5">
          <span className="font-mono text-[11px] text-sidebar-muted">// proyectos</span>
          {canCreate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-sidebar-muted hover:bg-sidebar-accent"
                  onClick={() => setCreateOpen(true)}
                  aria-label="Nuevo proyecto"
                >
                  <Plus className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Nuevo proyecto</TooltipContent>
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
              iconNode={<ProjectIcon project={project} className={collapsed ? 'max-w-11 truncate' : undefined} />}
              label={project.name}
              meta={project.openIssueCount > 0 ? openLabel(project.openIssueCount) : undefined}
              collapsed={collapsed}
            />
          )
        }
        return <CurrentProject key={project.id} slug={slug} project={project} base={base} />
      })}
      {canCreate && <CreateProjectDialog slug={slug} open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  )
}

/**
 * Proyecto abierto con sus secciones. A la derecha de cada una va un dato útil:
 * tareas abiertas, el ciclo en curso y los módulos sin terminar.
 */
function CurrentProject({ slug, project, base }) {
  const { data: cycles } = usePlanningList('cycles', slug, project.id)
  const { data: modules } = usePlanningList('modules', slug, project.id)
  const currentCycle = cycles?.find((cycle) => cycle.status === 'CURRENT')
  const activeModules = modules?.filter((module) => module.progress.percentage < 100).length ?? 0

  const meta = {
    issues: openLabel(project.openIssueCount),
    cycles: currentCycle?.name,
    modules: activeModules > 0 ? `${activeModules} ${activeModules === 1 ? 'activo' : 'activos'}` : undefined,
  }

  return (
    <div className="tf-pop rounded-[14px] bg-sidebar-accent p-1.5">
      <NavLink to={`${base}/issues`} className="flex items-center gap-2 px-1.5 py-1.5 text-sm font-semibold text-sidebar-foreground">
        <ProjectIcon project={project} />
        <span className="min-w-0 flex-1 truncate">{project.name}</span>
      </NavLink>
      <div className="mt-0.5 flex flex-col gap-0.5">
        {PROJECT_SECTIONS.map((section) => (
          <SidebarLink
            key={section.path}
            to={`${base}/${section.path}`}
            label={section.label}
            meta={meta[section.path]}
            title={`${section.label} · atajo ${section.hint}`}
            className="h-8 pl-3 hover:bg-sidebar-active/60"
          />
        ))}
      </div>
    </div>
  )
}
