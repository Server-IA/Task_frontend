import { useId } from 'react'
import { Link } from 'react-router'
import { GhMark, TonePill } from '@/features/github/GithubParts'
import { repoName, runState } from '@/features/github/githubModel'
import { t, tn } from '@/i18n'
import { formatDateTime, formatRelative, formatShortDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { average, formatDecimal, percent } from '../chartMath'
import { developmentFigures, formatDuration } from '../developmentModel'
import { ChartCard, DataTable } from './ChartCard'
import { KpiTile } from './StatsSections'
import { ThroughputChart } from './ThroughputChart'

/**
 * La sección «Desarrollo» de las estadísticas: lo que pasa en los repositorios de GitHub enlazados al proyecto en el
 * mismo periodo de la página. Solo se muestra si el proyecto tiene repositorios.
 * @param {{ stats: import('@/api/types').DevelopmentStats, githubUrl: string, filtered?: boolean,
 *           onOpenIssue: (issueId: string) => void }} props
 */
export function DevelopmentSection({ stats, githubUrl, filtered = false, onOpenIssue }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="mt-2 flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-1">
        <GhMark size="sm" />
        <h2 id={titleId} className="text-[15px] font-semibold">
          {t('Desarrollo')}
        </h2>
        <span className="text-muted-foreground font-mono text-xs">
          {tn(stats.repositories, '{count} repositorio enlazado', '{count} repositorios enlazados')} ·{' '}
          {t('últimas {weeks} semanas', { weeks: stats.weeks })}
        </span>
        {/* Un pull request no siempre tiene a alguien de TaskFlow detrás: estas cifras son de todo el proyecto */}
        {filtered && (
          <span className="text-muted-foreground text-xs">{t('(no depende del filtro de personas)')}</span>
        )}
        <Link to={githubUrl} className="text-accent-text ml-auto rounded text-xs hover:underline">
          {t('Ver GitHub →')}
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
        {developmentFigures(stats).map((figure) => (
          <KpiTile
            key={figure.key}
            label={figure.label}
            value={figure.value}
            unit={figure.unit}
            valueClassName={figure.muted && 'text-muted-foreground'}
            detail={figure.detail}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3.5">
        <MergedCard className="flex-[3_1_460px]" weeks={stats.mergedByWeek ?? []} />
        <OldPullsCard
          className="flex-[2_1_340px]"
          pulls={stats.oldOpenPullRequests ?? []}
          onOpenIssue={onOpenIssue}
        />
      </div>

      <WorkflowsCard workflows={stats.workflows ?? []} />
    </section>
  )
}

/** Pull requests fusionados por semana (columnas) con su tabla: la tendencia. */
function MergedCard({ weeks, className }) {
  const mean = average(weeks.map((week) => week.merged))
  return (
    <ChartCard
      className={className}
      title={t('Pull requests fusionados por semana')}
      meta={t('últimas {weeks} semanas · promedio {average}', {
        weeks: weeks.length,
        average: formatDecimal(mean),
      })}
      table={{
        caption: t('Pull requests fusionados por semana'),
        columns: [
          { key: 'week', label: t('Semana del') },
          { key: 'merged', label: t('Fusionados'), numeric: true },
        ],
        rows: weeks.map((week) => ({ week: formatShortDate(week.weekStart), merged: week.merged })),
      }}
    >
      <ThroughputChart weeks={weeks} kind="merged" />
    </ChartCard>
  )
}

/**
 * Pull requests abiertos hace más de 7 días (como mucho 5, el más antiguo primero), en una tabla: cada uno enlaza a
 * GitHub y su tarea abre el panel lateral.
 */
function OldPullsCard({ pulls, onOpenIssue, className }) {
  return (
    <ChartCard
      className={className}
      title={t('PR abiertos hace más de 7 días')}
      meta={t('el más antiguo primero')}
    >
      {pulls.length === 0 ? (
        <p className="border-dash text-muted-foreground rounded-xl border border-dashed px-3 py-4 text-center text-sm">
          {t('Ningún pull request lleva más de 7 días abierto.')}
        </p>
      ) : (
        <DataTable
          caption={t('Pull requests abiertos hace más de 7 días')}
          columns={[
            { key: 'pull', label: t('Pull request') },
            { key: 'issue', label: t('Tarea') },
            { key: 'days', label: t('Días abierto'), numeric: true },
          ]}
          rows={pulls.map((pull) => ({
            pull: (
              <span className="flex min-w-0 flex-col">
                <a
                  href={pull.url}
                  target="_blank"
                  rel="noreferrer"
                  title={t('Abrir el pull request #{number} en GitHub', { number: pull.number })}
                  className="focus-visible:ring-ring truncate rounded hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="text-muted-foreground font-mono text-xs">#{pull.number}</span> {pull.title}
                </a>
                <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px]">
                  {repoName(pull.repository)}
                  {pull.draft && <TonePill tone="wait">{t('borrador')}</TonePill>}
                </span>
              </span>
            ),
            issue: pull.issueId ? (
              <button
                type="button"
                title={pull.issueTitle ?? undefined}
                onClick={() => onOpenIssue(pull.issueId)}
                className="focus-visible:ring-ring rounded font-mono text-xs whitespace-nowrap underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {pull.issueCode}
              </button>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
            days: pull.daysOpen,
          }))}
        />
      )}
    </ChartCard>
  )
}

/**
 * Cada workflow de Actions con sus ejecuciones del periodo: cuántas, qué parte fue correcta, cuánto duran y cómo
 * terminó la última. Solo números: una barra repetiría el porcentaje.
 */
function WorkflowsCard({ workflows }) {
  return (
    <ChartCard
      title={t('Workflows de GitHub Actions')}
      meta={t('terminadas en el periodo, sin contar canceladas ni omitidas')}
    >
      {workflows.length === 0 ? (
        <p className="border-dash text-muted-foreground rounded-xl border border-dashed px-3 py-4 text-center text-sm">
          {t('No hubo ejecuciones de Actions terminadas en el periodo.')}
        </p>
      ) : (
        <DataTable
          caption={t('Ejecuciones por workflow')}
          columns={[
            { key: 'name', label: t('Workflow') },
            { key: 'runs', label: t('Ejecuciones'), numeric: true },
            { key: 'success', label: t('Correctas'), numeric: true },
            { key: 'duration', label: t('Duración media'), numeric: true },
            { key: 'last', label: t('Última ejecución') },
          ]}
          rows={workflows.map((workflow) => {
            const share = percent(workflow.succeeded, workflow.runs)
            const last = workflow.lastConclusion
              ? runState({ status: 'completed', conclusion: workflow.lastConclusion, runId: null })
              : null
            return {
              name: (
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate font-semibold">{workflow.name ?? '—'}</span>
                  <span
                    className="text-muted-foreground truncate font-mono text-[11px]"
                    title={workflow.repository}
                  >
                    {repoName(workflow.repository)}
                  </span>
                </span>
              ),
              runs: workflow.runs,
              success: (
                // Menos de 4 de cada 5 correctas se marca: algo en ese workflow falla seguido
                <span className={cn(share < 80 && 'text-late font-semibold')}>
                  {t('{percent} %', { percent: share })}
                </span>
              ),
              duration: formatDuration(workflow.averageSeconds),
              last: (
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {last && (
                    <TonePill tone={last.tone}>
                      <span aria-hidden="true">{last.mark}</span>
                      {last.label}
                    </TonePill>
                  )}
                  {workflow.lastRunAt && (
                    <span
                      className="text-muted-foreground text-xs"
                      title={formatDateTime(workflow.lastRunAt)}
                    >
                      {formatRelative(workflow.lastRunAt)}
                    </span>
                  )}
                </span>
              ),
            }
          })}
        />
      )}
    </ChartCard>
  )
}
