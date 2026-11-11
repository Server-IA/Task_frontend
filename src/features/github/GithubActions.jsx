import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common/States'
import { t, tn, tx } from '@/i18n'
import { formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Pick, StateMark, TaskLink, TonePill } from './GithubParts'
import { repoName, runDuration, runState, runTrigger, shortSha } from './githubModel'
import { useCancelWorkflow, useGithubRuns, useRerunWorkflow } from './hooks'

const ALL = '__all__'

/**
 * Las ejecuciones de GitHub Actions de los repositorios del proyecto: qué workflow, cómo va, qué lo lanzó y a qué tarea
 * corresponde. Reintentar y cancelar piden el permiso «Ejecutar workflows».
 */
export function ActionsView({ workspace, project, status, settingsLink }) {
  const slug = workspace.slug
  const { data: runs, isLoading, error, refetch } = useGithubRuns(slug, project.id)
  const rerun = useRerunWorkflow(slug, project.id)
  const cancel = useCancelWorkflow(slug, project.id)
  const canRun = can(workspace, 'GITHUB_RUN')
  const [workflow, setWorkflow] = useState(ALL)
  const [branch, setBranch] = useState(ALL)
  const [result, setResult] = useState(ALL)

  const workflows = useMemo(() => [...new Set((runs ?? []).map((run) => run.workflowName).filter(Boolean))].sort(), [runs])
  const branches = useMemo(() => [...new Set((runs ?? []).map((run) => run.branch).filter(Boolean))].sort(), [runs])
  const shown = (runs ?? []).filter(
    (run) => (workflow === ALL || run.workflowName === workflow) && (branch === ALL || run.branch === branch) && (result === ALL || runState(run).result === result),
  )

  const handleRerun = (run) =>
    rerun.mutate(run.id, {
      onSuccess: () => toast.success(t('Se pidió repetir «{name}»', { name: run.workflowName })),
      onError: (rerunError) => notifyError(rerunError, t('No se pudo reintentar')),
    })
  const handleCancel = (run) =>
    cancel.mutate(run.id, {
      onSuccess: () => toast.success(t('Se pidió cancelar «{name}»', { name: run.workflowName })),
      onError: (cancelError) => notifyError(cancelError, t('No se pudo cancelar')),
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <Pick
          label={t('Workflow')}
          value={workflow}
          onChange={setWorkflow}
          options={[{ value: ALL, label: t('Workflow: todos') }, ...workflows.map((name) => ({ value: name, label: name }))]}
          className="h-8 w-[200px] text-[13px]"
        />
        <Pick
          label={t('Rama')}
          value={branch}
          onChange={setBranch}
          options={[{ value: ALL, label: t('Rama: todas') }, ...branches.map((name) => ({ value: name, label: name }))]}
          className="h-8 w-[200px] text-[13px]"
        />
        <Pick
          label={t('Resultado')}
          value={result}
          onChange={setResult}
          options={[
            { value: ALL, label: t('Resultado: todos') },
            { value: 'ok', label: t('correcto') },
            { value: 'fail', label: t('falló') },
            { value: 'run', label: t('en curso') },
            { value: 'wait', label: t('en cola') },
          ]}
          className="h-8 w-[180px] text-[13px]"
        />
        <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">
          {tx('{rules} · se configuran en {link}', {
            rules: tn(status.rules.length, '{count} regla activa', '{count} reglas activas'),
            link: (
              <Link to={settingsLink} className="underline hover:text-foreground">
                {t('Ajustes del proyecto → GitHub')}
              </Link>
            ),
          })}
        </span>
      </div>
      <section aria-label={t('Ejecuciones de GitHub Actions')} className="overflow-hidden rounded-2xl border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title={runs.length === 0 ? t('Todavía no hay ejecuciones') : t('Ninguna ejecución con esos filtros')}
            description={t('Aquí aparece cada workflow que corre en los repositorios del proyecto, lo lance GitHub o TaskFlow.')}
            className="py-10"
          />
        ) : (
          <ul>
            {shown.map((run, index) => {
              const info = runState(run)
              const trigger = runTrigger(run, status.rules)
              const name = run.workflowName ?? t('Workflow')
              return (
                <li key={run.id} className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-3', index > 0 && 'border-t')}>
                  <StateMark info={info} />
                  <div className="min-w-0 flex-[1_1_320px]">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {run.url ? (
                        <a href={run.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                          {name}
                        </a>
                      ) : (
                        <span className="font-semibold">{name}</span>
                      )}
                      <TonePill tone={info.tone} outline={info.outline}>
                        {info.label}
                      </TonePill>
                      {run.title && run.title !== name && <span className="min-w-0 truncate text-[13px] text-muted-foreground">{run.title}</span>}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">
                      {[repoName(run.repository), run.branch, shortSha(run.headSha)].filter(Boolean).join(' · ')}
                      {trigger.text && (
                        <>
                          {' · '}
                          <span className={cn(trigger.fromTaskflow && 'text-accent-text')}>{trigger.text}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {run.issueId && <TaskLink slug={slug} projectId={project.id} issueId={run.issueId} code={run.issueCode} />}
                  <span className="w-[86px] shrink-0 text-right font-mono text-[11.5px] text-muted-foreground">{runDuration(run)}</span>
                  <span className="w-[92px] shrink-0 text-right font-mono text-[11.5px] text-muted-foreground">
                    {formatRelative(run.startedAt ?? run.requestedAt ?? run.changedAt)}
                  </span>
                  <span className="flex w-[92px] shrink-0 justify-end">
                    {canRun && info.canRetry && (
                      <Button variant="outline" size="sm" onClick={() => handleRerun(run)} disabled={rerun.isPending}>
                        {t('Reintentar')}
                      </Button>
                    )}
                    {canRun && info.canCancel && (
                      <Button variant="outline" size="sm" onClick={() => handleCancel(run)} disabled={cancel.isPending}>
                        {t('Cancelar')}
                      </Button>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <p className="font-mono text-[11.5px] text-muted-foreground">
        {t('cada ejecución abre su registro en GitHub · reintentar y cancelar piden el permiso «Ejecutar workflows»')}
      </p>
    </div>
  )
}
