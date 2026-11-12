import { useId, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { FileDown, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import { Segmented } from '@/components/common/Segmented'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { GhMark } from '@/features/github/GithubParts'
import { IssueFiltersBar } from '@/features/issues/components/IssueFiltersBar'
import { DatePicker } from '@/features/issues/components/PropertyPickers'
import { useIssueFilters } from '@/features/issues/useIssueFilters'
import { useProjectMeta } from '@/features/issues/useIssueHelpers'
import { usePlanningList } from '@/features/planning/hooks'
import { useCurrentProject } from '@/features/projects/hooks'
import { DataTable } from '@/features/stats/components/ChartCard'
import { percent } from '@/features/stats/chartMath'
import { developmentFigures, formatDuration } from '@/features/stats/developmentModel'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { t } from '@/i18n'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { notifyError } from '@/lib/notify'
import { projectPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { useDownloadReport, useReportPreview } from '../hooks'
import {
  DEFAULT_REPORT_OPTIONS,
  DEVELOPMENT_WEEKS,
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

  const rangesOk = !isRangeReversed(options.createdFrom, options.createdTo) && !isRangeReversed(options.dueFrom, options.dueTo)
  const preview = useReportPreview(workspace.slug, project.id, previewParams(queryFilters, options), { enabled: rangesOk })
  const download = useDownloadReport(workspace.slug, project.id)
  // La sección de desarrollo solo se ofrece (y solo viaja) si el proyecto tiene repositorios de GitHub
  const github = (preview.data?.githubRepositories ?? 0) > 0
  const effective = github ? options : { ...options, development: false }
  const optionsError = reportOptionsError(options, { github })
  const total = preview.data?.totals?.total ?? 0
  const fileName = reportFileName(project.identifier, format(new Date(), 'yyyy-MM-dd'))
  // Sin tareas el PDF no tiene sentido, salvo que lleve el desarrollo
  const canGenerate = !optionsError && preview.isSuccess && (total > 0 || effective.development) && !download.isPending

  const generate = () => {
    if (!canGenerate) return
    download.mutate(
      { params: reportParams(queryFilters, effective), fileName },
      {
        onSuccess: () => toast.success(t('Reporte generado'), { description: fileName }),
        onError: (error) => notifyError(error, t('No se pudo generar el reporte')),
      },
    )
  }

  const generateButton = (
    <Button
      className="h-10 rounded-xl px-3.5"
      onClick={generate}
      disabled={!canGenerate}
      title={optionsError ?? (preview.isSuccess && total === 0 && !effective.development ? t('Ninguna tarea cumple estos filtros') : undefined)}
    >
      {download.isPending ? <Spinner /> : <FileDown strokeWidth={2.5} />}
      {download.isPending ? t('Generando…') : t('Generar PDF')}
    </Button>
  )

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: t('reportes') }]}
        title={t('Reportes')}
        documentTitle={[t('Reportes'), project.name]}
        description={t('Elige las tareas y cómo presentarlas: el reporte se descarga en PDF, con el logo y los filtros que pusiste.')}
        actions={generateButton}
      />
      <PageBody className="flex flex-col gap-3.5">
        <section aria-label={t('Qué tareas entran')} className="tf-panel flex flex-col gap-3.5 px-4.5 py-4">
          <StepTitle step="1" title={t('Qué tareas entran')} hint={t('Los mismos filtros de la lista de tareas, más rangos de fechas.')} />
          <IssueFiltersBar
            filters={filters}
            activeCount={activeCount}
            setFilter={issueFilters.setFilter}
            clearFilters={issueFilters.clearFilters}
            meta={meta}
            searchPlaceholder={t('buscar por título o código')}
          />
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3 border-t border-dashed px-1 pt-3.5">
            <DateRange
              label={t('creadas:')}
              fromPlaceholder={t('Creadas desde')}
              toPlaceholder={t('Creadas hasta')}
              clearLabel={t('Quitar el rango de creadas')}
              from={options.createdFrom}
              to={options.createdTo}
              onFrom={setOption('createdFrom')}
              onTo={setOption('createdTo')}
            />
            <DateRange
              label={t('fecha límite:')}
              fromPlaceholder={t('Fecha límite desde')}
              toPlaceholder={t('Fecha límite hasta')}
              clearLabel={t('Quitar el rango de fecha límite')}
              from={options.dueFrom}
              to={options.dueTo}
              onFrom={setOption('dueFrom')}
              onTo={setOption('dueTo')}
            />
          </div>
        </section>

        <div className="flex flex-col gap-3.5 xl:flex-row xl:items-start">
          <section aria-label={t('Vista previa')} className="tf-panel flex min-w-0 flex-1 flex-col gap-3.5 px-4.5 py-4">
            <StepTitle title={t('Vista previa')} hint={t('Lo que va a traer el PDF con estos filtros.')} />
            <ReportPreview preview={preview} rangesOk={rangesOk} development={effective.development} />
          </section>

          <section aria-label={t('Cómo se presenta')} className="tf-panel flex flex-col gap-4 px-4.5 py-4 xl:w-[380px] xl:shrink-0">
            <StepTitle step="2" title={t('Cómo se presenta')} />
            <OptionSelect label={t('Agrupar por')} value={options.groupBy} onChange={setOption('groupBy')} options={REPORT_GROUPS} />
            <OptionSelect label={t('Ordenar por')} value={options.sort} onChange={setOption('sort')} options={REPORT_SORTS} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">{t('Secciones')}</legend>
              <ul className="flex flex-col overflow-hidden rounded-xl border">
                {REPORT_SECTIONS.filter((section) => !section.github || github).map((section, index) => (
                  <SectionSwitch
                    key={section.key}
                    section={section}
                    checked={options[section.key]}
                    onChange={setOption(section.key)}
                    className={index > 0 ? 'border-t' : undefined}
                  >
                    {section.key === 'development' && options.development && (
                      <Segmented
                        size="sm"
                        label={t('Semanas del desarrollo')}
                        value={String(options.developmentWeeks)}
                        onChange={(value) => setOption('developmentWeeks')(Number(value))}
                        options={DEVELOPMENT_WEEKS.map((weeks) => ({ value: String(weeks), label: t('{count} semanas', { count: weeks }) }))}
                        className="self-start"
                      />
                    )}
                  </SectionSwitch>
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
              <p className="text-xs text-muted-foreground">{t('PDF A4 horizontal, con el logo de TaskFlow, quién lo generó y la fecha.')}</p>
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

/**
 * Rango de fechas «desde – hasta» (los dos opcionales); avisa si queda al revés. Los textos llegan ya armados
 * («creadas:», «Creadas desde»…): cada idioma ordena distinto las palabras.
 */
function DateRange({ label, fromPlaceholder, toPlaceholder, clearLabel, from, to, onFrom, onTo }) {
  const labelId = useId()
  const reversed = isRangeReversed(from, to)
  const chip = (empty) =>
    cn('h-8 rounded-full border px-3 text-[13px]', empty ? 'border-dashed border-dash text-muted-foreground' : 'border-border bg-card')
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span id={labelId} className="w-24 font-mono text-xs text-muted-foreground">
          {label}
        </span>
        <DatePicker value={from} onChange={onFrom} placeholder={fromPlaceholder} className={chip(!from)} />
        <span aria-hidden="true" className="text-muted-foreground">
          –
        </span>
        <DatePicker value={to} onChange={onTo} placeholder={toPlaceholder} className={chip(!to)} />
        {(from || to) && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              onFrom(null)
              onTo(null)
            }}
            aria-label={clearLabel}
          >
            <X />
          </Button>
        )}
      </div>
      {reversed && (
        <p role="alert" className="text-xs text-destructive">
          {t('«Desde» es posterior a «hasta».')}
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

/** Una sección del PDF con su interruptor; `children` va debajo (el periodo del desarrollo). */
function SectionSwitch({ section, checked, onChange, className, children }) {
  const id = useId()
  return (
    <li className={cn('flex flex-col gap-2 px-3 py-2', className)}>
      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <label htmlFor={id} className="text-sm font-medium">
            {section.label}
          </label>
          <span className="text-xs text-muted-foreground">{section.hint}</span>
        </span>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
      {children}
    </li>
  )
}

/** Totales y repartos de lo que traerá el reporte y, si va, el desarrollo. */
function ReportPreview({ preview, rangesOk, development }) {
  const { data, isLoading, isPlaceholderData, error, refetch } = preview
  if (!rangesOk) {
    return <p className="rounded-xl border border-dashed border-dash px-4 py-8 text-center text-sm text-muted-foreground">{t('Corrige el rango de fechas para ver la vista previa.')}</p>
  }
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5" aria-label={t('Cargando la vista previa')}>
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
    { label: t('Tareas'), value: totals.total },
    { label: t('Abiertas'), value: totals.open },
    { label: t('Completadas'), value: totals.completed, tone: totals.completed > 0 && 'text-ok' },
    { label: t('Canceladas'), value: totals.cancelled },
    { label: t('Vencidas'), value: totals.overdue, tone: totals.overdue > 0 && 'text-late' },
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
          {t('Hay {total} tareas con estos filtros: el reporte trae las primeras {max}. Afina los filtros para verlas todas.', {
            total: data.totalMatching,
            max: data.maxIssues,
          })}
        </p>
      )}
      {totals.total === 0 ? (
        <p className="rounded-xl border border-dashed border-dash px-4 py-8 text-center text-sm text-muted-foreground">
          {t('Ninguna tarea cumple estos filtros. Quita alguno para generar el reporte.')}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-6 gap-y-4">
          <Breakdown title={t('Por estado')} counts={data.byState} total={totals.total} />
          <Breakdown title={t('Por prioridad')} counts={data.byPriority} total={totals.total} />
          {/* Una tarea con dos asignados cuenta para las dos personas: ahí un porcentaje del total engañaría */}
          <Breakdown title={t('Por persona')} counts={data.byAssignee} />
          <Breakdown title={t('Por tipo')} counts={data.byType} total={totals.total} />
        </div>
      )}
      {development && data.development && <DevelopmentPreview stats={data.development} />}
    </div>
  )
}

/** La sección de desarrollo como irá en el PDF: las cinco cifras y la tabla por workflow. */
function DevelopmentPreview({ stats }) {
  return (
    <section aria-label={t('Desarrollo (GitHub)')} className="flex flex-col gap-3 border-t border-dashed pt-3.5">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <GhMark size="sm" />
        {t('Desarrollo (GitHub)')}
        <span className="font-mono text-xs font-normal text-muted-foreground">{t('últimas {weeks} semanas', { weeks: stats.weeks })}</span>
      </h3>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
        {developmentFigures(stats).map((figure) => (
          <div key={figure.key} className="rounded-xl border px-3.5 py-2.5">
            <dt className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">{figure.label}</dt>
            <dd className={cn('font-display text-[28px] leading-tight font-extrabold', figure.muted && 'text-muted-foreground')}>
              {figure.value}
              {figure.unit && <span className="ml-1 font-sans text-sm font-medium text-muted-foreground">{figure.unit}</span>}
            </dd>
            <dd className="text-xs text-muted-foreground">{figure.detail}</dd>
          </div>
        ))}
      </dl>
      {stats.workflows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('No hubo ejecuciones de Actions terminadas en el periodo.')}</p>
      ) : (
        <DataTable
          caption={t('Ejecuciones por workflow')}
          columns={[
            { key: 'name', label: t('Workflow') },
            { key: 'runs', label: t('Ejecuciones'), numeric: true },
            { key: 'success', label: t('Correctas'), numeric: true },
            { key: 'duration', label: t('Duración media'), numeric: true },
          ]}
          rows={stats.workflows.map((workflow) => ({
            name: (
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate font-semibold">{workflow.name ?? '—'}</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">{workflow.repository}</span>
              </span>
            ),
            runs: workflow.runs,
            success: t('{percent} %', { percent: percent(workflow.succeeded, workflow.runs) }),
            duration: formatDuration(workflow.averageSeconds),
          }))}
        />
      )}
    </section>
  )
}

/**
 * Un reparto como en el PDF: cada valor con su cantidad y, con `total`, qué parte del total es. Los nombres (estados,
 * prioridades, tipos, «Sin asignar») llegan del backend ya en el idioma de la persona.
 */
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
              {total > 0 && <span className="ml-2 text-muted-foreground">{t('{percent} %', { percent: Math.round((row.count / total) * 100) })}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
