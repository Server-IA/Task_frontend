import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Ban, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common/States'
import { IssuePeekSheet } from '@/features/issues/components/IssuePeekSheet'
import { useIssueFilters } from '@/features/issues/useIssueFilters'
import { usePlanningList } from '@/features/planning/hooks'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { useHotkey } from '@/hooks/useHotkey'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { projectPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { DailyDateNav } from '../components/DailyDateNav'
import { DailyNoteEditor } from '../components/DailyNoteEditor'
import { DailyPersonCard } from '../components/DailyPersonCard'
import { DailyPresenter } from '../components/DailyPresenter'
import {
  blockingByPerson,
  clampIndex,
  cycleOnDate,
  dailySummary,
  issueIndex,
  parseDateParam,
  previousDayLabel,
  toIsoDay,
} from '../daily'
import { useDaily } from '../hooks'

/** Contadores del resumen «desde ayer» (solo se muestran los que no son cero). */
const SUMMARY_ITEMS = [
  ['completed', 'completada', 'completadas'],
  ['moved', 'movida', 'movidas'],
  ['created', 'creada', 'creadas'],
  ['commented', 'comentada', 'comentadas'],
  ['updated', 'actualizada', 'actualizadas'],
]

/**
 * Daily del proyecto: por persona, lo que hizo el día hábil anterior, lo de hoy y sus bloqueos, más la nota
 * del día. «Presentar» muestra una persona a la vez con un tiempo sugerido. La fecha va en `?date=`.
 */
export function DailyPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const [searchParams, setSearchParams] = useSearchParams()
  const today = toIsoDay(new Date())
  const date = parseDateParam(searchParams.get('date')) ?? today
  const fixedDate = date > today ? today : date
  const { data: daily, isLoading, isPlaceholderData, error, refetch } = useDaily(workspace.slug, project.id, fixedDate)
  const { data: cycles } = usePlanningList('cycles', workspace.slug, project.id)
  const issueFilters = useIssueFilters()
  const [presenting, setPresenting] = useState(false)
  const [current, setCurrent] = useState(0)

  const people = useMemo(() => daily?.people ?? [], [daily])
  const index = useMemo(() => issueIndex(people), [people])
  const blocking = useMemo(() => blockingByPerson(people), [people])
  const summary = useMemo(() => dailySummary(people), [people])
  const cycleInfo = cycleOnDate(cycles, fixedDate)
  const position = clampIndex(current, people.length)
  const canPresent = people.length > 0

  const setDate = (value) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value === today) next.delete('date')
        else next.set('date', value)
        return next
      },
      { replace: true },
    )

  const togglePresenting = useCallback(() => {
    if (!canPresent) return
    setPresenting((value) => !value)
    setCurrent(0)
  }, [canPresent])
  const exitPresenting = useCallback(() => setPresenting(false), [])
  const goPrevious = useCallback(() => setCurrent((value) => clampIndex(value - 1, people.length)), [people.length])
  const goNext = useCallback(() => setCurrent((value) => clampIndex(value + 1, people.length)), [people.length])

  // P presenta o vuelve; en «Presentar», ← → cambian de persona y Esc sale (no con el panel de una tarea abierto)
  useHotkey('p', togglePresenting)
  useHotkey('arrowleft', goPrevious, { enabled: presenting })
  useHotkey('arrowright', goNext, { enabled: presenting })
  useHotkey('escape', exitPresenting, { enabled: presenting })

  const base = `/${workspace.slug}/projects/${project.id}`

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: 'daily' }]}
        title="Daily"
        documentTitle={['Daily', project.name]}
        description={
          cycleInfo
            ? `${cycleInfo.cycle.name} · día ${cycleInfo.day} de ${cycleInfo.total} · se arma sola con la actividad del proyecto`
            : 'Se arma sola con la actividad del proyecto.'
        }
        actions={
          <>
            <DailyDateNav date={fixedDate} today={today} onChange={setDate} />
            <PresentSwitch checked={presenting} disabled={!canPresent} onToggle={togglePresenting} />
          </>
        }
      />
      <PageBody className="flex flex-col gap-3.5">
        {isLoading && <DailySkeleton />}
        {error && !daily && <ErrorState error={error} onRetry={refetch} homeLink={`${base}/issues`} />}
        {daily && people.length === 0 && (
          <EmptyState
            icon={Users}
            title="Nadie en el proyecto todavía"
            description="La daily muestra a los miembros del proyecto y a quienes tienen tareas asignadas."
          />
        )}

        {daily && people.length > 0 && presenting && (
          <DailyPresenter
            people={people}
            current={position}
            onSelect={(value) => setCurrent(clampIndex(value, people.length))}
            onExit={exitPresenting}
            index={index}
            blocking={blocking}
            onOpenIssue={issueFilters.openIssue}
          />
        )}

        {daily && people.length > 0 && !presenting && (
          <div
            aria-busy={isPlaceholderData}
            className={cn('flex flex-col gap-3.5 transition-opacity duration-200', isPlaceholderData && 'opacity-60')}
          >
            <DailySummaryStrip summary={summary} daily={daily} />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] items-start gap-3.5">
              {people.map((person) => (
                <DailyPersonCard
                  key={person.user?.id}
                  person={person}
                  index={index}
                  blocking={blocking.get(person.user?.id)}
                  onOpenIssue={issueFilters.openIssue}
                />
              ))}
            </div>
            {/* Una nota por día: al cambiar de fecha el editor empieza de nuevo (y guarda lo pendiente) */}
            {!isPlaceholderData && (
              <DailyNoteEditor
                key={daily.date}
                slug={workspace.slug}
                projectId={project.id}
                date={daily.date}
                isToday={daily.date === today}
                note={daily.note}
              />
            )}
          </div>
        )}
      </PageBody>

      <IssuePeekSheet
        slug={workspace.slug}
        project={project}
        issueId={issueFilters.openIssueId}
        onClose={issueFilters.closeIssue}
        onOpenIssue={issueFilters.openIssue}
      />
    </>
  )
}

