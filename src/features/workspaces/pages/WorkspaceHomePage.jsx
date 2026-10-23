import { useState } from 'react'
import { Link } from 'react-router'
import { FolderKanban, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common/States'
import { CreateProjectDialog } from '@/features/projects/components/CreateProjectDialog'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatShortDate } from '@/lib/dates'
import { isAdminRole } from '@/lib/permissions'
import { useCurrentWorkspace } from '../hooks'

/** Inicio del workspace: sus proyectos. */
export function WorkspaceHomePage() {
  const workspace = useCurrentWorkspace()
  const { data: projects, isLoading, error, refetch } = useProjects(workspace.slug)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: workspace.name }, { label: 'Proyectos' }]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            Nuevo proyecto
          </Button>
        }
      />
      <PageBody>
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-32 rounded-xl" />
              ))}
            </div>
          )}
          {error && <ErrorState error={error} onRetry={refetch} />}
          {projects?.length === 0 && (
            <EmptyState
              icon={FolderKanban}
              title="Todavía no hay proyectos"
              description={
                isAdminRole(workspace.myRole)
                  ? 'Crea el primer proyecto para empezar a organizar las tareas del equipo.'
                  : 'Crea un proyecto o pide a un administrador que te agregue a uno existente.'
              }
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus />
                  Crear proyecto
                </Button>
              }
            />
          )}
          {projects?.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link key={project.id} to={`/${workspace.slug}/projects/${project.id}/issues`} className="group">
                  <Card className="h-full gap-3 p-5 transition-colors group-hover:border-primary/50 group-hover:bg-accent/40">
                    <div className="flex items-center gap-3">
                      <ProjectIcon project={project} className="size-9 text-sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{project.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{project.identifier}</p>
                      </div>
                    </div>
                    <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                      {project.description || 'Sin descripción'}
                    </p>
                    <p className="text-xs text-muted-foreground">Creado el {formatShortDate(project.createdAt)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </PageBody>
      <CreateProjectDialog slug={workspace.slug} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
