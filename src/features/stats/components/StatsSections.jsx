import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { isTooDark } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { stateName, t, tn, tx } from '@/i18n'
import { formatShortDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { average, formatDecimal, formatDelta, percent } from '../chartMath'
import { BurndownChart, burndownSeries } from './BurndownChart'
import { ChartCard, ChartTooltip, DataTable } from './ChartCard'
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

/**
 * El «+N» de las vencidas: abre la lista de todas (la más vencida primero) y cualquiera se abre desde ahí.
 * @param {{ issues: import('@/api/types').IssueSummaryResponse[], onOpenIssue: (issueId: string) => void }} props
 */
function OverdueList({ issues, onOpenIssue }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={tn(issues.length, 'Ver la tarea vencida', 'Ver las {count} tareas vencidas')}
      >
        +{issues.length - 3}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <p className="border-b px-3.5 py-2.5 text-[13px] font-semibold">
          {tn(issues.length, '{count} tarea vencida', '{count} tareas vencidas')}
          <span className="ml-1.5 font-normal text-muted-foreground">{t('la más vencida primero')}</span>
        </p>
        <ul className="max-h-72 overflow-y-auto p-1">
          {issues.map((issue) => (
            <li key={issue.id}>
              <button
                type="button"
                className="flex w-full items-baseline gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                onClick={() => {
                  setOpen(false)
                  onOpenIssue(issue.id)
                }}
              >
                <span className="shrink-0 font-mono text-xs font-semibold text-late">{issue.code}</span>
                <span className="min-w-0 truncate">{issue.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/**
 * La lista de tareas con filtros: `issuesLink('/w/projects/p/issues?assignee=a', { state: ['s1', 's2'] })`. Sin `base` no hay
 * enlace (`null`): la tarjeta se muestra igual, sin navegar.
 */
function issuesLink(base, params) {
  if (!base) return null
  const [path, query = ''] = base.split('?')
  const search = new URLSearchParams(query)
  for (const [key, value] of Object.entries(params)) {
    for (const one of [value].flat()) search.append(key, one)
  }
  const text = search.toString()
  return text ? `${path}?${text}` : path
}

/** Enlace de una tarjeta hacia las tareas: discreto, se subraya al pasar. */
const cardLink =
  'rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/** Color del cambio: verde si mejora, rojo si empeora y gris si no cambia (`higherIsBetter` decide qué es mejor). */
function deltaTone(delta, higherIsBetter = true) {
  if (!delta) return 'text-muted-foreground'
  return delta > 0 === higherIsBetter ? 'text-ok' : 'text-late'
}

/**
 * Los cuatro indicadores: abiertas, cerradas esta semana, vencidas y tiempo de ciclo.
 * `issuesUrl`: la lista de tareas (con el filtro de personas de la página), para «Ver tareas».
 * @param {{ stats: import('@/api/types').ProjectStats, onOpenIssue: (issueId: string) => void, issuesUrl?: string }} props
 */
export function KpiTiles({ stats, onOpenIssue, issuesUrl }) {
  const overdue = stats.overdue ?? []
  const net = stats.createdThisWeek - stats.completedThisWeek
  const closedDelta = stats.completedThisWeek - stats.completedLastWeek
  const cycleTime = stats.cycleTimeDays
  const cycleDelta = cycleTime != null && stats.previousCycleTimeDays != null ? cycleTime - stats.previousCycleTimeDays : null

  return (
    <section aria-label={t('Resumen')} className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
      <KpiTile
        label={t('Abiertas')}
        value={stats.openCount}
        action={
          issuesUrl && (
            // Solo las abiertas: los estados que no son de cierre
            <Link to={issuesLink(issuesUrl, { state: (stats.openByState ?? []).map((state) => state.stateId) })} className={cardLink}>
              {t('Ver tareas')} →
            </Link>
          )
        }
        detail={
          <span title={t('{created} creadas y {completed} cerradas desde el lunes', { created: stats.createdThisWeek, completed: stats.completedThisWeek })}>
            {tx('{delta} esta semana', { delta: <Delta value={net} className="text-muted-foreground" /> })}
          </span>
        }
      />
      <KpiTile
        label={t('Cerradas esta semana')}
        value={stats.completedThisWeek}
        detail={
          tx('{delta} vs. semana pasada', { delta: <Delta value={closedDelta} className={deltaTone(closedDelta)} /> })
        }
      />
      <KpiTile
        label={t('Vencidas')}
        alert={overdue.length > 0}
        value={overdue.length}
        valueClassName={overdue.length > 0 && 'text-late'}
        detail={
          overdue.length > 0 ? (
            <span className="font-mono font-semibold text-late">
              {overdue.slice(0, 3).map((issue, index) => (
                // La coma (y el «+N») va pegada al código: si la línea se parte, no queda «, WEB-9» ni «+3» solo al principio
                <Fragment key={issue.id}>
                  {index > 0 && ' '}
                  <span className="whitespace-nowrap">
                    <button type="button" className="hover:underline" title={issue.title} onClick={() => onOpenIssue(issue.id)}>
                      {issue.code}
                    </button>
                    {index < Math.min(overdue.length, 3) - 1 && ','}
                    {index === 2 && overdue.length > 3 && (
                      <>
                        {' '}
                        <OverdueList issues={overdue} onOpenIssue={onOpenIssue} />
                      </>
                    )}
                  </span>
                </Fragment>
              ))}
            </span>
          ) : (
            t('ninguna con la fecha límite pasada')
          )
        }
      />
      {/* Mediana de startedAt → completedAt: las que nunca pasaron por un estado «en curso» no cuentan */}
      <KpiTile
        label={t('Tiempo de ciclo')}
        value={cycleTime != null ? formatDecimal(cycleTime) : '—'}
        valueClassName={cycleTime == null && 'text-muted-foreground'}
        unit={cycleTime != null ? (cycleTime === 1 ? t('día') : t('días')) : undefined}
        detail={
          cycleTime == null ? (
            <span title={t('Mediana de días desde que una tarea entra en curso hasta que se completa')}>
              {t('ninguna pasó de En curso a Hecho en el periodo')}
            </span>
          ) : cycleDelta != null ? (
            tx('{delta} mediana, de En curso a Hecho', {
              delta: <Delta value={Math.round(cycleDelta * 10) / 10} className={deltaTone(cycleDelta, false)} />,
            })
          ) : (
            t('mediana, de En curso a Hecho')
          )
        }
      />
    </section>
  )
}

/** Un indicador: nombre en monoespaciada, la cifra grande (con su unidad) y una línea que la explica. */
export function KpiTile({ label, value, unit, detail, alert = false, valueClassName, action }) {
  return (
    <article className="tf-panel flex flex-col gap-1.5 px-4.5 py-4">
      <div className="flex items-center gap-2">
        <h3 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
          {alert && <AlertMark />}
          {label}
        </h3>
        {action && <span className="ml-auto text-xs text-muted-foreground hover:text-foreground">{action}</span>}
      </div>
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
      title={t('Tareas cerradas por semana')}
      meta={t('últimas {weeks} semanas · promedio {average}', { weeks, average: formatDecimal(mean) })}
      table={{
        caption: t('Tareas cerradas por semana'),
        columns: [
          { key: 'week', label: t('Semana del') },
          { key: 'completed', label: t('Cerradas'), numeric: true },
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
      <ChartCard className={className} title={t('Burndown')}>
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-dash px-4 py-10 text-center">
          <p className="font-semibold">{t('Sin ciclo en curso')}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {t('El burndown aparece cuando hay un ciclo con fechas que incluyen hoy.')}
          </p>
          <Link to={cyclesUrl} className="mt-1 text-sm font-semibold text-accent-text hover:underline">
            {t('Ver ciclos →')}
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
      title={tx('Burndown · {cycle}', {
        cycle: (
          <Link to={`${cyclesUrl}/${burndown.cycleId}`} className="hover:underline">
            {burndown.name}
          </Link>
        ),
      })}
      meta={
        <span className="font-mono">
          {formatShortDate(burndown.startDate)} → {formatShortDate(burndown.endDate)}
        </span>
      }
      table={{
        caption: t('Burndown de {name}', { name: burndown.name }),
        columns: [
          { key: 'date', label: t('Día') },
          { key: 'remaining', label: t('Restantes'), numeric: true },
          { key: 'ideal', label: t('Ideal'), numeric: true },
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
            {t('Real')}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-chart-ref" />
            {t('Ideal')}
          </span>
          {last && <BurndownStatus gap={gap} />}
        </div>
      }
    >
      {burndown.total === 0 ? (
        <p className="rounded-xl border border-dashed border-dash px-4 py-10 text-center text-sm text-muted-foreground">
          {t('El ciclo todavía no tiene tareas.')}
        </p>
      ) : (
        <BurndownChart burndown={burndown} />
      )}
    </ChartCard>
  )
}

/** «3 tareas por encima del ideal» (rojo, con flecha) o por debajo (verde). */
function BurndownStatus({ gap }) {
  if (gap === 0) return <span className="ml-auto font-semibold">{t('En línea con el ideal')}</span>
  const behind = gap > 0
  const Icon = behind ? TrendingUp : TrendingDown
  const count = Math.abs(gap)
  return (
    <span className={cn('ml-auto flex items-center gap-1 font-semibold', behind ? 'text-late' : 'text-ok')}>
      <Icon className="size-3.5" aria-hidden="true" />
      {behind
        ? tn(count, '{count} tarea por encima del ideal', '{count} tareas por encima del ideal')
        : tn(count, '{count} tarea por debajo del ideal', '{count} tareas por debajo del ideal')}
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
 * Cada estado con tareas lleva a la lista filtrada por él (`issuesUrl`).
 * @param {{ states: import('@/api/types').OpenStateCount[], className?: string, issuesUrl?: string }} props
 */
export function StatesCard({ states, className, issuesUrl }) {
  const [active, setActive] = useState(null)
  const total = states.reduce((sum, state) => sum + state.count, 0)
  const visible = states.filter((state) => state.count > 0)
  const summary = visible.map((state) => t('{count} en {state}', { count: state.count, state: stateName(state) })).join(', ')

  return (
    <ChartCard
      className={className}
      title={tx('Abiertas por estado {total}', { total: <span className="font-mono text-xs font-normal text-muted-foreground">{total}</span> })}
      table={{
        caption: t('Tareas abiertas por estado'),
        columns: [
          { key: 'name', label: t('Estado') },
          { key: 'count', label: t('Tareas'), numeric: true },
          { key: 'share', label: '%', numeric: true },
        ],
        rows: states.map((state) => ({ name: stateName(state), count: state.count, share: `${percent(state.count, total)}%` })),
      }}
    >
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{t('No hay tareas abiertas.')}</p>
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
                      <span className="block opacity-75">{stateName(state)}</span>
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
                  {issuesUrl && state.count > 0 ? (
                    <Link
                      to={issuesLink(issuesUrl, { state: state.stateId })}
                      title={t('Ver las tareas en {state}', { state: stateName(state) })}
                      className={cn('min-w-0 flex-1 truncate', cardLink, active === state.stateId && 'font-semibold')}
                    >
                      {stateName(state)}
                    </Link>
                  ) : (
                    <span className={cn('min-w-0 flex-1 truncate', active === state.stateId && 'font-semibold')}>{stateName(state)}</span>
                  )}
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
 * Tareas abiertas asignadas a cada persona y cuántas tiene vencidas, en una tabla. Sin barras: con unas pocas
 * personas el número ya dice quién tiene más.
 * Cada persona lleva a la lista de sus tareas (`issuesUrl`).
 * @param {{ workload: import('@/api/types').WorkloadEntry[], className?: string, issuesUrl?: string }} props
 */
export function WorkloadCard({ workload, className, issuesUrl }) {
  // Primero las personas (de más a menos) y al final «Sin asignar»
  const rows = [...workload].sort((a, b) => (a.user === null) - (b.user === null) || b.open - a.open)

  return (
    <ChartCard className={className} title={t('Carga por persona')} meta={t('tareas abiertas asignadas')}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('No hay tareas abiertas.')}</p>
      ) : (
        <DataTable
          caption={t('Tareas abiertas por persona')}
          columns={[
            { key: 'name', label: t('Persona') },
            { key: 'open', label: t('Abiertas'), numeric: true },
            { key: 'overdue', label: t('Vencidas'), numeric: true },
          ]}
          rows={rows.map((row) => ({
            name: (
              <span className="flex min-w-0 items-center gap-2">
                {row.user ? (
                  <UserAvatar user={row.user} size="xs" className="size-5.5" />
                ) : (
                  <span aria-hidden="true" className="size-5.5 shrink-0 rounded-full border border-dashed border-dash" />
                )}
                {row.user && issuesUrl ? (
                  <Link
                    to={issuesLink(issuesUrl, { assignee: row.user.id })}
                    title={t('Ver las tareas de {name}', { name: row.user.fullName })}
                    className={cn('truncate', cardLink)}
                  >
                    {row.user.fullName}
                  </Link>
                ) : (
                  <span className={cn('truncate', !row.user && 'text-muted-foreground')}>{row.user?.fullName ?? t('Sin asignar')}</span>
                )}
              </span>
            ),
            open: row.open,
            overdue:
              row.overdue > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-late">
                  <AlertMark className="size-3 text-[9px]" />
                  {row.overdue}
                </span>
              ) : (
                <span className="text-muted-foreground">0</span>
              ),
          }))}
        />
      )}
    </ChartCard>
  )
}

/**
 * Abiertas sin cambios hace más de 14 días (como mucho 5, la más antigua primero), en una tabla. Cada tarea abre su
 * panel.
 * @param {{ stale: import('@/api/types').StaleIssue[], onOpenIssue: (issueId: string) => void, className?: string }} props
 */
export function StaleCard({ stale, onOpenIssue, className }) {
  const open = (issue, className, children) => (
    <button
      type="button"
      title={t('Abrir {code}', { code: issue.code })}
      onClick={() => onOpenIssue(issue.id)}
      className={cn(
        'rounded text-left underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </button>
  )

  return (
    <ChartCard
      className={className}
      title={t('Sin movimiento')}
      meta={t('abiertas y sin cambios hace más de 14 días')}
      footer={
        stale.length > 0 && (
          <p className="text-xs text-muted-foreground">{t('Revísalas en la próxima reunión: quizá sobran o necesitan responsable.')}</p>
        )
      }
    >
      {stale.length === 0 ? (
        <p className="rounded-xl border border-dashed border-dash px-3 py-4 text-center text-sm text-muted-foreground">
          {t('Todas las tareas abiertas tuvieron cambios en las últimas dos semanas.')}
        </p>
      ) : (
        <DataTable
          caption={t('Tareas abiertas sin cambios hace más de 14 días')}
          columns={[
            { key: 'code', label: t('Tarea') },
            { key: 'title', label: t('Título') },
            { key: 'days', label: t('Días sin cambios'), numeric: true },
          ]}
          rows={stale.map((issue) => ({
            code: open(issue, 'font-mono text-xs whitespace-nowrap text-muted-foreground hover:text-foreground', issue.code),
            title: open(issue, undefined, issue.title),
            days: issue.daysWithoutChanges,
          }))}
        />
      )}
    </ChartCard>
  )
}
