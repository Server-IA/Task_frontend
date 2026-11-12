import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { History } from 'lucide-react'
import { GithubIcon } from '@/components/common/BrandIcons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/common/Loaders'
import { Segmented } from '@/components/common/Segmented'
import { EmptyState, ErrorState } from '@/components/common/States'
import { UserAvatar } from '@/components/common/UserAvatar'
import { activityActorName, activityAutoMark, describeFeedEntry } from '@/features/comments/describeActivity'
import { FeedFileCard } from '@/features/files/components/FeedFileCard'
import { markdownToPlainText } from '@/features/editor/markdown/plainText'
import { MentionText } from '@/features/mentions/MentionText'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { useCurrentWorkspace, useMembers } from '@/features/workspaces/hooks'
import { stateName, t, tc, tn, tx } from '@/i18n'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatDateTime, formatRelative, groupByDay } from '@/lib/dates'
import { flattenUniquePages } from '@/lib/pagination'
import { workspacePath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { SingleFilter } from '@/components/common/SingleFilter'
import { useActivitySummary, useStateGroups, useWorkspaceActivity } from '../hooks'

const TYPES = [
  { value: 'all', label: tc('filtro', 'Todo') },
  { value: 'state', label: t('Estados') },
  { value: 'comments', label: t('Comentarios') },
  { value: 'assignments', label: t('Asignaciones') },
]

/** Fondo y texto de la marca sobre el avatar según el tono de la entrada. */
const MARK_TONES = {
  neutral: 'bg-muted text-muted-foreground',
  accent: 'bg-accent-soft text-accent-text',
  ok: 'bg-ok-soft text-ok',
}

/** Actividad del workspace: qué pasó en las tareas de todos los proyectos, con filtros y resumen de la semana. */
export function ActivityPage() {
  const workspace = useCurrentWorkspace()
  const slug = workspace.slug
  const [searchParams, setSearchParams] = useSearchParams()
  const type = TYPES.some((option) => option.value === searchParams.get('type')) ? searchParams.get('type') : 'all'
  const projectId = searchParams.get('project') ?? undefined
  const actorId = searchParams.get('person') ?? undefined
  const filters = useMemo(() => ({ type, projectId, actorId }), [type, projectId, actorId])

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useWorkspaceActivity(slug, filters)
  const { data: projects = [] } = useProjects(slug)
  const { data: members = [] } = useMembers(slug)
  const entries = useMemo(() => flattenUniquePages(data), [data])
  const days = groupByDay(entries, (entry) => entry.createdAt)
  const feedProjectIds = useMemo(() => [...new Set(entries.map((entry) => entry.project?.id).filter(Boolean))], [entries])
  const stateGroups = useStateGroups(slug, feedProjectIds)
  const hasFilters = Boolean(projectId || actorId)

  /**
   * Cambia un parámetro de la URL (null lo quita); así un enlace comparte la misma vista. Cada filtro queda en el
   * historial: «Atrás» lo deshace en vez de salir de la página.
   */
  const setParam = (key, value) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value && !(key === 'type' && value === 'all')) next.set(key, value)
      else next.delete(key)
      return next
    })

  return (
    <>
      <PageHeader
        path={[...workspacePath(workspace), { label: t('actividad') }]}
        title={t('Actividad')}
        documentTitle={[t('Actividad'), workspace.name]}
        description={t('Lo que pasó en el workspace: cambios de estado, asignaciones, comentarios y tareas nuevas.')}
        actions={
          <Segmented
            label={t('Tipo')}
            itemClassName="whitespace-nowrap px-2.5 text-[13px] sm:px-3"
            value={type}
            onChange={(value) => setParam('type', value)}
            options={TYPES}
          />
        }
      />
      <div className="flex flex-wrap items-center gap-2 px-1">
        <SingleFilter
          title={t('proyecto')}
          removeLabel={t('Quitar filtro de proyecto')}
          searchPlaceholder={t('Filtrar por proyecto…')}
          value={projectId}
          onChange={(value) => setParam('project', value)}
          options={projects.map((project) => ({
            value: project.id,
            label: project.name,
            keywords: project.identifier,
            icon: <ProjectIcon project={project} />,
          }))}
        />
        <SingleFilter
          title={t('persona')}
          removeLabel={t('Quitar filtro de persona')}
          searchPlaceholder={t('Filtrar por persona…')}
          value={actorId}
          onChange={(value) => setParam('person', value)}
          options={members.map((member) => ({
            value: member.user.id,
            label: member.user.fullName,
            short: member.user.fullName.split(' ')[0],
            keywords: member.user.email,
            icon: <UserAvatar user={member.user} size="xs" />,
          }))}
        />
      </div>

      <PageBody>
        <div className="flex flex-wrap items-start gap-3.5">
          <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-2.5">
            {isLoading && <FeedSkeleton />}
            {error && <ErrorState error={error} onRetry={refetch} homeLink={`/${slug}`} />}
            {!isLoading && !error && entries.length === 0 && (
              <EmptyState
                icon={History}
                title={hasFilters || type !== 'all' ? t('Nada con estos filtros') : t('Todavía no hay actividad')}
                description={
                  hasFilters || type !== 'all'
                    ? t('Prueba con otro tipo, proyecto o persona.')
                    : t('Cuando el equipo cree, mueva o comente tareas, aparecerá aquí.')
                }
                action={
                  hasFilters && (
                    <Button variant="outline" onClick={() => setSearchParams(type === 'all' ? {} : { type })}>
                      {t('Quitar filtros')}
                    </Button>
                  )
                }
              />
            )}
            {days.map((day) => (
              <section key={day.label} aria-label={day.label} className="flex flex-col gap-1.5">
                <h2 className="mx-1 mt-1 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {day.label}
                </h2>
                <ol className="tf-enter rounded-2xl border bg-card py-1.5">
                  {day.items.map((entry) => (
                    <FeedEntry
                      key={entry.id}
                      slug={slug}
                      entry={entry}
                      stateGroup={stateGroups.get(`${entry.project?.id}:${entry.newValue}`)}
                    />
                  ))}
                </ol>
              </section>
            ))}
            {hasNextPage && (
              <Button variant="outline" className="self-center" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage && <Spinner />}
                {t('Cargar más')}
              </Button>
            )}
          </div>

          <WeekSummary slug={slug} selectedProjectId={projectId} onSelectProject={(id) => setParam('project', id)} />
        </div>
      </PageBody>
    </>
  )
}

