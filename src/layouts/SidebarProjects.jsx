import { useState } from 'react'
import { NavLink } from 'react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CreateProjectDialog } from '@/features/projects/components/CreateProjectDialog'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { SidebarLink } from './Sidebar'

/** Secciones de un proyecto con su atajo de teclado (ver ProjectLayout). */
export const PROJECT_SECTIONS = [
  { path: 'issues', label: 'Tareas', hint: 'I' },
  { path: 'cycles', label: 'Ciclos', hint: 'Y' },
  { path: 'modules', label: 'Módulos', hint: 'M' },
  { path: 'settings', label: 'Ajustes', hint: ',' },
]

/** Lista «// proyectos»: el proyecto abierto se despliega con sus secciones, los demás son un enlace. */
export function SidebarProjects({ slug, currentProjectId, collapsed }) {
  const { data: projects = [] } = useProjects(slug)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex flex-col gap-0.5">
      {!collapsed && (
        <div className="flex items-center justify-between pr-1 pb-1.5 pl-2.5">
          <span className="font-mono text-[11px] text-sidebar-muted">// proyectos</span>
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
        </div>
      )}
      {projects.map((project) => {
        const base = `/${slug}/projects/${project.id}`
        if (collapsed || project.id !== currentProjectId) {
          return (
            <SidebarLink
              key={project.id}
              to={`${base}/issues`}
              iconNode={<ProjectIcon project={project} className={collapsed ? 'max-w-11 truncate' : undefined} />}
              label={project.name}
              collapsed={collapsed}
            />
          )
        }
        return (
          <div key={project.id} className="rounded-[14px] bg-sidebar-accent p-1.5">
            <NavLink
              to={`${base}/issues`}
              className="flex items-center gap-2 px-1.5 py-1.5 text-sm font-semibold text-sidebar-foreground"
            >
              <ProjectIcon project={project} />
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
            </NavLink>
            <div className="mt-0.5 flex flex-col gap-0.5">
              {PROJECT_SECTIONS.map((section) => (
                <SidebarLink
                  key={section.path}
                  to={`${base}/${section.path}`}
                  label={section.label}
                  hint={section.hint}
                  className="h-8 pl-3"
                />
              ))}
            </div>
          </div>
        )
      })}
      <CreateProjectDialog slug={slug} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
