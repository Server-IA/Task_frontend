import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowRight, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common/States'
import { t, tn } from '@/i18n'
import { formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { useDiscardImport, useImport, useImports, useUndoImport } from './hooks'
import { sourceOf, sources } from './importModel'
import { SourceMark, StatusPill, UndoDialog, WizardShell } from './ImportParts'
import { ChooseStep, ConnectStep } from './ImportStart'
import { MappingStep, ProgressStep, ReportStep, ReviewStep } from './ImportRun'

/**
 * Pestaña «Importar» de los ajustes del workspace: elegir de dónde se trae el trabajo, el recorrido de una importación
 * (conectar → qué importar → equivalencias → revisar → importar → informe) y las importaciones anteriores. En qué
 * importación se está va en la URL (`job`), así se puede cerrar la página y volver, o llegar desde el aviso de la
 * Bandeja.
 * @param {{ workspace: import('@/api/types').WorkspaceResponse }} props
 */
export function ImportSettings({ workspace }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const jobId = searchParams.get('job')
  const sourceKey = searchParams.get('source')
  const go = (params, options = { replace: false }) => setSearchParams({ tab: 'import', ...params }, options)

  // Al salir de una importación se reemplaza la dirección: «Atrás» no vuelve a una que quizá ya se descartó
  if (jobId) return <ImportJobView workspace={workspace} jobId={jobId} onHome={() => go({}, { replace: true })} />
  if (sourceKey) {
    return <ConnectStep workspace={workspace} source={sourceOf(sourceKey)} onCancel={() => go({})} onJob={(job) => go({ job: job.id })} />
  }
  return (
    <div className="flex flex-col gap-3.5">
      <SourcePicker onPick={(key) => go({ source: key })} />
      <ImportHistory workspace={workspace} onOpen={(job) => go({ job: job.id })} />
    </div>
  )
}

function SourcePicker({ onPick }) {
  return (
    <section aria-labelledby="import-sources-title" className="tf-panel flex flex-col gap-3.5 px-5 pt-4.5 pb-5">
      <div>
        <h2 id="import-sources-title" className="text-[17px] font-semibold">
          {t('Trae tu trabajo a TaskFlow')}
        </h2>
        <p className="mt-1 max-w-[720px] text-sm leading-normal text-muted-foreground">
          {t(
            'Proyectos, historias, tareas, bugs, ciclos, etiquetas, comentarios y adjuntos. TaskFlow solo lee: en la herramienta de origen no cambia nada, y cada importación se puede deshacer completa.',
          )}
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sources().map((source) => (
          <li key={source.key}>
            <button
              type="button"
              onClick={() => onPick(source.key)}
              className="group flex h-full min-h-37 w-full flex-col gap-2.5 rounded-[14px] border bg-card px-4 py-3.5 text-left transition-[border-color,box-shadow] duration-200 hover:border-dash hover:shadow-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="flex items-center gap-2.5">
                <SourceMark source={source} />
                <span className="flex-1 text-base font-semibold">{source.name}</span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
              <span className="flex-1 text-[13px] leading-snug text-muted-foreground">{source.how}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{source.brings}</span>
            </button>
          </li>
        ))}
        <li className="flex min-h-37 flex-col justify-center gap-1.5 rounded-[14px] border border-dashed border-dash px-4 py-3.5">
          <span className="font-semibold">{t('¿Usas otra herramienta?')}</span>
          <span className="text-[13px] leading-snug text-muted-foreground">
            {t('Casi todas exportan a CSV. Expórtalo allá e impórtalo aquí con «Archivo CSV».')}
          </span>
        </li>
      </ul>
    </section>
  )
}

/** Lo que trajo una importación, en una línea: «2 proyectos · 379 tareas». */
function broughtText(job) {
  const report = job.report
  if (!report) return '—'
  const issues = report.stories + report.tasks + report.bugs
  const parts = [
    tn(report.projects.length, '{count} proyecto', '{count} proyectos'),
    tn(issues, '{count} tarea', '{count} tareas'),
    report.comments > 0 && tn(report.comments, '{count} comentario', '{count} comentarios'),
  ]
  return parts.filter(Boolean).join(' · ')
}

