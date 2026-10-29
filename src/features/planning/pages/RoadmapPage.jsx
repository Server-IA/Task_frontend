import { Fragment, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Map as MapIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/common/Segmented'
import { EmptyState, ErrorState } from '@/components/common/States'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace, useIsManager } from '@/features/workspaces/hooks'
import { useElementWidth } from '@/hooks/useElementWidth'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatShortDate } from '@/lib/dates'
import { projectPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { usePlanningList } from '../hooks'
import { ROADMAP_SCALES, buildTimeline, itemEnd, itemRange } from '../roadmap'

/**
 * Colores de cada tipo de barra: ciclos según su estado y módulos en el dorado de los gráficos.
 * `onFill` es el color del texto sobre la parte rellena (avance) de la barra.
 */
const KINDS = {
  CURRENT: {
    label: 'Ciclo en curso',
    swatch: 'bg-ok-dot',
    bar: 'border-ok-dot bg-ok-soft',
    onFill: 'text-white dark:text-[#0C0B0A]',
  },
  UPCOMING: {
    label: 'Ciclo próximo',
    swatch: 'bg-[#3B82F6] dark:bg-[#8CCBFF]',
    bar: 'border-[#3B82F6] bg-[#E1F0FF] dark:border-[#8CCBFF] dark:bg-[#132A3D]',
    onFill: 'text-white dark:text-[#0C0B0A]',
  },
  DRAFT: {
    label: 'Borrador',
    swatch: 'bg-[#9E978C] dark:bg-[#A59E93]',
    bar: 'border-dashed border-[#9E978C] bg-muted dark:border-[#A59E93]',
    onFill: 'text-[#23201B] dark:text-[#0C0B0A]',
  },
  COMPLETED: {
    label: 'Ciclo terminado',
    swatch: 'bg-[#67615A] dark:bg-[#8A8378]',
    bar: 'border-[#67615A] bg-column dark:border-[#8A8378]',
    onFill: 'text-white dark:text-[#0C0B0A]',
  },
  module: {
    label: 'Módulo',
    swatch: 'bg-chart-series',
    bar: 'border-chart-series bg-accent-soft',
    onFill: 'text-white dark:text-[#12110F]',
  },
}

const HEADER_HEIGHT = 'h-[46px]'
const SECTION_HEIGHT = 'h-8'
const ROW_HEIGHT = 'h-13'

const byStart = (a, b) => (itemRange(a)?.start ?? 0) - (itemRange(b)?.start ?? 0)

/** Ancho de la columna «Plan» (variable CSS que cambia con el tamaño de pantalla). */
const planColumnWidth = (element) =>
  element ? parseFloat(getComputedStyle(element).getPropertyValue('--plan-col')) || 0 : 0

/** Hoja de ruta: ciclos y módulos del proyecto en el tiempo, con su avance y la línea de hoy. */
export function RoadmapPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const canManage = useIsManager()
  const [searchParams, setSearchParams] = useSearchParams()
  const scale = ROADMAP_SCALES[searchParams.get('scale')] ? searchParams.get('scale') : 'weeks'
  const cycles = usePlanningList('cycles', workspace.slug, project.id)
  const modules = usePlanningList('modules', workspace.slug, project.id)
  const scrollRef = useRef(null)
  const base = `/${workspace.slug}/projects/${project.id}`

  const isLoading = cycles.isLoading || modules.isLoading
  const error = cycles.error ?? modules.error

  const sections = useMemo(() => {
    const withKind = (items, kind) => (items ?? []).map((item) => ({ ...item, kind, colors: KINDS[kind === 'cycles' ? item.status : 'module'] ?? KINDS.DRAFT }))
    return [
      { key: 'cycles', name: 'ciclos', items: withKind(cycles.data, 'cycles') },
      { key: 'modules', name: 'módulos', items: withKind(modules.data, 'modules') },
    ].map((section) => ({
      ...section,
      dated: section.items.filter((item) => itemRange(item)).sort(byStart),
      undated: section.items.filter((item) => !itemRange(item)),
    }))
  }, [cycles.data, modules.data])

  const dated = useMemo(() => sections.flatMap((section) => section.dated), [sections])
  const undated = sections.flatMap((section) => section.undated)
  // La posición de hoy no depende del ancho del panel (solo se agregan columnas al final)
  const todayX = useMemo(() => buildTimeline(dated, scale).todayX, [dated, scale])

  /** Deja hoy a un tercio del ancho visible de la línea de tiempo. */
  const scrollToToday = useCallback(
    (behavior = 'smooth') => {
      const element = scrollRef.current
      if (!element) return
      element.scrollTo({ left: Math.max(0, todayX - (element.clientWidth - planColumnWidth(element)) / 3), behavior })
    },
    [todayX],
  )

  // Al abrir la página o cambiar de escala, la vista arranca en hoy
  useLayoutEffect(() => {
    if (!isLoading) scrollToToday('instant')
  }, [isLoading, scale, scrollToToday])

  const empty = !isLoading && !error && dated.length === 0 && undated.length === 0

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: 'hoja-de-ruta' }]}
        title="Hoja de ruta"
        documentTitle={['Hoja de ruta', project.name]}
        description="Ciclos y módulos en el tiempo, con su avance. La línea marca hoy."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl" onClick={() => scrollToToday()} disabled={dated.length === 0}>
              Hoy
            </Button>
            <Segmented
              label="Escala"
              value={scale}
              onChange={(value) => setSearchParams(value === 'weeks' ? {} : { scale: value }, { replace: true })}
              options={Object.entries(ROADMAP_SCALES).map(([value, config]) => ({ value, label: config.label }))}
            />
          </>
        }
      />
      <PageBody className="flex flex-col gap-3.5">
        {isLoading && <Skeleton className="h-80 rounded-2xl" />}
        {error && <ErrorState error={error} onRetry={() => (cycles.error ? cycles.refetch() : modules.refetch())} homeLink={`${base}/issues`} />}
        {empty && (
          <EmptyState
            icon={MapIcon}
            title="Todavía no hay ciclos ni módulos"
            description={
              canManage
                ? 'Crea ciclos o módulos con fechas y aparecerán aquí, en el tiempo.'
                : 'Cuando el project manager cree ciclos o módulos con fechas, aparecerán aquí.'
            }
            action={
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to={`${base}/cycles`}>Ir a ciclos</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={`${base}/modules`}>Ir a módulos</Link>
                </Button>
              </div>
            }
          />
        )}
        {!isLoading && !error && !empty && (
          <>
            <TimelinePanel sections={sections} dated={dated} scale={scale} base={base} scrollRef={scrollRef} />
            <Legend sections={sections} undated={undated} base={base} canManage={canManage} />
          </>
        )}
      </PageBody>
    </>
  )
}

