import { useState } from 'react'
import { Link } from 'react-router'
import { FolderClosed, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarStack } from '@/components/common/AvatarStack'
import { EmptyState, ErrorState } from '@/components/common/States'
import { CreateProjectDialog } from '@/features/projects/components/CreateProjectDialog'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { t, tn } from '@/i18n'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatShortDate } from '@/lib/dates'
import { workspacePath } from '@/lib/paths'
import { can } from '@/lib/permissions'
import { useCurrentWorkspace, useMembers } from '../hooks'

/** Inicio del workspace: sus proyectos como tarjetas. */
export function WorkspaceHomePage() {
  const workspace = useCurrentWorkspace()
  const { data: projects, isLoading, error, refetch } = useProjects(workspace.slug)
  const { data: members } = useMembers(workspace.slug)
  const [createOpen, setCreateOpen] = useState(false)
  // Crear proyectos va por permiso
  const canManage = can(workspace, 'PROJECT_CREATE')

  const count = projects?.length ?? 0
  const people = members?.length ?? 0

  return (
    <>
      <PageHeader
        path={[...workspacePath(workspace), { label: t('proyectos') }]}
        title={t('Proyectos')}
        documentTitle={[t('Proyectos'), workspace.name]}
        description={
          projects && (
            <>
              {tn(count, '{count} proyecto', '{count} proyectos')}
              {members && ` · ${tn(people, '{count} persona en el equipo', '{count} personas en el equipo')}`}
            </>
          )
        }
        actions={
          canManage && (
            <Button className="h-10 rounded-xl px-3.5" onClick={() => setCreateOpen(true)}>
              <Plus strokeWidth={3} />
              {t('Nuevo proyecto')}
            </Button>
          )
        }
      />
      <PageBody>
        {isLoading && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-44 rounded-2xl" />
            ))}
          </div>
        )}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {count === 0 && projects && (
          <EmptyState
            icon={FolderClosed}
            title={t('Todavía no hay proyectos')}
            description={
              canManage
                ? t('Crea el primer proyecto para empezar a organizar las tareas del equipo.')
                : t('Todavía no estás en ningún proyecto. Pide al project manager que te agregue a uno.')
            }
            action={
              canManage && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus />
                  {t('Crear proyecto')}
                </Button>
              )
            }
          />
        )}
        {count > 0 && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} slug={workspace.slug} project={project} />
            ))}
            {canManage && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex min-h-44 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-dash text-muted-foreground transition-colors duration-200 hover:border-foreground/40 hover:bg-card/50 hover:text-foreground"
              >
                <span className="flex size-9 items-center justify-center rounded-xl border bg-card">
                  <Plus className="size-4" />
                </span>
                <span className="font-semibold text-foreground">{t('Nuevo proyecto')}</span>
                <span className="font-mono text-xs">{t('crea sus estados por defecto')}</span>
              </button>
            )}
          </div>
        )}
      </PageBody>
      {canManage && <CreateProjectDialog slug={workspace.slug} open={createOpen} onOpenChange={setCreateOpen} />}
    </>
  )
}

/** Los miembros vienen en el proyecto: los primeros (`members`) y cuántos son (`memberCount`). */
function ProjectCard({ slug, project }) {
  const members = project.members ?? []
  const total = project.issueCount ?? 0
  const open = project.openIssueCount ?? 0

  return (
    <Link
      to={`/${slug}/projects/${project.id}/issues`}
      className="group flex flex-col gap-3.5 rounded-2xl border bg-card p-5 transition-[box-shadow,border-color] duration-200 hover:border-dash hover:shadow-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-center gap-3">
        <ProjectIcon project={project} variant="soft" className="h-11 min-w-11 rounded-xl px-2 text-[13px]" />
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold">{project.name}</h2>
          <p className="font-mono text-xs text-muted-foreground">
            {tn(total, '{count} tarea', '{count} tareas')} · {tn(open, '{count} abierta', '{count} abiertas')}
          </p>
        </div>
      </div>
      <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{project.description || t('Sin descripción')}</p>
      <div className="mt-auto flex items-center gap-3">
        {members.length > 0 && <AvatarStack users={members} total={project.memberCount} size="sm" max={4} />}
        <span className="font-mono text-[11px] text-muted-foreground">{t('creado el {date}', { date: formatShortDate(project.createdAt) })}</span>
      </div>
    </Link>
  )
}
