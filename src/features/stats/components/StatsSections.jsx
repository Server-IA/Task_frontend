import { useState } from 'react'
import { Link } from 'react-router'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { isTooDark } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { formatShortDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { average, formatDecimal, formatDelta, percent } from '../chartMath'
import { BurndownChart, burndownSeries } from './BurndownChart'
import { ChartCard, ChartTooltip } from './ChartCard'
import { ThroughputChart } from './ThroughputChart'

/** «!» en un cuadrito rojo: acompaña al rojo de lo vencido (el color nunca va solo). */
function AlertMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex size-3.5 items-center justify-center rounded-[4px] bg-late text-[10px] font-bold text-card', className)}
    >
      !
    </span>
  )
}

/** Color del cambio: verde si mejora, rojo si empeora y gris si no cambia (`higherIsBetter` decide qué es mejor). */
function deltaTone(delta, higherIsBetter = true) {
  if (!delta) return 'text-muted-foreground'
  return delta > 0 === higherIsBetter ? 'text-ok' : 'text-late'
}

/**
 * Los cuatro indicadores: abiertas, cerradas esta semana, vencidas y tiempo de ciclo.
 * @param {{ stats: import('@/api/types').ProjectStats, onOpenIssue: (issueId: string) => void }} props
 */
export function KpiTiles({ stats, onOpenIssue }) {
  const overdue = stats.overdue ?? []
  const net = stats.createdThisWeek - stats.completedThisWeek
  const closedDelta = stats.completedThisWeek - stats.completedLastWeek
  const cycleTime = stats.cycleTimeDays
  const cycleDelta = cycleTime != null && stats.previousCycleTimeDays != null ? cycleTime - stats.previousCycleTimeDays : null

  return (
    <section aria-label="Resumen" className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
      <KpiTile
        label="Abiertas"
        value={stats.openCount}
        detail={
          <span title={`${stats.createdThisWeek} creadas y ${stats.completedThisWeek} cerradas desde el lunes`}>
            <Delta value={net} className="text-muted-foreground" /> esta semana
          </span>
        }
      />
      <KpiTile
        label="Cerradas esta semana"
        value={stats.completedThisWeek}
        detail={
          <>
            <Delta value={closedDelta} className={deltaTone(closedDelta)} /> vs. semana pasada
          </>
        }
      />
      <KpiTile
        label="Vencidas"
        alert={overdue.length > 0}
        value={overdue.length}
        valueClassName={overdue.length > 0 && 'text-late'}
        detail={
          overdue.length > 0 ? (
            <span className="font-mono font-semibold text-late">
              {overdue.slice(0, 3).map((issue, index) => (
                <span key={issue.id}>
                  {index > 0 && ', '}
                  <button type="button" className="hover:underline" title={issue.title} onClick={() => onOpenIssue(issue.id)}>
                    {issue.code}
                  </button>
                </span>
              ))}
              {overdue.length > 3 && ` +${overdue.length - 3}`}
            </span>
          ) : (
            'ninguna con la fecha límite pasada'
          )
        }
      />
      <KpiTile
        label="Tiempo de ciclo"
        value={cycleTime != null ? formatDecimal(cycleTime) : '—'}
        unit={cycleTime != null ? (cycleTime === 1 ? 'día' : 'días') : undefined}
        detail={
          cycleTime != null ? (
            <>
              {cycleDelta != null && (
                <>
                  <Delta value={Math.round(cycleDelta * 10) / 10} className={deltaTone(cycleDelta, false)} />{' '}
                </>
              )}
              mediana, de creada a hecha
            </>
          ) : (
            'sin tareas cerradas en el periodo'
          )
        }
      />
    </section>
  )
}

function KpiTile({ label, value, unit, detail, alert = false, valueClassName }) {
  return (
    <article className="tf-panel flex flex-col gap-1.5 px-4.5 py-4">
      <h3 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
        {alert && <AlertMark />}
        {label}
      </h3>
      <p className={cn('font-display text-[36px] leading-none font-extrabold tracking-[-0.02em]', valueClassName)}>
        {value}
        {unit && <span className="ml-1 font-sans text-sm font-medium tracking-normal text-muted-foreground">{unit}</span>}
      </p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </article>
  )
}

function Delta({ value, className }) {
  return <span className={cn('font-mono font-semibold', className)}>{formatDelta(value)}</span>
}

/**
 * Tareas cerradas por semana (columnas) con su tabla.
 * @param {{ throughput: import('@/api/types').ThroughputWeek[], weeks: number, className?: string }} props
 */
export function ThroughputCard({ throughput, weeks, className }) {
  const mean = average(throughput.map((week) => week.completed))
  return (
    <ChartCard
      className={className}
      title="Tareas cerradas por semana"
      meta={`últimas ${weeks} semanas · promedio ${formatDecimal(mean)}`}
      table={{
        caption: 'Tareas cerradas por semana',
        columns: [
          { key: 'week', label: 'Semana del' },
          { key: 'completed', label: 'Cerradas', numeric: true },
        ],
        rows: throughput.map((week) => ({ week: formatShortDate(week.weekStart), completed: week.completed })),
      }}
    >
      <ThroughputChart weeks={throughput} />
    </ChartCard>
  )
}