/**
 * Panel con scroll horizontal: columna «Plan» fija y la línea de tiempo, que llena al menos el ancho visible.
 * Se monta cuando ya hay datos, así puede medir el panel desde el principio.
 */
function TimelinePanel({ sections, dated, scale, base, scrollRef }) {
  const planRef = useRef(null)
  const panelWidth = useElementWidth(scrollRef, 0)
  const planWidth = useElementWidth(planRef, 0)
  const timeline = useMemo(
    () => buildTimeline(dated, scale, new Date(), Math.max(0, panelWidth - planWidth)),
    [dated, scale, panelWidth, planWidth],
  )

  return (
    <section aria-label="Línea de tiempo" className="tf-panel overflow-hidden">
      <div ref={scrollRef} className="overflow-x-auto [--plan-col:150px] sm:[--plan-col:250px]">
        <div className="flex" style={{ width: `calc(var(--plan-col) + ${timeline.width}px)` }}>
          <PlanColumn ref={planRef} sections={sections} base={base} />
          <TimelineColumn sections={sections} timeline={timeline} base={base} />
        </div>
      </div>
    </section>
  )
}

/** Columna fija de la izquierda: nombre, fechas y avance de cada ciclo o módulo. */
function PlanColumn({ ref, sections, base }) {
  return (
    <div ref={ref} className="sticky left-0 z-10 w-(--plan-col) shrink-0 border-r bg-card">
      <div
        className={cn(
          'flex items-end border-b bg-column px-4 pb-2.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase',
          HEADER_HEIGHT,
        )}
      >
        Plan
      </div>
      {sections.map((section) => (
        <Fragment key={section.key}>
          <div className={cn('flex items-center border-b px-4 font-mono text-[11px] text-muted-foreground', SECTION_HEIGHT)}>
            // {section.name}
          </div>
          {section.dated.length === 0 && <div className={cn('border-b', ROW_HEIGHT)} />}
          {section.dated.map((item) => (
            <Link
              key={item.id}
              to={`${base}/${section.key}/${item.id}`}
              className={cn('flex items-center gap-2.5 border-b px-4 hover:bg-subtle', ROW_HEIGHT)}
            >
              <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-[3px]', item.colors.swatch)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{item.name}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">{dateText(item)}</span>
              </span>
              <span className="hidden font-mono text-xs font-semibold sm:inline">{item.progress.percentage}%</span>
            </Link>
          ))}
        </Fragment>
      ))}
    </div>
  )
}

