import { useId, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { FileDown, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { IssueFiltersBar } from '@/features/issues/components/IssueFiltersBar'
import { DatePicker } from '@/features/issues/components/PropertyPickers'
import { useIssueFilters } from '@/features/issues/useIssueFilters'
import { useProjectMeta } from '@/features/issues/useIssueHelpers'
import { usePlanningList } from '@/features/planning/hooks'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { notifyError } from '@/lib/notify'
import { projectPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { useDownloadReport, useReportPreview } from '../hooks'
import {
  DEFAULT_REPORT_OPTIONS,
  isRangeReversed,
  previewParams,
  REPORT_GROUPS,
  REPORT_SECTIONS,
  REPORT_SORTS,
  reportFileName,
  reportOptionsError,
  reportParams,
} from '../reportParams'

/**
 * Reportes del proyecto: se eligen las tareas con los mismos filtros de la lista (en la URL, así un enlace abre el
 * mismo reporte) más rangos de fechas, se decide cómo se presentan y «Generar PDF» descarga el archivo que arma el
 * backend, con el logo de TaskFlow. A la derecha, la vista previa de lo que va a traer.
 */
export function ReportsPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const projectMeta = useProjectMeta(workspace.slug, project.id)
  const { data: cycles } = usePlanningList('cycles', workspace.slug, project.id)
  const { data: modules } = usePlanningList('modules', workspace.slug, project.id)
  const meta = useMemo(() => ({ ...projectMeta, cycles: cycles ?? [], modules: modules ?? [] }), [projectMeta, cycles, modules])
  const issueFilters = useIssueFilters()
  const { filters, queryFilters, activeCount } = issueFilters
  const [options, setOptions] = useState(DEFAULT_REPORT_OPTIONS)
  const setOption = (key) => (value) => setOptions((current) => ({ ...current, [key]: value }))

  const optionsError = reportOptionsError(options)
  const rangesOk = !isRangeReversed(options.createdFrom, options.createdTo) && !isRangeReversed(options.dueFrom, options.dueTo)
  const preview = useReportPreview(workspace.slug, project.id, previewParams(queryFilters, options), { enabled: rangesOk })
  const download = useDownloadReport(workspace.slug, project.id)
  const total = preview.data?.totals?.total ?? 0
  const fileName = reportFileName(project.identifier, format(new Date(), 'yyyy-MM-dd'))
  const canGenerate = !optionsError && preview.isSuccess && total > 0 && !download.isPending

  const generate = () => {
    if (!canGenerate) return
    download.mutate(
      { params: reportParams(queryFilters, options), fileName },
      {
        onSuccess: () => toast.success('Reporte generado', { description: fileName }),
        onError: (error) => notifyError(error, 'No se pudo generar el reporte'),
      },
    )
  }

  const generateButton = (
    <Button
      className="h-10 rounded-xl px-3.5"
      onClick={generate}
      disabled={!canGenerate}
      title={optionsError ?? (preview.isSuccess && total === 0 ? 'Ninguna tarea cumple estos filtros' : undefined)}
    >
      {download.isPending ? <Spinner /> : <FileDown strokeWidth={2.5} />}
      {download.isPending ? 'Generando…' : 'Generar PDF'}
    </Button>
  )

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: 'reportes' }]}
        title="Reportes"
        documentTitle={['Reportes', project.name]}
        description="Elige las tareas y cómo presentarlas: el reporte se descarga en PDF, con el logo y los filtros que pusiste."
        actions={generateButton}
      />
      <PageBody className="flex flex-col gap-3.5">
        <section aria-label="Qué tareas entran" className="tf-panel flex flex-col gap-3.5 px-4.5 py-4">
          <StepTitle step="1" title="Qué tareas entran" hint="Los mismos filtros de la lista de tareas, más rangos de fechas." />
          <IssueFiltersBar
            filters={filters}
            activeCount={activeCount}
            setFilter={issueFilters.setFilter}
            clearFilters={issueFilters.clearFilters}
            meta={meta}
            searchPlaceholder="buscar por título o código"
          />
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3 border-t border-dashed px-1 pt-3.5">
            <DateRange
              label="Creadas"
              from={options.createdFrom}
              to={options.createdTo}
              onFrom={setOption('createdFrom')}
              onTo={setOption('createdTo')}
            />
            <DateRange
              label="Fecha límite"
              from={options.dueFrom}
              to={options.dueTo}
              onFrom={setOption('dueFrom')}
              onTo={setOption('dueTo')}
            />
          </div>
        </section>

        <div className="flex flex-col gap-3.5 xl:flex-row xl:items-start">
          <section aria-label="Vista previa" className="tf-panel flex min-w-0 flex-1 flex-col gap-3.5 px-4.5 py-4">
            <StepTitle title="Vista previa" hint="Lo que va a traer el PDF con estos filtros." />
            <ReportPreview preview={preview} rangesOk={rangesOk} />
          </section>

          <section aria-label="Cómo se presenta" className="tf-panel flex flex-col gap-4 px-4.5 py-4 xl:w-[380px] xl:shrink-0">
            <StepTitle step="2" title="Cómo se presenta" />
            <OptionSelect label="Agrupar por" value={options.groupBy} onChange={setOption('groupBy')} options={REPORT_GROUPS} />
            <OptionSelect label="Ordenar por" value={options.sort} onChange={setOption('sort')} options={REPORT_SORTS} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">Secciones</legend>
              <ul className="flex flex-col overflow-hidden rounded-xl border">
                {REPORT_SECTIONS.map((section, index) => (
                  <SectionSwitch
                    key={section.key}
                    section={section}
                    checked={options[section.key]}
                    onChange={setOption(section.key)}
                    className={index > 0 ? 'border-t' : undefined}
                  />
                ))}
              </ul>
            </fieldset>
            {optionsError && (
              <p role="alert" className="text-sm text-destructive">
                {optionsError}
              </p>
            )}
            <div className="flex flex-col gap-2.5 border-t border-dashed pt-4">
              <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate" title={fileName}>
                  {fileName}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">PDF A4 horizontal, con el logo de TaskFlow, quién lo generó y la fecha.</p>
              {generateButton}
            </div>
          </section>
        </div>
      </PageBody>
    </>
  )
}