/**
 * Burndown del ciclo en curso, o un aviso si no hay ninguno.
 * @param {{ burndown: import('@/api/types').Burndown | null, cyclesUrl: string, className?: string }} props
 */
export function BurndownCard({ burndown, cyclesUrl, className }) {
  if (!burndown) {
    return (
      <ChartCard className={className} title="Burndown">
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-dash px-4 py-10 text-center">
          <p className="font-semibold">Sin ciclo en curso</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            El burndown aparece cuando hay un ciclo con fechas que incluyen hoy.
          </p>
          <Link to={cyclesUrl} className="mt-1 text-sm font-semibold text-accent-text hover:underline">
            Ver ciclos →
          </Link>
        </div>
      </ChartCard>
    )
  }

  const { points } = burndownSeries(burndown)
  const last = points.at(-1)
  const gap = last ? Math.round(last.remaining - last.ideal) : 0

  return (
    <ChartCard
      className={className}
      title={
        <>
          Burndown ·{' '}
          <Link to={`${cyclesUrl}/${burndown.cycleId}`} className="hover:underline">
            {burndown.name}
          </Link>
        </>
      }
      meta={
        <span className="font-mono">
          {formatShortDate(burndown.startDate)} → {formatShortDate(burndown.endDate)}
        </span>
      }
      table={{
        caption: `Burndown de ${burndown.name}`,
        columns: [
          { key: 'date', label: 'Día' },
          { key: 'remaining', label: 'Restantes', numeric: true },
          { key: 'ideal', label: 'Ideal', numeric: true },
        ],
        rows: points.map((point) => ({
          date: formatShortDate(point.date),
          remaining: point.remaining,
          ideal: formatDecimal(point.ideal),
        })),
      }}
      footer={
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-chart-series" />
            Real
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-chart-ref" />
            Ideal
          </span>
          {last && <BurndownStatus gap={gap} />}
        </div>
      }
    >
      {burndown.total === 0 ? (
        <p className="rounded-xl border border-dashed border-dash px-4 py-10 text-center text-sm text-muted-foreground">
          El ciclo todavía no tiene tareas.
        </p>
      ) : (
        <BurndownChart burndown={burndown} />
      )}
    </ChartCard>
  )
}

/** «3 tareas por encima del ideal» (rojo, con flecha) o por debajo (verde). */
function BurndownStatus({ gap }) {
  if (gap === 0) return <span className="ml-auto font-semibold">En línea con el ideal</span>
  const behind = gap > 0
  const Icon = behind ? TrendingUp : TrendingDown
  const count = Math.abs(gap)
  return (
    <span className={cn('ml-auto flex items-center gap-1 font-semibold', behind ? 'text-late' : 'text-ok')}>
      <Icon className="size-3.5" aria-hidden="true" />
      {count} {count === 1 ? 'tarea' : 'tareas'} {behind ? 'por encima' : 'por debajo'} del ideal
    </span>
  )
}

/** Color de un estado como variable CSS; los casi negros se aclaran en modo oscuro (como en StateIcon). */
function stateSwatch(color) {
  return {
    className: cn('bg-(--state)', isTooDark(color) && 'dark:bg-muted-foreground'),
    style: { '--state': color },
  }
}

/**
 * Barra apilada de las abiertas por estado, con leyenda (conteo y porcentaje) y globo por segmento.
 * @param {{ states: import('@/api/types').OpenStateCount[], className?: string }} props
 */