/**
 * Una entrada: avatar con la marca del tipo, frase legible, «de → a» en los cambios de estado,
 * el comentario citado, el archivo adjuntado y, abajo, el proyecto y cuándo.
 * @param {{ slug: string, entry: import('@/api/types').ActivityFeedItem, stateGroup?: string }} props
 */
function FeedEntry({ slug, entry, stateGroup }) {
  const sentence = describeFeedEntry(entry, { stateGroup })
  const { issue, project } = entry
  const issueUrl = project && issue ? `/${slug}/projects/${project.id}/issues?issue=${issue.id}` : null

  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <span className="relative shrink-0">
        {activityAutoMark(entry) === 'GH' ? (
          // Pasó en GitHub
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <GithubIcon className="size-4.5" />
          </span>
        ) : activityAutoMark(entry) ? (
          // Lo hizo TaskFlow (sin autor)
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-primary-foreground">
            TF
          </span>
        ) : (
          <UserAvatar user={entry.actor} size="md" />
        )}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full border-2 border-card font-mono text-[9px] font-bold',
            MARK_TONES[sentence.tone],
          )}
        >
          {sentence.mark}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="leading-normal break-words">
          <span className="font-semibold">{activityActorName(entry)}</span> {sentence.verb}{' '}
          {issueUrl ? (
            <Link to={issueUrl} className="group/issue hover:underline">
              <span className="font-mono text-[13px] text-accent-text">{issue.code}</span> {issue.title}
            </Link>
          ) : (
            <span className="text-muted-foreground">{t('una tarea eliminada')}</span>
          )}
          {sentence.suffix && ` ${sentence.suffix}`}
        </p>
        {sentence.change && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground line-through">{stateName(sentence.change.from)}</span>
            <span aria-label={tc('cambio', 'a')} className="text-muted-foreground">
              →
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-semibold',
                sentence.change.done ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent-text',
              )}
            >
              {stateName(sentence.change.to)}
            </span>
          </p>
        )}
        {sentence.file && entry.file && <FeedFileCard file={entry.file} className="mt-1.5" />}
        {sentence.quote && (
          <blockquote className="mt-1.5 rounded-[10px] bg-muted px-2.5 py-2 leading-normal break-words text-muted-foreground">
            {/* El comentario se guarda en Markdown: aquí, sin «**», «##» ni listas, en una línea */}
            {tx('«{quote}»', { quote: <MentionText body={markdownToPlainText(sentence.quote, { mentionTokens: true })} /> })}
          </blockquote>
        )}
        <p className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          {project && <ProjectIcon project={project} />}
          <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>
            {formatRelative(entry.createdAt)}
          </time>
        </p>
      </div>
    </li>
  )
}

/** Columna «Esta semana»: números de los últimos 7 días y cambios por proyecto (clic = filtrar). */
function WeekSummary({ slug, selectedProjectId, onSelectProject }) {
  const { data: summary, isLoading } = useActivitySummary(slug, 7)
  const byProject = [...(summary?.byProject ?? [])].sort((a, b) => b.count - a.count)
  const numbers = summary
    ? [
        [t('cambios'), summary.changes],
        [t('comentarios'), summary.comments],
        [t('cerradas'), summary.completed],
        [t('creadas'), summary.created],
      ]
    : []

  return (
    <aside aria-label={t('Resumen de la semana')} className="flex min-w-0 flex-[1_1_240px] flex-col gap-3.5">
      <section className="tf-panel flex flex-col gap-3 px-4.5 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold">{t('Esta semana')}</h2>
          <span className="font-mono text-[11px] text-muted-foreground">{t('últimos 7 días')}</span>
        </div>
        {isLoading ? (
          <Skeleton className="h-28 rounded-xl" />
        ) : (
          <dl className="grid grid-cols-2 gap-3">
            {numbers.map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-[11px] text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-display text-[26px] leading-tight font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      {byProject.length > 0 && (
        <section className="tf-panel flex flex-col gap-2.5 px-4.5 py-4">
          <h2 className="text-[15px] font-semibold">{t('Por proyecto')}</h2>
          {byProject.map((project) => (
            <button
              key={project.projectId}
              type="button"
              aria-pressed={selectedProjectId === project.projectId}
              onClick={() => onSelectProject(selectedProjectId === project.projectId ? null : project.projectId)}
              className="-mx-1.5 flex justify-between gap-2 rounded-lg px-1.5 py-1 text-left text-[13px] transition-colors hover:bg-subtle aria-pressed:bg-accent-soft/60"
              title={t('Ver solo este proyecto')}
            >
              <span className="truncate">{project.name}</span>
              <span className="shrink-0 font-mono text-muted-foreground">
                {tn(project.count, '{count} cambio', '{count} cambios')}
              </span>
            </button>
          ))}
        </section>
      )}
    </aside>
  )
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-label={t('Cargando actividad')}>
      <Skeleton className="mx-1 h-3 w-16" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="mx-1 h-3 w-16" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  )
}
