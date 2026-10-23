import { useState } from 'react'
import { ChevronRight, CircleDot, Layers, Plus, RefreshCcw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CreateProjectDialog } from '@/features/projects/components/CreateProjectDialog'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { cn } from '@/lib/utils'
import { SidebarLink } from './Sidebar'

/** Lista de proyectos del workspace con sus secciones (Issues, Ciclos, Módulos, Ajustes). */
export function SidebarProjects({ slug, currentProjectId, collapsed }) {
  const { data: projects = [] } = useProjects(slug)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-xs font-medium text-muted-foreground">Proyectos</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground"
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
      {projects.map((project) => (
        <SidebarProject
          key={project.id}
          slug={slug}
          project={project}
          collapsed={collapsed}
          defaultOpen={project.id === currentProjectId}
        />
      ))}
      <CreateProjectDialog slug={slug} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function SidebarProject({ slug, project, collapsed, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const base = `/${slug}/projects/${project.id}`

  if (collapsed) {
    return (
      <SidebarLink
        to={`${base}/issues`}
        iconNode={<ProjectIcon project={project} className="size-5 text-[10px]" />}
        label={project.name}
        collapsed
      />
    )
  }

  return (
    <Collapsible open={open || defaultOpen} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/90 hover:bg-sidebar-accent">
        <ProjectIcon project={project} className="size-5 text-[10px]" />
        <span className="min-w-0 flex-1 truncate text-left">{project.name}</span>
        <ChevronRight
          className={cn('size-3.5 text-muted-foreground transition-transform', (open || defaultOpen) && 'rotate-90')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 py-0.5 pl-5">
        <SidebarLink to={`${base}/issues`} icon={CircleDot} label="Issues" />
        <SidebarLink to={`${base}/cycles`} icon={RefreshCcw} label="Ciclos" />
        <SidebarLink to={`${base}/modules`} icon={Layers} label="Módulos" />
        <SidebarLink to={`${base}/settings`} icon={Settings} label="Ajustes" />
      </CollapsibleContent>
    </Collapsible>
  )
}