/** Interruptor «Presentar» con su atajo P. */
function PresentSwitch({ checked, disabled, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-keyshortcuts="P"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'flex h-10 items-center gap-2.5 rounded-xl border bg-card pr-3.5 pl-2.5 text-sm font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        checked && 'border-accent-text bg-accent-soft text-accent-text',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('relative block h-5 w-8.5 rounded-full bg-dash transition-colors duration-200', checked && 'bg-accent-text')}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200',
            checked && 'translate-x-3.5',
          )}
        />
      </span>
      Presentar
      <kbd className="font-mono text-[11px] font-normal text-muted-foreground">P</kbd>
    </button>
  )
}

/** «// desde ayer, 27 oct  2 movidas  1 completada  ⊘ 1 bloqueo   Ayer = día hábil anterior». */
function DailySummaryStrip({ summary, daily }) {
  const counts = SUMMARY_ITEMS.filter(([key]) => summary[key] > 0)
  return (
    <section
      aria-label="Resumen desde el día anterior"
      className="flex flex-wrap items-center gap-x-5.5 gap-y-2 rounded-2xl border border-dashed border-dash px-4.5 py-2.5"
    >
      <span className="font-mono text-[11px] text-muted-foreground">// desde {previousDayLabel(daily.date, daily.previousDate)}</span>
      {counts.length === 0 && <span className="text-[13px] text-muted-foreground">sin cambios en las tareas</span>}
      {counts.map(([key, singular, plural]) => (
        <span key={key} className="flex items-baseline gap-1.5">
          <strong className="font-display text-[22px] leading-none font-extrabold">{summary[key]}</strong>
          <span className="text-[13px] text-muted-foreground">{summary[key] === 1 ? singular : plural}</span>
        </span>
      ))}
      {summary.blockers > 0 && (
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-late">
          <Ban className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          {summary.blockers} {summary.blockers === 1 ? 'tarea bloqueada' : 'tareas bloqueadas'}
        </span>
      )}
      <span className="ml-auto text-xs text-muted-foreground">Ayer = día hábil anterior</span>
    </section>
  )
}

function DailySkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-label="Cargando la daily">
      <Skeleton className="h-12 rounded-2xl" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-3.5">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-72 rounded-[18px]" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-[18px]" />
    </div>
  )
}