/** Línea de tiempo: encabezado (meses y semanas), cuadrícula, línea de hoy y las barras. */
function TimelineColumn({ sections, timeline, base }) {
  return (
    <div className="relative shrink-0" style={{ width: timeline.width }}>
      <div className={cn('relative border-b bg-column', HEADER_HEIGHT)}>
        {timeline.groups.map((group) => (
          <span
            key={group.key}
            className="absolute top-1.5 border-l first:border-l-0"
            style={{ left: group.x, width: group.width }}
          >
            {/* El nombre del mes se queda visible junto a la columna fija mientras se desplaza */}
            <span className="sticky left-[var(--plan-col)] block w-fit max-w-full truncate px-2 text-xs font-semibold">
              {group.label}
            </span>
          </span>
        ))}
        {timeline.columns.map((column) => (
          <span
            key={column.key}
            className={cn(
              'absolute bottom-1.5 truncate px-2 font-mono text-[10px]',
              column.current ? 'font-semibold text-late' : 'text-muted-foreground',
            )}
            style={{ left: column.x, width: column.width }}
          >
            {column.label}
          </span>
        ))}
        <span aria-hidden="true" className="absolute bottom-0 h-2.5 w-0.5 -translate-x-1/2 bg-late" style={{ left: timeline.todayX }} />
      </div>

      {/* Cuadrícula y línea de hoy por debajo de las barras */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[46px] bottom-0">
        {timeline.columns.slice(1).map((column) => (
          <span key={column.key} className="absolute inset-y-0 w-px bg-chart-grid" style={{ left: column.x }} />
        ))}
        <span className="absolute inset-y-0 z-[1] w-0.5 -translate-x-1/2 bg-late/75" style={{ left: timeline.todayX }} />
      </div>

      {sections.map((section) => (
        <Fragment key={section.key}>
          <div className={cn('border-b', SECTION_HEIGHT)} />
          {section.dated.length === 0 && (
            <div className={cn('relative flex items-center border-b px-4 text-xs text-muted-foreground', ROW_HEIGHT)}>
              <span className="sticky left-[calc(var(--plan-col)+1rem)]">Sin {section.name} con fechas</span>
            </div>
          )}
          {section.dated.map((item) => (
            <div key={item.id} className={cn('relative border-b', ROW_HEIGHT)}>
              <TimelineBar item={item} position={timeline.bar(item)} to={`${base}/${section.key}/${item.id}`} />
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  )
}

/** Por debajo de este ancho el nombre no cabe en la barra y va a su derecha. */
const MIN_LABEL_WIDTH = 72

function TimelineBar({ item, position, to }) {
  const percentage = item.progress.percentage
  const labelInside = position.width >= MIN_LABEL_WIDTH
  return (
    <>
      <Link
        to={to}
        title={`${item.name} · ${dateText(item)} · ${percentage}% completado`}
        className={cn(
          'absolute top-3 z-[2] h-7 overflow-hidden rounded-lg border transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:hover:brightness-110',
          item.colors.bar,
        )}
        style={{ left: position.left, width: position.width }}
      >
        {labelInside && (
          <span className="relative block truncate px-2.25 text-xs leading-[26px] font-semibold text-foreground">{item.name}</span>
        )}
        {/* Relleno del avance con una copia del nombre en el color que contrasta con él: cada parte del texto se lee */}
        <span aria-hidden="true" className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${percentage}%` }}>
          <span className={cn('absolute inset-0 opacity-85', item.colors.swatch)} />
          {labelInside && (
            <span
              className={cn('relative block truncate px-2.25 text-xs leading-[26px] font-semibold', item.colors.onFill)}
              style={{ width: position.width - 2 }}
            >
              {item.name}
            </span>
          )}
        </span>
      </Link>
      {!labelInside && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-3 z-[2] text-xs leading-7 font-semibold whitespace-nowrap"
          style={{ left: position.left + position.width + 6 }}
        >
          {item.name}
        </span>
      )}
    </>
  )
}

/** Leyenda de colores, la marca de hoy y los ciclos/módulos que no tienen fechas. */
function Legend({ sections, undated, base, canManage }) {
  const kinds = [...new Set(sections.flatMap((section) => section.dated.map((item) => item.colors)))]
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-xs text-muted-foreground">
      {Object.values(KINDS)
        .filter((kind) => kinds.includes(kind))
        .map((kind) => (
          <span key={kind.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('size-2.5 rounded-[3px]', kind.swatch)} />
            {kind.label}
          </span>
        ))}
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-0.5 bg-late" />
        hoy · {formatShortDate(new Date())}
      </span>
      {undated.length > 0 && (
        <span className="sm:ml-auto">
          Sin fechas:{' '}
          {undated.map((item, index) => (
            <Fragment key={item.id}>
              {index > 0 && ', '}
              <Link to={`${base}/${item.kind}/${item.id}`} className="font-mono text-foreground hover:underline">
                {item.name}
              </Link>
            </Fragment>
          ))}
          {canManage && ' · ponles fechas para verlos aquí'}
        </span>
      )}
    </div>
  )
}

/** «15 oct → 29 oct» (o un solo día). */
function dateText(item) {
  const start = item.startDate
  const end = itemEnd(item)
  if (start && end && start !== end) return `${formatShortDate(start)} → ${formatShortDate(end)}`
  return formatShortDate(start ?? end)
}