function ImportHistory({ workspace, onOpen }) {
  const { data: jobs, error, refetch } = useImports(workspace.slug)
  const undo = useUndoImport(workspace.slug)
  const discard = useDiscardImport(workspace.slug)
  const [toUndo, setToUndo] = useState(null)

  const handleUndo = () => {
    const job = toUndo
    undo.mutate(job.id, {
      onSuccess: () => {
        toast.success(t('Deshaciendo la importación desde {source}', { source: job.sourceLabel }))
        setToUndo(null)
      },
      onError: (undoError) => notifyError(undoError, t('No se pudo deshacer')),
    })
  }
  const handleDiscard = (job) =>
    discard.mutate(job.id, {
      onSuccess: () => toast.success(t('Importación descartada')),
      onError: (discardError) => notifyError(discardError, t('No se pudo descartar')),
    })

  return (
    <section aria-labelledby="import-history-title" className="overflow-x-auto rounded-2xl border bg-card">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pt-3.5 pb-2.5">
        <h2 id="import-history-title" className="text-[15px] font-semibold">
          {t('Importaciones anteriores')}
        </h2>
        <span className="text-[12.5px] text-muted-foreground">{t('Deshacer elimina lo que creó esa importación, y nada más.')}</span>
      </div>
      {!jobs && !error ? (
        <div className="space-y-2 border-t p-4">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      ) : !jobs ? (
        <ErrorState error={error} onRetry={refetch} className="border-t" />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t('Todavía no has importado nada')}
          description={t('Cuando traigas algo, aquí queda su informe y la opción de deshacerlo.')}
          className="border-t py-8"
        />
      ) : (
        <table className="tf-fade w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                {t('Origen')}
              </th>
              <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                {t('Qué trajo')}
              </th>
              <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                {t('Quién')}
              </th>
              <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                {t('Resultado')}
              </th>
              <th scope="col" className="px-4 py-2.25">
                <span className="sr-only">{t('Acciones')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const source = sourceOf(job.source)
              const unfinished = job.status === 'DRAFT' || job.status === 'READY'
              const finished = ['COMPLETED', 'FAILED', 'STOPPED'].includes(job.status)
              return (
                <tr key={job.id} className="border-t">
                  <td className="max-w-[320px] px-4 py-2.75">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <SourceMark source={source} className="h-6.5 min-w-6.5 rounded-lg text-[10px]" />
                      <span className="min-w-0">
                        <span className="block font-medium">{source.name}</span>
                        <span title={job.sourceLabel} className="block truncate font-mono text-[11.5px] text-muted-foreground">{job.sourceLabel}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.75 text-[13px]">{broughtText(job)}</td>
                  <td className="px-4 py-2.75 text-[13px] whitespace-nowrap">
                    {job.createdByName ?? '—'}{' '}
                    <span className="font-mono text-[11.5px] text-muted-foreground">· {formatRelative(job.createdAt)}</span>
                  </td>
                  <td className="px-4 py-2.75">
                    <StatusPill job={job} />
                  </td>
                  <td className="px-4 py-2.75">
                    <span className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => onOpen(job)}>
                        {unfinished ? t('Continuar') : job.status === 'UNDONE' || finished ? t('Ver informe') : t('Ver avance')}
                      </Button>
                      {finished && (
                        <Button variant="ghost" size="sm" className="text-late hover:text-late" onClick={() => setToUndo(job)}>
                          {t('Deshacer')}
                        </Button>
                      )}
                      {(unfinished || job.status === 'UNDONE') && (
                        <Button variant="ghost" size="sm" disabled={discard.isPending} onClick={() => handleDiscard(job)}>
                          {job.status === 'UNDONE' ? t('Quitar') : t('Descartar')}
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <UndoDialog job={toUndo} loading={undo.isPending} onCancel={() => setToUndo(null)} onConfirm={handleUndo} />
    </section>
  )
}

/** Una importación ya empezada: qué paso toca sale de por dónde va. */
function ImportJobView({ workspace, jobId, onHome }) {
  const { data: job, error, refetch } = useImport(workspace.slug, jobId)
  const discard = useDiscardImport(workspace.slug)
  // En «lista para revisar» hay dos pantallas (equivalencias y revisión), y se puede volver a elegir qué traer
  const [view, setView] = useState(null)

  if (!job && !error) return <Skeleton className="h-64 rounded-2xl" />
  if (!job) {
    return (
      <div className="tf-panel">
        <ErrorState error={error} onRetry={refetch} homeLink={`/${workspace.slug}/settings?tab=import`} />
      </div>
    )
  }

  const source = sourceOf(job.source)
  const cancel = () => {
    // Una importación que no ha traído nada se descarta al cancelar; una que ya corre o terminó, solo se cierra
    if (job.status === 'DRAFT' || job.status === 'READY') discard.mutate(job.id)
    onHome()
  }
  const shell = { source, sub: job.sourceLabel, file: job.via === 'FILE' }

  if (job.status === 'DRAFT' || (job.status === 'READY' && view === 'choose')) {
    return (
      <WizardShell {...shell} step="choose" onExit={cancel}>
        <ChooseStep workspace={workspace} job={job} onDone={() => setView(null)} />
      </WizardShell>
    )
  }
  if (job.status === 'FETCHING') {
    return (
      <WizardShell {...shell} step="choose" onExit={onHome} exitLabel={t('Cerrar')}>
        <ProgressStep workspace={workspace} job={job} />
      </WizardShell>
    )
  }
  if (job.status === 'READY') {
    return view === 'review' ? (
      <WizardShell {...shell} step="review" onExit={cancel}>
        <ReviewStep workspace={workspace} job={job} onBack={() => setView(null)} />
      </WizardShell>
    ) : (
      <WizardShell {...shell} step="mapping" onExit={cancel}>
        <MappingStep workspace={workspace} job={job} onBack={() => setView('choose')} onNext={() => setView('review')} />
      </WizardShell>
    )
  }
  if (job.status === 'RUNNING') {
    return (
      <WizardShell {...shell} step="run" onExit={onHome} exitLabel={t('Cerrar')}>
        <ProgressStep workspace={workspace} job={job} />
      </WizardShell>
    )
  }
  return (
    <WizardShell {...shell} step="done" onExit={onHome} exitLabel={t('Volver a Importar')}>
      <ReportStep workspace={workspace} job={job} onHome={onHome} />
    </WizardShell>
  )
}
