import { useState } from 'react'
import { Link } from 'react-router'
import { FolderClosed, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarStack } from '@/components/common/AvatarStack'
import { EmptyState, ErrorState } from '@/components/common/States'
import { CreateProjectDialog } from '@/features/projects/components/CreateProjectDialog'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjectMembers, useProjects } from '@/features/projects/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatShortDate } from '@/lib/dates'
import { workspacePath } from '@/lib/paths'
import { isAdminRole } from '@/lib/permissions'
import { useCurrentWorkspace, useMembers } from '../hooks'

/** Inicio del workspace: sus proyectos como tarjetas. */
export function WorkspaceHomePage() {
  const workspace = useCurrentWorkspace()
  const { data: projects, isLoading, error, refetch } = useProjects(workspace.slug)
  const { data: members } = useMembers(workspace.slug)
  const [createOpen, setCreateOpen] = useState(false)

  const count = projects?.length ?? 0
  const people = members?.length ?? 0

  return (
    <>
      <PageHeader
        path={[...workspacePath(workspace), { label: 'proyectos' }]}
        title="Proyectos"
        documentTitle={['Proyectos', workspace.name]}
        description={
          projects && (
            <>
              {count} {count === 1 ? 'proyecto' : 'proyectos'}
              {members && ` · ${people} ${people === 1 ? 'persona' : 'personas'} en el equipo`}
            </>
          )
        }
        actions={
          <Button className="h-10 rounded-xl px-3.5" onClick={() => setCreateOpen(true)}>
            <Plus strokeWidth={3} />
            Nuevo proyecto
          </Button>
        }
      />
      <PageBody>
        {isLoading && (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-44 rounded-2xl" />
            ))}
          </div>
        )}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {count === 0 && projects && (
          <EmptyState
            icon={FolderClosed}
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
        {count > 0 && (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} slug={workspace.slug} project={project} />
            ))}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex min-h-44 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-dash text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <span className="flex size-9 items-center justify-center rounded-xl border bg-card">
                <Plus className="size-4" />
              </span>
              <span className="font-semibold text-foreground">Nuevo proyecto</span>
              <span className="font-mono text-xs">crea sus estados por defecto</span>
            </button>
          </div>
        )}
      </PageBody>
      <CreateProjectDialog slug={workspace.slug} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

function ProjectCard({ slug, project }) {
  const { data: members = [] } = useProjectMembers(slug, project.id)
  const total = project.issueCount ?? 0
  const open = project.openIssueCount ?? 0

  return (
    <Link
      to={`/${slug}/projects/${project.id}/issues`}
      className="group flex flex-col gap-3.5 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start gap-3">
        <ProjectIcon project={project} className="h-7 rounded-lg px-2 text-xs" />
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold">{project.name}</h2>
          <p className="font-mono text-xs text-muted-foreground">
            {total} {total === 1 ? 'tarea' : 'tareas'} · {open} {open === 1 ? 'abierta' : 'abiertas'}
          </p>
        </div>
      </div>
      <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{project.description || 'Sin descripción'}</p>
      <div className="mt-auto flex items-center gap-3">
        {members.length > 0 && <AvatarStack users={members.map((member) => member.user)} size="sm" max={4} />}
        <span className="font-mono text-[11px] text-muted-foreground">creado el {formatShortDate(project.createdAt)}</span>
        <span className="ml-auto text-sm font-semibold text-accent-text group-hover:underline">Abrir →</span>
      </div>
    </Link>
  )
}
