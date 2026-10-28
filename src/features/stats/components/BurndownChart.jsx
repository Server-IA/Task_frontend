import { useRef, useState } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useElementWidth } from '@/hooks/useElementWidth'
import { formatShortDate } from '@/lib/dates'
import { formatDecimal, idealRemaining, linePath, nearestIndex, niceScale } from '../chartMath'
import { ChartTooltip, TooltipLabel } from './ChartCard'

const HEIGHT = 210
const TOP = 16
const BASELINE = 178
const LEFT = 26
const RIGHT = 14

/**
 * Datos del burndown listos para dibujar: día de cada punto (desde el inicio), restantes e ideal.
 * @param {import('@/api/types').Burndown} burndown
 */
export function burndownSeries(burndown) {
  const start = parseISO(burndown.startDate)
  const days = Math.max(0, differenceInCalendarDays(parseISO(burndown.endDate), start))
  const points = (burndown.points ?? []).map((point) => {
    const day = differenceInCalendarDays(parseISO(point.date), start)
    return { ...point, day, ideal: idealRemaining(burndown.total, day, days) }
  })
  return { days, points }
}

/**
 * Burndown del ciclo en curso: restantes reales (línea dorada) contra el ideal (gris punteado).
 * Crosshair con globo al mover el puntero o con las flechas del teclado.
 * @param {{ burndown: import('@/api/types').Burndown }} props
 */
export function BurndownChart({ burndown }) {
  const containerRef = useRef(null)
  const width = useElementWidth(containerRef, 380)
  const [active, setActive] = useState(null)

  const { days, points } = burndownSeries(burndown)
  const { max, ticks } = niceScale(Math.max(burndown.total, ...points.map((point) => point.remaining)))
  const plotRight = width - RIGHT
  const x = (day) => (days === 0 ? (LEFT + plotRight) / 2 : LEFT + (day / days) * (plotRight - LEFT))
  const y = (value) => BASELINE - (value / max) * (BASELINE - TOP)
  const xs = points.map((point) => x(point.day))
  const last = points.at(-1)
  const lastX = last ? x(last.day) : LEFT
  const lastY = last ? y(last.remaining) : BASELINE
  // La etiqueta del final va a la izquierda del punto, salvo que no quepa
  const labelOnLeft = lastX - LEFT > 96
  // Fechas de inicio y fin solo si no chocan con «hoy»
  const showStart = !last || lastX - LEFT > 56
  const showEnd = !last || plotRight - lastX > 56

  const moveTo = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect()
    setActive(nearestIndex(xs, ((clientX - rect.left) / rect.width) * width))
  }

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const step = event.key === 'ArrowLeft' ? -1 : 1
    setActive((current) => Math.min(points.length - 1, Math.max(0, (current ?? points.length - 1) + step)))
  }

  const current = active !== null ? points[active] : null
  const summary = last
    ? `Burndown de ${burndown.name}: quedan ${last.remaining} de ${burndown.total} tareas; el ideal hoy sería ${formatDecimal(last.ideal)}`
    : `Burndown de ${burndown.name}: todavía sin datos`

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label={summary} className="block">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={LEFT} x2={plotRight} y1={y(tick)} y2={y(tick)} className="stroke-chart-grid" strokeWidth="1" />
            <text x={LEFT - 8} y={y(tick) + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
              {tick}
            </text>
          </g>
        ))}
        {showStart && (
          <text x={LEFT} y={HEIGHT - 10} className="fill-muted-foreground font-mono text-[10px]">
            {formatShortDate(burndown.startDate)}
          </text>
        )}
        {showEnd && (
          <text x={plotRight} y={HEIGHT - 10} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
            {formatShortDate(burndown.endDate)}
          </text>
        )}
        {last && (
          <>
            <line x1={lastX} x2={lastX} y1={TOP - 6} y2={BASELINE} className="stroke-dash" strokeWidth="1" strokeDasharray="3 3" />
            <text x={lastX} y={HEIGHT - 10} textAnchor="middle" className="fill-foreground font-mono text-[10px]">
              hoy
            </text>
          </>
        )}
        <path
          d={linePath([
            [x(0), y(burndown.total)],
            [x(days), y(0)],
          ])}
          fill="none"
          className="stroke-chart-ref"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        {points.length > 0 && (
          <path
            d={linePath(points.map((point) => [x(point.day), y(point.remaining)]))}
            fill="none"
            className="stroke-chart-series"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {current && (
          <>
            <line x1={x(current.day)} x2={x(current.day)} y1={TOP - 6} y2={BASELINE} className="stroke-muted-foreground" strokeWidth="1" />
            <circle cx={x(current.day)} cy={y(current.ideal)} r="4" className="fill-card stroke-chart-ref" strokeWidth="2" />
          </>
        )}
        {last && (
          <circle
            cx={current ? x(current.day) : lastX}
            cy={current ? y(current.remaining) : lastY}
            r="4.5"
            className="fill-chart-series stroke-card"
            strokeWidth="2"
          />
        )}
        {last && !current && (
          <text
            x={labelOnLeft ? lastX - 9 : lastX + 9}
            y={lastY - 10}
            textAnchor={labelOnLeft ? 'end' : 'start'}
            className="fill-foreground font-mono text-[11px] font-semibold"
          >
            {last.remaining} {last.remaining === 1 ? 'restante' : 'restantes'}
          </text>
        )}
        {/* Capa del crosshair: el puntero solo tiene que estar cerca de un día, no sobre la línea */}
        {points.length > 0 && (
          <rect
            x={LEFT}
            y={TOP - 6}
            width={plotRight - LEFT}
            height={BASELINE - TOP + 6}
            fill="transparent"
            tabIndex={0}
            role="img"
            aria-label="Recorrer los días con las flechas izquierda y derecha"
            className="cursor-crosshair outline-none"
            onPointerMove={(event) => moveTo(event.clientX)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(points.length - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={onKeyDown}
          />
        )}
      </svg>
      {current && (
        <ChartTooltip x={x(current.day)} y={Math.min(y(current.remaining), y(current.ideal))} containerWidth={width}>
          <TooltipLabel>{formatShortDate(current.date)}</TooltipLabel>
          <strong className="font-semibold">{current.remaining}</strong> {current.remaining === 1 ? 'restante' : 'restantes'}
          <span className="opacity-75"> · ideal {formatDecimal(current.ideal)}</span>
        </ChartTooltip>
      )}
    </div>
  )
}
