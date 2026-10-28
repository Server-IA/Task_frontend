import { Link, useSearchParams } from 'react-router'
import { ChartColumn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/common/Segmented'
import { EmptyState, ErrorState } from '@/components/common/States'
import { IssuePeekSheet } from '@/features/issues/components/IssuePeekSheet'
import { useIssueFilters } from '@/features/issues/useIssueFilters'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { projectPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { useProjectStats } from '../hooks'
import { BurndownCard, KpiTiles, StaleCard, StatesCard, ThroughputCard, WorkloadCard } from '../components/StatsSections'

/** Periodos que acepta el backend (semanas) para el ritmo de cierre y el tiempo de ciclo. */
const RANGES = [4, 8, 12]
const DEFAULT_RANGE = 8

/** Estadísticas del proyecto: indicadores, ritmo de cierre, burndown del ciclo, estados, carga y tareas quietas. */
export function StatsPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = Number(searchParams.get('weeks'))
  const weeks = RANGES.includes(requested) ? requested : DEFAULT_RANGE
  const { data: stats, isLoading, isPlaceholderData, error, refetch } = useProjectStats(workspace.slug, project.id, weeks)
  // Las tareas (vencidas, sin movimiento) se abren en el panel lateral, sin salir de la página
  const issueFilters = useIssueFilters()
  const base = `/${workspace.slug}/projects/${project.id}`

  const setWeeks = (value) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (Number(value) === DEFAULT_RANGE) next.delete('weeks')
        else next.set('weeks', value)
        return next
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: 'estadisticas' }]}
        title="Estadísticas"
        documentTitle={['Estadísticas', project.name]}
        description="Cómo avanza el proyecto: ritmo de cierre, ciclo actual y carga del equipo."
        actions={
          <Segmented
            label="Periodo"
            value={String(weeks)}
            onChange={setWeeks}
            options={RANGES.map((range) => ({ value: String(range), label: `${range} semanas` }))}
          />
        }
      />
      <PageBody>
        {isLoading && <StatsSkeleton />}
        {error && !stats && <ErrorState error={error} onRetry={refetch} homeLink={`${base}/issues`} />}
        {stats && project.issueCount === 0 && (
          <EmptyState
            icon={ChartColumn}
            title="Todavía no hay datos"
            description="Las estadísticas se llenan a medida que el equipo crea y cierra tareas."
            action={
              <Button asChild variant="outline">
                <Link to={`${base}/issues`}>Ir a las tareas</Link>
              </Button>
            }
          />
        )}
        {stats && project.issueCount !== 0 && (
          // Mientras llega el nuevo periodo se mantiene lo anterior atenuado (sin saltos ni esqueletos)
          <div
            aria-busy={isPlaceholderData}
            className={cn('flex flex-col gap-3.5 transition-opacity duration-200', isPlaceholderData && 'opacity-60')}
          >
            <KpiTiles stats={stats} onOpenIssue={issueFilters.openIssue} />
            <div className="flex flex-wrap gap-3.5">
              <ThroughputCard className="flex-[3_1_460px]" throughput={stats.throughput ?? []} weeks={weeks} />
              <BurndownCard className="flex-[2_1_340px]" burndown={stats.burndown ?? null} cyclesUrl={`${base}/cycles`} />
            </div>
            <div className="flex flex-wrap gap-3.5">
              <StatesCard className="flex-[1_1_280px]" states={stats.openByState ?? []} />
              <WorkloadCard className="flex-[1.3_1_320px]" workload={stats.workload ?? []} />
              <StaleCard className="flex-[1.3_1_320px]" stale={stats.stale ?? []} onOpenIssue={issueFilters.openIssue} />
            </div>
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

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-label="Cargando estadísticas">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[118px] rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-wrap gap-3.5">
        <Skeleton className="h-[290px] flex-[3_1_460px] rounded-2xl" />
        <Skeleton className="h-[290px] flex-[2_1_340px] rounded-2xl" />
      </div>
      <div className="flex flex-wrap gap-3.5">
        <Skeleton className="h-52 flex-[1_1_280px] rounded-2xl" />
        <Skeleton className="h-52 flex-[1.3_1_320px] rounded-2xl" />
        <Skeleton className="h-52 flex-[1.3_1_320px] rounded-2xl" />
      </div>
    </div>
  )
}
