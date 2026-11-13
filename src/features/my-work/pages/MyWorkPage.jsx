import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CircleCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { DueChip } from '@/components/common/DueChip'
import { Segmented } from '@/components/common/Segmented'
import { EmptyState, ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { IssueTypeIcon } from '@/features/issues/components/IssueTypeBits'
import { BlockedChip } from '@/features/issues/components/IssueBadges'
import { PriorityChip, PriorityIcon } from '@/features/issues/components/PriorityIcon'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { t, tn, tx } from '@/i18n'
import { describeDueDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { countByPriority, countByProject } from '../breakdown'
import { groupByDue } from '../groupByDue'
import { useShownKey } from '@/hooks/useShownKey'
import { useMyWork } from '../hooks'
import { startedCounts } from '../weekSummary'

/** Las tres vistas: qué tareas muestra cada una, su contador y sus textos. */
const VIEWS = {
  assigned: {
    label: t('Asignadas'),
    countKey: 'assignedCount',
    summary: (count) => (count ? tn(count, '{count} tarea asignada a ti', '{count} tareas asignadas a ti') : t('Ninguna tarea asignada a ti')),
    emptyTitle: t('No tienes tareas asignadas abiertas'),
    emptyDescription: t('Cuando alguien te asigne una tarea aparecerá aquí, ordenada por fecha límite.'),
  },
  created: {
    label: t('Creadas por mí'),
    // En el teléfono las tres pestañas caben en una línea con la etiqueta corta
    shortLabel: t('Creadas'),
    countKey: 'createdCount',
    summary: (count) =>
      count ? tn(count, '{count} tarea abierta creada por ti', '{count} tareas abiertas creadas por ti') : t('Ninguna tarea abierta creada por ti'),
    emptyTitle: t('Ninguna tarea abierta creada por ti'),
    emptyDescription: t('Las tareas que crees y sigan abiertas aparecerán aquí.'),
  },
  commented: {
    label: t('Comentadas'),
    countKey: 'commentedCount',
    summary: (count) =>
      count
        ? tn(count, '{count} tarea abierta en las que comentaste', '{count} tareas abiertas en las que comentaste')
        : t('Ninguna tarea abierta en la que comentaste'),
    emptyTitle: t('Sin tareas comentadas abiertas'),
    emptyDescription: t('Las tareas abiertas en las que dejes un comentario aparecerán aquí.'),
  },
}

/**
 * Tareas abiertas del usuario en todos sus proyectos, agrupadas por fecha límite. En pantallas anchas (desde 1440 px) la lista ocupa
 * todo el ancho y a la derecha va un panel con la semana y el reparto por proyecto y prioridad; en una ventana
 * angosta, la semana va como una franja arriba.
 */
export function MyWorkPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = VIEWS[searchParams.get('view')] ? searchParams.get('view') : 'assigned'
  const { data, isLoading, isPlaceholderData, error, refetch } = useMyWork(slug, view)
  // La vista de lo que se ve: al cambiar de pestaña sigue la anterior (atenuada) hasta que llega la nueva
  const shownView = useShownKey(view, isPlaceholderData)
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
  // «3 tareas asignadas a ti en 2 proyectos»: la frase de la vista y, si hay tareas, en cuántos proyectos
  const summary = config.summary(data?.[config.countKey] ?? 0)
  const summaryWithProjects =
    projectCount > 0 ? tn(projectCount, '{summary} en {count} proyecto', '{summary} en {count} proyectos', { summary }) : summary

  return (
    <>
      <PageHeader
        path={[{ label: '~' }, { label: t('mi-trabajo') }]}
        title={t('Mi trabajo')}
        description={
          data && (
            <>
              {summaryWithProjects}
              {overdue > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-late">{tn(overdue, '{count} vencida', '{count} vencidas')}</span>
                </>
              )}
            </>
          )
        }
        actions={
          <Segmented
            label={t('Qué tareas ver')}
            // En el teléfono las tres pestañas caben en una línea con menos relleno
            itemClassName="whitespace-nowrap px-2.5 text-[13px] sm:px-3.5 sm:text-sm"
            value={view}
            onChange={(value) => setSearchParams(value === 'assigned' ? {} : { view: value }, { replace: true })}
            options={Object.entries(VIEWS).map(([value, item]) => ({
              value,
              label: (
                <>
                  {item.shortLabel ? (
                    <>
                      <span className="sm:hidden">{item.shortLabel}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </>
                  ) : (
                    item.label
                  )}
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
          <div className="flex flex-col gap-3.5 min-[1440px]:flex-row min-[1440px]:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            <WeekStrip slug={slug} data={data} className="min-[1440px]:hidden" />
            {issues.length === 0 && (
              <EmptyState
                key={`vacio-${shownView}`}
                icon={CircleCheck}
                title={VIEWS[shownView].emptyTitle}
                description={VIEWS[shownView].emptyDescription}
                className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}
              />
            )}
            <div
              key={shownView}
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
                      <MyWorkRow
                        key={issue.id}
                        slug={slug}
                        issue={issue}
                        project={projectsById.get(issue.projectId) ?? issue.project}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
          <MyWorkAside slug={slug} data={data} issues={issues} projectsById={projectsById} listLabel={config.label} />
          </div>
        )}
      </PageBody>
    </>
  )
}

/**
 * Panel lateral (pantallas anchas): «Tu semana» con los contadores de las tareas asignadas y la próxima fecha, y el
 * reparto de la lista que se ve por proyecto y por prioridad.
 */
function MyWorkAside({ slug, data, issues, projectsById, listLabel }) {
  const completed = data.completedThisWeek ?? 0
  const numbers = [{ key: 'completed', count: completed, label: completed === 1 ? t('cerrada') : t('cerradas') }, ...startedCounts(data.byState)]
  const byProject = countByProject(issues, projectsById)
  const byPriority = countByPriority(issues)
  const next = data.nextDue

  return (
    <aside aria-label={t('Resumen')} className="hidden w-[340px] shrink-0 flex-col gap-3.5 min-[1440px]:flex min-[1680px]:w-[380px]">
      <section className="tf-panel flex flex-col gap-3 px-4.5 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold">{t('Tu semana')}</h2>
          <span className="font-mono text-[11px] text-muted-foreground">{t('tareas asignadas')}</span>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {numbers.map((item) => (
            <div key={item.key} className="min-w-0">
              <dt className="truncate font-mono text-[11px] text-muted-foreground" title={item.label}>
                {item.label}
              </dt>
              <dd className="mt-0.5 font-display text-[26px] leading-tight font-extrabold">{item.count}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-dashed pt-3 text-[13px] text-muted-foreground">
          <NextDue slug={slug} next={next} />
        </p>
      </section>

      {byProject.length > 0 && (
        <BreakdownPanel
          title={t('Por proyecto')}
          meta={listLabel.toLowerCase()}
          rows={byProject.map((row) => ({
            key: row.projectId,
            count: row.count,
            label: (
              <>
                {row.project && <ProjectIcon project={row.project} />}
                <span className="truncate">{row.name}</span>
              </>
            ),
            to: `/${slug}/projects/${row.projectId}/issues`,
          }))}
        />
      )}
      {byPriority.length > 0 && (
        <BreakdownPanel
          title={t('Por prioridad')}
          meta={listLabel.toLowerCase()}
          rows={byPriority.map((row) => ({
            key: row.priority,
            count: row.count,
            label: (
              <>
                <PriorityIcon priority={row.priority} />
                <span className="truncate">{row.label}</span>
              </>
            ),
          }))}
        />
      )}
    </aside>
  )
}

/** Tarjeta con una fila por valor y su cantidad («Por proyecto», «Por prioridad»); con `to`, la fila lleva a ese sitio. */
function BreakdownPanel({ title, meta, rows }) {
  return (
    <section className="tf-panel flex flex-col gap-2.5 px-4.5 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <span className="font-mono text-[11px] text-muted-foreground">{meta}</span>
      </div>
      {rows.map((row) => {
        const content = (
          <>
            <span className="flex min-w-0 items-center gap-2">{row.label}</span>
            <span className="shrink-0 font-mono text-muted-foreground">{row.count}</span>
          </>
        )
        return row.to ? (
          <Link
            key={row.key}
            to={row.to}
            className="-mx-1.5 flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-[13px] transition-colors hover:bg-subtle"
          >
            {content}
          </Link>
        ) : (
          <div key={row.key} className="flex items-center justify-between gap-2 py-1 text-[13px]">
            {content}
          </div>
        )
      })}
    </section>
  )
}

/**
 * «// tu semana  4 cerradas  2 en curso  1 en revisión · Próxima fecha: mañana · WEB-19». Habla siempre de las
 * tareas asignadas, sea cual sea la vista; cada estado «en curso» lleva su propio nombre.
 */
function WeekStrip({ slug, data, className }) {
  const next = data.nextDue
  const completed = data.completedThisWeek ?? 0
  const stats = [
    { key: 'completed', count: completed, label: completed === 1 ? t('cerrada') : t('cerradas') },
    ...startedCounts(data.byState),
  ]

  return (
    <section
      aria-label={t('Tu semana')}
      className={cn('flex flex-wrap items-center gap-x-5.5 gap-y-2 rounded-2xl border border-dashed border-dash px-4.5 py-3', className)}
    >
      <span className="font-mono text-[11px] text-muted-foreground">{t('// tu semana')}</span>
      {stats.map((item) => (
        <span key={item.key} className="tf-pop flex items-baseline gap-1.5">
          <strong className="font-display text-[22px] leading-none font-extrabold">{item.count}</strong>
          <span className="text-[13px] text-muted-foreground">{item.label}</span>
        </span>
      ))}
      <span className="text-[13px] text-muted-foreground sm:ml-auto">
        <NextDue slug={slug} next={next} />
      </span>
    </section>
  )
}

/** «Próxima fecha: mañana · WEB-19» (o «ninguna»): la tarea asignada que vence antes, con enlace. */
function NextDue({ slug, next }) {
  if (!next?.dueDate) {
    return tx('Próxima fecha: {date}', { date: <strong className="font-semibold text-foreground">{t('ninguna')}</strong> })
  }
  return tx('Próxima fecha: {date} · {task}', {
    date: <strong className="font-semibold text-foreground">{describeDueDate(next.dueDate).text}</strong>,
    task: (
      <Link
        to={`/${slug}/projects/${next.project?.id}/issues?issue=${next.id}`}
        className="font-mono hover:text-foreground hover:underline"
        title={next.title}
      >
        {next.code}
      </Link>
    ),
  })
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
        <IssueTypeIcon issue={issue} size={14} />
        {project && <ProjectIcon project={project} />}
        <span className="min-w-14 shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{issue.code}</span>
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
    <div className="flex flex-col gap-3.5" aria-label={t('Cargando tareas')}>
      <Skeleton className="h-14 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  )
}
