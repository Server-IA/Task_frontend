import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CircleCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { DueChip } from '@/components/common/DueChip'
import { Segmented } from '@/components/common/Segmented'
import { EmptyState, ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { BlockedChip } from '@/features/issues/components/IssueBadges'
import { PriorityChip } from '@/features/issues/components/PriorityIcon'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { describeDueDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { groupByDue } from '../groupByDue'
import { useMyWork } from '../hooks'
import { startedCounts } from '../weekSummary'

/** Las tres vistas: qué tareas muestra cada una, su contador y sus textos. */
const VIEWS = {
  assigned: {
    label: 'Asignadas',
    countKey: 'assignedCount',
    summary: (count) => `${count} ${count === 1 ? 'tarea asignada' : 'tareas asignadas'} a ti`,
    emptyTitle: 'No tienes tareas asignadas abiertas',
    emptyDescription: 'Cuando alguien te asigne una tarea aparecerá aquí, ordenada por fecha límite.',
  },
  created: {
    label: 'Creadas por mí',
    countKey: 'createdCount',
    summary: (count) => `${count} ${count === 1 ? 'tarea abierta creada' : 'tareas abiertas creadas'} por ti`,
    emptyTitle: 'Ninguna tarea abierta creada por ti',
    emptyDescription: 'Las tareas que crees y sigan abiertas aparecerán aquí.',
  },
  commented: {
    label: 'Comentadas',
    countKey: 'commentedCount',
    summary: (count) => `${count} ${count === 1 ? 'tarea abierta' : 'tareas abiertas'} en las que comentaste`,
    emptyTitle: 'Sin tareas comentadas abiertas',
    emptyDescription: 'Las tareas abiertas en las que dejes un comentario aparecerán aquí.',
  },
}

/** Tareas abiertas del usuario en todos sus proyectos, agrupadas por fecha límite. */
export function MyWorkPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = VIEWS[searchParams.get('view')] ? searchParams.get('view') : 'assigned'
  const { data, isLoading, isPlaceholderData, error, refetch } = useMyWork(slug, view)
  const { data: projects = [] } = useProjects(slug)
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])

  const issues = useMemo(() => data?.issues ?? [], [data])
  const groups = useMemo(() => groupByDue(issues), [issues])
  // De las asignadas, vencidas y proyectos los cuenta el backend; en las otras vistas, los de la lista
  const assignedView = view === 'assigned'
  const overdue = assignedView
    ? (data?.overdueCount ?? 0)
    : (groups.find((group) => group.key === 'overdue')?.issues.length ?? 0)
  const projectCount = assignedView ? (data?.projectCount ?? 0) : new Set(issues.map((issue) => issue.projectId)).size
  const config = VIEWS[view]

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[980px] flex-1 flex-col gap-3.5">
      <PageHeader
        path={[{ label: '~' }, { label: 'mi-trabajo' }]}
        title="Mi trabajo"
        description={
          data && (
            <>
              {config.summary(data[config.countKey] ?? 0)}
              {projectCount > 0 && ` en ${projectCount} ${projectCount === 1 ? 'proyecto' : 'proyectos'}`}
              {overdue > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-late">
                    {overdue} {overdue === 1 ? 'vencida' : 'vencidas'}
                  </span>
                </>
              )}
            </>
          )
        }
        actions={
          <Segmented
            label="Qué tareas ver"
            // En el teléfono las tres pestañas caben en una línea con menos relleno
            itemClassName="whitespace-nowrap px-2.5 text-[13px] sm:px-3.5 sm:text-sm"
            value={view}
            onChange={(value) => setSearchParams(value === 'assigned' ? {} : { view: value }, { replace: true })}
            options={Object.entries(VIEWS).map(([value, item]) => ({
              value,
              label: (
                <>
                  {item.label}
                  {data && <span className="ml-1.5 font-mono">{data[item.countKey] ?? 0}</span>}
                </>
              ),
            }))}
          />
        }
      />
      <PageBody className="flex flex-col gap-3.5">
        {isLoading && <MyWorkSkeleton />}
        {error && !data && <ErrorState error={error} onRetry={refetch} homeLink={`/${slug}`} />}
        {data && (
          <>
            <WeekStrip slug={slug} data={data} />
            {issues.length === 0 && (
              <EmptyState icon={CircleCheck} title={config.emptyTitle} description={config.emptyDescription} />
            )}
            <div
              key={view}
              aria-busy={isPlaceholderData}
              className={cn('tf-fade flex flex-col gap-3.5 transition-opacity', isPlaceholderData && 'opacity-60')}
            >
              {groups.map((group) => (
                <section key={group.key} aria-label={group.label} className="overflow-hidden rounded-2xl border bg-card">
                  <header
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] uppercase',
                      group.tone === 'late' ? 'bg-late-soft text-late' : 'bg-column',
                    )}
                  >
                    <h2 className="font-semibold">{group.label}</h2>
                    <span className="text-muted-foreground">{group.issues.length}</span>
                  </header>
                  <ul>
                    {group.issues.map((issue) => (
                      <MyWorkRow key={issue.id} slug={slug} issue={issue} project={projectsById.get(issue.projectId)} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </PageBody>
    </div>
  )
}

/**
 * «// tu semana  4 cerradas  2 en curso  1 en revisión · Próxima fecha: mañana · WEB-19». Habla siempre de las
 * tareas asignadas, sea cual sea la vista; cada estado «en curso» lleva su propio nombre.
 */
function WeekStrip({ slug, data }) {
  const next = data.nextDue
  const completed = data.completedThisWeek ?? 0
  const stats = [
    { key: 'completed', count: completed, label: completed === 1 ? 'cerrada' : 'cerradas' },
    ...startedCounts(data.byState),
  ]

  return (
    <section
      aria-label="Tu semana"
      className="flex flex-wrap items-center gap-x-5.5 gap-y-2 rounded-2xl border border-dashed border-dash px-4.5 py-3"
    >
      <span className="font-mono text-[11px] text-muted-foreground">// tu semana</span>
      {stats.map((item) => (
        <span key={item.key} className="tf-pop flex items-baseline gap-1.5">
          <strong className="font-display text-[22px] leading-none font-extrabold">{item.count}</strong>
          <span className="text-[13px] text-muted-foreground">{item.label}</span>
        </span>
      ))}
      <span className="text-[13px] text-muted-foreground sm:ml-auto">
        Próxima fecha:{' '}
        {next?.dueDate ? (
          <>
            <strong className="font-semibold text-foreground">{describeDueDate(next.dueDate).text}</strong> ·{' '}
            <Link
              to={`/${slug}/projects/${next.project?.id}/issues?issue=${next.id}`}
              className="font-mono hover:text-foreground hover:underline"
              title={next.title}
            >
              {next.code}
            </Link>
          </>
        ) : (
          <strong className="font-semibold text-foreground">ninguna</strong>
        )}
      </span>
    </section>
  )
}

/** Fila de una tarea: abre el panel de detalle en la página de tareas de su proyecto. */
function MyWorkRow({ slug, issue, project }) {
  return (
    <li className="border-t">
      <Link
        to={`/${slug}/projects/${issue.projectId}/issues?issue=${issue.id}`}
        className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-4 py-2.5 transition-colors duration-150 hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none"
      >
        <StateIcon group={issue.state?.group} color={issue.state?.color} />
        {project && <ProjectIcon project={project} />}
        <span className="min-w-14 shrink-0 font-mono text-xs text-muted-foreground">{issue.code}</span>
        <span className="min-w-0 flex-[1_1_240px] truncate font-medium" title={issue.title}>
          {issue.title}
        </span>
        <BlockedChip issue={issue} />
        {issue.priority !== 'NONE' && <PriorityChip priority={issue.priority} />}
        <span className="ml-auto flex justify-end sm:ml-0 sm:w-[132px]">
          <DueChip value={issue.dueDate} />
        </span>
      </Link>
    </li>
  )
}

function MyWorkSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-label="Cargando tareas">
      <Skeleton className="h-14 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  )
}
