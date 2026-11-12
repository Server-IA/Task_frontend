import { useRef, useState } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'
import { t, tx } from '@/i18n'
import { formatShortDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { barPath, niceScale } from '../chartMath'
import { ChartTooltip, TooltipLabel } from './ChartCard'

const HEIGHT = 210
const TOP = 16
const BASELINE = 180
const LEFT = 30
const RIGHT = 6
/** Barras finas: nunca llenan el espacio de su semana. */
const MAX_BAR_WIDTH = 24

/** Qué se cuenta por semana: tareas cerradas (`completed`) o pull requests fusionados (`merged`). */
const KINDS = {
  completed: {
    count: (week) => week.completed,
    summary: (weeks) => t('Tareas cerradas por semana: {weeks}', { weeks }),
    bar: (date, count) => t('Semana del {date}: {count} cerradas', { date, count }),
    tooltip: (count, strong) =>
      count === 1 ? tx('{count} cerrada', { count: strong }) : tx('{count} cerradas', { count: strong }),
  },
  merged: {
    count: (week) => week.merged,
    summary: (weeks) => t('Pull requests fusionados por semana: {weeks}', { weeks }),
    bar: (date, count) => t('Semana del {date}: {count} fusionados', { date, count }),
    tooltip: (count, strong) =>
      count === 1 ? tx('{count} fusionado', { count: strong }) : tx('{count} fusionados', { count: strong }),
  },
}

/**
 * Columnas por semana: tareas cerradas o, con `kind="merged"`, pull requests fusionados. Una sola serie (sin
 * leyenda): el título dice qué se mide. Etiqueta directa solo en la última semana; el resto está en el eje, en el
 * globo al pasar el puntero (o con el foco del teclado) y en la tabla.
 * @param {{ weeks: { weekStart: string, completed?: number, merged?: number }[], kind?: 'completed' | 'merged' }} props
 */
export function ThroughputChart({ weeks: data, kind = 'completed' }) {
  const texts = KINDS[kind]
  const weeks = data.map((week) => ({ weekStart: week.weekStart, completed: texts.count(week) }))
  const containerRef = useRef(null)
  const width = useElementWidth(containerRef)
  const [active, setActive] = useState(null)

  const { max, ticks } = niceScale(Math.max(0, ...weeks.map((week) => week.completed)))
  const y = (value) => BASELINE - (value / max) * (BASELINE - TOP)
  const slot = (width - LEFT - RIGHT) / weeks.length
  const barWidth = Math.min(MAX_BAR_WIDTH, slot * 0.6)
  // Con semanas angostas se rotula una sí y otra no (siempre la última)
  const labelEvery = slot < 46 ? 2 : 1
  const bars = weeks.map((week, index) => {
    const cx = LEFT + slot * index + slot / 2
    return { ...week, cx, top: y(week.completed), label: formatShortDate(week.weekStart) }
  })
  const last = bars.at(-1)
  const summary = texts.summary(bars.map((bar) => `${bar.label}, ${bar.completed}`).join('; '))

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label={summary} className="block">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={LEFT} x2={width - RIGHT} y1={y(tick)} y2={y(tick)} className="stroke-chart-grid" strokeWidth="1" />
            <text x={LEFT - 8} y={y(tick) + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
              {tick}
            </text>
          </g>
        ))}
        {/* La clave es el periodo: al cambiarlo (4, 8, 12 semanas) se pintan todas de nuevo y crecen todas juntas. Con
            cada columna por su cuenta solo crecían las semanas que entraban, y se veía una sola moviéndose */}
        <g key={`${bars.length}:${bars[0]?.weekStart}`}>
          {bars.map((bar, index) => (
            <g key={bar.weekStart}>
              <path
                d={barPath(bar.cx - barWidth / 2, bar.top, barWidth, BASELINE)}
                // `tf-col`: al abrir las estadísticas (o cambiar de periodo) crece desde la base, una columna tras otra
                style={{ '--i': index }}
                className={cn('tf-col fill-chart-series transition-[fill] duration-150', active === index && 'fill-accent-text')}
              />
              {(index === bars.length - 1 || (bars.length - 1 - index) % labelEvery === 0) && (
                <text x={bar.cx} y={HEIGHT - 10} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                  {bar.label}
                </text>
              )}
            </g>
          ))}
        </g>
        {last && active !== bars.length - 1 && (
          <text x={last.cx} y={last.top - 6} textAnchor="middle" className="fill-foreground font-mono text-[11px] font-semibold">
            {last.completed}
          </text>
        )}
        {/* Zonas de puntero y foco: toda la columna de la semana, no solo la barra */}
        {bars.map((bar, index) => (
          <rect
            key={bar.weekStart}
            x={LEFT + slot * index}
            y={TOP}
            width={slot}
            height={BASELINE - TOP + 4}
            fill="transparent"
            tabIndex={0}
            role="img"
            aria-label={texts.bar(bar.label, bar.completed)}
            className="outline-none"
            onPointerEnter={() => setActive(index)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>
      {active !== null && bars[active] && (
        <ChartTooltip x={bars[active].cx} y={bars[active].top} containerWidth={width}>
          <TooltipLabel>{t('semana del {date}', { date: bars[active].label })}</TooltipLabel>
          {texts.tooltip(bars[active].completed, <strong className="font-semibold">{bars[active].completed}</strong>)}
        </ChartTooltip>
      )}
    </div>
  )
}