function StepTitle({ step, title, hint }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        {step && (
          <span
            aria-hidden="true"
            className="flex size-5.5 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-semibold text-accent-text"
          >
            {step}
          </span>
        )}
        {title}
      </h2>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** Rango de fechas «desde – hasta» (los dos opcionales); avisa si queda al revés. */
function DateRange({ label, from, to, onFrom, onTo }) {
  const labelId = useId()
  const reversed = isRangeReversed(from, to)
  const chip = (empty) =>
    cn('h-8 rounded-full border px-3 text-[13px]', empty ? 'border-dashed border-dash text-muted-foreground' : 'border-border bg-card')
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span id={labelId} className="w-24 font-mono text-xs text-muted-foreground">
          {label.toLowerCase()}:
        </span>
        <DatePicker value={from} onChange={onFrom} placeholder={`${label} desde`} className={chip(!from)} />
        <span aria-hidden="true" className="text-muted-foreground">
          –
        </span>
        <DatePicker value={to} onChange={onTo} placeholder={`${label} hasta`} className={chip(!to)} />
        {(from || to) && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              onFrom(null)
              onTo(null)
            }}
            aria-label={`Quitar el rango de ${label.toLowerCase()}`}
          >
            <X />
          </Button>
        )}
      </div>
      {reversed && (
        <p role="alert" className="text-xs text-destructive">
          «Desde» es posterior a «hasta».
        </p>
      )}
    </div>
  )
}

function OptionSelect({ label, value, onChange, options }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label id={id} className="text-sm font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-labelledby={id} className="w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SectionSwitch({ section, checked, onChange, className }) {
  const id = useId()
  return (
    <li className={cn('flex items-center gap-3 px-3 py-2', className)}>
      <span className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={id} className="text-sm font-medium">
          {section.label}
        </label>
        <span className="text-xs text-muted-foreground">{section.hint}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </li>
  )
}

/** Totales y repartos de lo que traerá el reporte. */
function ReportPreview({ preview, rangesOk }) {
  const { data, isLoading, isPlaceholderData, error, refetch } = preview
  if (!rangesOk) {
    return <p className="rounded-xl border border-dashed border-dash px-4 py-8 text-center text-sm text-muted-foreground">Corrige el rango de fechas para ver la vista previa.</p>
  }
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5" aria-label="Cargando la vista previa">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-[74px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }
  if (error && !data) return <ErrorState error={error} onRetry={refetch} />
  if (!data) return null

  const { totals } = data
  const tiles = [
    { label: 'Tareas', value: totals.total },
    { label: 'Abiertas', value: totals.open },
    { label: 'Completadas', value: totals.completed, tone: totals.completed > 0 && 'text-ok' },
    { label: 'Canceladas', value: totals.cancelled },
    { label: 'Vencidas', value: totals.overdue, tone: totals.overdue > 0 && 'text-late' },
  ]

  return (
    <div aria-busy={isPlaceholderData} className={cn('flex flex-col gap-3.5 transition-opacity duration-200', isPlaceholderData && 'opacity-60')}>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border px-3.5 py-2.5">
            <dt className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">{tile.label}</dt>
            <dd className={cn('font-display text-[28px] leading-tight font-extrabold', tile.tone)}>{tile.value}</dd>
          </div>
        ))}
      </dl>
      {data.truncated && (
        <p className="rounded-xl bg-soon-soft px-3.5 py-2 text-sm text-soon">
          Hay {data.totalMatching} tareas con estos filtros: el reporte trae las primeras {data.maxIssues}. Afina los filtros para verlas todas.
        </p>
      )}
      {totals.total === 0 ? (
        <p className="rounded-xl border border-dashed border-dash px-4 py-8 text-center text-sm text-muted-foreground">
          Ninguna tarea cumple estos filtros. Quita alguno para generar el reporte.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-6 gap-y-4">
          <Breakdown title="Por estado" counts={data.byState} total={totals.total} />
          <Breakdown title="Por prioridad" counts={data.byPriority} total={totals.total} />
          {/* Una tarea con dos asignados cuenta para las dos personas: ahí un porcentaje del total engañaría */}
          <Breakdown title="Por persona" counts={data.byAssignee} />
          <Breakdown title="Por tipo" counts={data.byType} total={totals.total} />
        </div>
      )}
    </div>
  )
}

/** Un reparto como en el PDF: cada valor con su cantidad y, con `total`, qué parte del total es. */
function Breakdown({ title, counts = [], total }) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {counts.map((row) => (
          <li key={row.name} className="flex items-baseline justify-between gap-2 border-b border-dashed border-dash/60 pb-1 text-[13px] last:border-0">
            <span className="min-w-0 truncate" title={row.name}>
              {row.name}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums">
              <span className="font-semibold">{row.count}</span>
              {total > 0 && <span className="ml-2 text-muted-foreground">{Math.round((row.count / total) * 100)} %</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