export function StatesCard({ states, className }) {
  const [active, setActive] = useState(null)
  const total = states.reduce((sum, state) => sum + state.count, 0)
  const visible = states.filter((state) => state.count > 0)
  const summary = visible.map((state) => `${state.count} en ${state.name}`).join(', ')

  return (
    <ChartCard
      className={className}
      title={
        <>
          Abiertas por estado <span className="font-mono text-xs font-normal text-muted-foreground">{total}</span>
        </>
      }
      table={{
        caption: 'Tareas abiertas por estado',
        columns: [
          { key: 'name', label: 'Estado' },
          { key: 'count', label: 'Tareas', numeric: true },
          { key: 'share', label: '%', numeric: true },
        ],
        rows: states.map((state) => ({ name: state.name, count: state.count, share: `${percent(state.count, total)}%` })),
      }}
    >
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No hay tareas abiertas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Separación de 2 px entre segmentos (el color de la tarjeta separa, no un borde) */}
          <div role="img" aria-label={summary} className="flex h-3.5 gap-0.5">
            {visible.map((state) => {
              const swatch = stateSwatch(state.color)
              return (
                <span
                  key={state.stateId}
                  className="relative"
                  style={{ flex: `${state.count} 1 0` }}
                  onPointerEnter={() => setActive(state.stateId)}
                  onPointerLeave={() => setActive(null)}
                >
                  <span
                    className={cn('block h-full rounded-[4px] transition-opacity', swatch.className, active && active !== state.stateId && 'opacity-50')}
                    style={swatch.style}
                  />
                  {active === state.stateId && (
                    <ChartTooltip x="50%" y={0}>
                      <strong className="font-semibold">{state.count}</strong> · {percent(state.count, total)}%
                      <span className="block opacity-75">{state.name}</span>
                    </ChartTooltip>
                  )}
                </span>
              )
            })}
          </div>
          <ul className="flex flex-col gap-1.5">
            {states.map((state) => {
              const swatch = stateSwatch(state.color)
              return (
                <li
                  key={state.stateId}
                  className={cn('flex items-center gap-2 text-[13px]', state.count === 0 && 'text-muted-foreground')}
                  onPointerEnter={() => state.count > 0 && setActive(state.stateId)}
                  onPointerLeave={() => setActive(null)}
                >
                  <span aria-hidden="true" className={cn('size-2.5 rounded-[3px]', swatch.className)} style={swatch.style} />
                  <span className={cn('min-w-0 flex-1 truncate', active === state.stateId && 'font-semibold')}>{state.name}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {state.count} · {percent(state.count, total)}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}

/**
 * Tareas abiertas asignadas a cada persona (barras horizontales) y cuántas tiene vencidas.
 * @param {{ workload: import('@/api/types').WorkloadEntry[], className?: string }} props
 */
export function WorkloadCard({ workload, className }) {
  // Primero las personas (de más a menos) y al final «Sin asignar»
  const rows = [...workload].sort((a, b) => (a.user === null) - (b.user === null) || b.open - a.open)
  const max = Math.max(1, ...rows.map((row) => row.open))
  const name = (row) => row.user?.fullName ?? 'Sin asignar'

  return (
    <ChartCard
      className={className}
      title="Carga por persona"
      meta="tareas abiertas asignadas"
      table={{
        caption: 'Tareas abiertas por persona',
        columns: [
          { key: 'name', label: 'Persona' },
          { key: 'open', label: 'Abiertas', numeric: true },
          { key: 'overdue', label: 'Vencidas', numeric: true },
        ],
        rows: rows.map((row) => ({ name: name(row), open: row.open, overdue: row.overdue })),
      }}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay tareas abiertas.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.user?.id ?? 'none'} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_2rem] items-center gap-2.5">
              <span className="flex min-w-0 items-center gap-2 text-[13px]">
                {row.user ? (
                  <UserAvatar user={row.user} size="xs" className="size-5.5" />
                ) : (
                  <span aria-hidden="true" className="size-5.5 shrink-0 rounded-full border border-dashed border-dash" />
                )}
                <span className={cn('truncate', !row.user && 'text-muted-foreground')}>{name(row)}</span>
              </span>
              <span className="flex flex-col gap-0.5" title={`${row.open} abiertas${row.overdue ? ` · ${row.overdue} vencidas` : ''}`}>
                <span className="block h-2.5 rounded-[4px] bg-column">
                  <span
                    className="block h-full rounded-[4px] bg-chart-series transition-[width] duration-300"
                    style={{ width: `${(row.open / max) * 100}%` }}
                  />
                </span>
                {row.overdue > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-late">
                    <AlertMark className="size-3 text-[9px]" />
                    {row.overdue} {row.overdue === 1 ? 'vencida' : 'vencidas'}
                  </span>
                )}
              </span>
              <span className="text-right font-mono text-xs tabular-nums">{row.open}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  )
}

/**
 * Abiertas sin cambios hace más de 14 días (como mucho 5, la más antigua primero).
 * @param {{ stale: import('@/api/types').StaleIssue[], onOpenIssue: (issueId: string) => void, className?: string }} props
 */
export function StaleCard({ stale, onOpenIssue, className }) {
  return (
    <ChartCard className={className} title="Sin movimiento" meta="abiertas y sin cambios hace más de 14 días">
      {stale.length === 0 ? (
        <p className="rounded-xl border border-dashed border-dash px-3 py-4 text-center text-sm text-muted-foreground">
          Todas las tareas abiertas tuvieron cambios en las últimas dos semanas.
        </p>
      ) : (
        <>
          <ul className="overflow-hidden rounded-xl border">
            {stale.map((issue, index) => (
              <li key={issue.id} className={cn(index > 0 && 'border-t')}>
                <button
                  type="button"
                  onClick={() => onOpenIssue(issue.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-subtle"
                >
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{issue.code}</span>
                  <span className="min-w-0 flex-1 truncate">{issue.title}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{issue.daysWithoutChanges} días</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Revísalas en la próxima reunión: quizá sobran o necesitan responsable.</p>
        </>
      )}
    </ChartCard>
  )
}
