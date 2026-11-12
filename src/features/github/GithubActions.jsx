import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SingleFilter } from '@/components/common/SingleFilter'
import { EmptyState, ErrorState } from '@/components/common/States'
import { t, tn, tx } from '@/i18n'
import { formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { ShowMore, StateMark, TaskLink, TonePill } from './GithubParts'
import { repoName, runDuration, runState, runTrigger, shortSha } from './githubModel'
import { ConnectAccountNotice } from './GithubAccount'
import { useCancelWorkflow, useGithubLinked, useGithubRuns, useRerunWorkflow } from './hooks'

const PAGE = 30

/**
 * Las ejecuciones de GitHub Actions de los repositorios del proyecto: qué workflow, cómo va, qué lo lanzó y a qué tarea
 * corresponde. Reintentar y cancelar piden el permiso «Ejecutar workflows».
 */
export function ActionsView({ workspace, project, status, settingsLink }) {
  const slug = workspace.slug
  const { data: runs, error, refetch } = useGithubRuns(slug, project.id)
  const rerun = useRerunWorkflow(slug, project.id)
  const cancel = useCancelWorkflow(slug, project.id)
  const canRun = can(workspace, 'GITHUB_RUN')
  // Ejecutar, reintentar y cancelar se hacen con la cuenta de GitHub de la persona
  const linked = useGithubLinked()
  const canAct = canRun && linked === true
  const [workflow, setWorkflow] = useState(null)
  const [branch, setBranch] = useState(null)
  const [result, setResult] = useState(null)
  const [limit, setLimit] = useState(PAGE)

  const workflows = useMemo(
    () => [...new Set((runs ?? []).map((run) => run.workflowName).filter(Boolean))].sort(),
    [runs],
  )
  const branches = useMemo(
    () => [...new Set((runs ?? []).map((run) => run.branch).filter(Boolean))].sort(),
    [runs],
  )
  // Un filtro por un workflow o una rama que ya no está en la lista no filtra (el filtro vuelve a quedar vacío)
  const byWorkflow = workflows.includes(workflow) ? workflow : null
  const byBranch = branches.includes(branch) ? branch : null
  const shown = (runs ?? []).filter(
    (run) =>
      (byWorkflow === null || run.workflowName === byWorkflow) &&
      (byBranch === null || run.branch === byBranch) &&
      (result === null || runState(run).result === result),
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
      {canRun && (
        <ConnectAccountNotice>
          {t(
            'Para ejecutar, reintentar o cancelar workflows, conecta tu cuenta de GitHub. Ver las ejecuciones no lo necesita.',
          )}
        </ConnectAccountNotice>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <SingleFilter
          title={t('workflow')}
          removeLabel={t('Quitar filtro de workflow')}
          searchPlaceholder={t('Filtrar por workflow…')}
          value={byWorkflow}
          onChange={setWorkflow}
          options={workflows.map((name) => ({ value: name, label: name }))}
        />
        <SingleFilter
          title={t('rama')}
          removeLabel={t('Quitar filtro de rama')}
          searchPlaceholder={t('Filtrar por rama…')}
          value={byBranch}
          onChange={setBranch}
          options={branches.map((name) => ({ value: name, label: name }))}
        />
        <SingleFilter
          title={t('resultado')}
          removeLabel={t('Quitar filtro de resultado')}
          searchPlaceholder={t('Filtrar por resultado…')}
          value={result}
          onChange={setResult}
          options={[
            { value: 'ok', label: t('correcto') },
            { value: 'fail', label: t('falló') },
            { value: 'run', label: t('en curso') },
            { value: 'wait', label: t('en cola') },
          ]}
        />
      </div>
      <section
        aria-label={t('Ejecuciones de GitHub Actions')}
        className="bg-card overflow-hidden rounded-2xl border"
      >
        {!runs && !error ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        ) : !runs ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title={
              runs.length === 0 ? t('Todavía no hay ejecuciones') : t('Ninguna ejecución con esos filtros')
            }
            description={t(
              'Aquí aparece cada workflow que corre en los repositorios del proyecto, lo lance GitHub o TaskFlow.',
            )}
            className="py-10"
          />
        ) : (
          <ul className="tf-fade">
            {shown.slice(0, limit).map((run, index) => {
              const info = runState(run)
              const trigger = runTrigger(run, status.rules)
              const name = run.workflowName ?? t('Workflow')
              return (
                <li
                  key={run.id}
                  className={cn(
                    'grid grid-cols-[auto_minmax(0,1fr)_92px_64px_200px_96px] items-center gap-x-3.5 px-4 py-3',
                    index > 0 && 'border-t',
                  )}
                >
                  <StateMark info={info} />
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-x-2">
                      {run.url ? (
                        <a
                          href={run.url}
                          target="_blank"
                          rel="noreferrer"
                          title={name}
                          className="max-w-[60%] min-w-0 shrink-0 truncate font-semibold hover:underline"
                        >
                          {name}
                        </a>
                      ) : (
                        <span title={name} className="max-w-[60%] min-w-0 shrink-0 truncate font-semibold">
                          {name}
                        </span>
                      )}
                      <TonePill tone={info.tone} outline={info.outline}>
                        {info.label}
                      </TonePill>
                      {run.title && run.title !== name && (
                        <span className="text-muted-foreground min-w-0 flex-1 truncate text-[13px]">
                          {run.title}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate font-mono text-[11.5px]">
                      {[repoName(run.repository), run.branch, shortSha(run.headSha)]
                        .filter(Boolean)
                        .join(' · ')}
                      {trigger.text && (
                        <>
                          {' · '}
                          <span className={cn(trigger.fromTaskflow && 'text-accent-text')}>
                            {trigger.text}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="flex min-w-0">
                    {run.issueId && (
                      <TaskLink
                        slug={slug}
                        projectId={project.id}
                        issueId={run.issueId}
                        code={run.issueCode}
                      />
                    )}
                  </span>
                  <span className="text-muted-foreground truncate text-right font-mono text-[11.5px]">
                    {runDuration(run)}
                  </span>
                  <span className="text-muted-foreground truncate text-right font-mono text-[11.5px]">
                    {formatRelative(run.startedAt ?? run.requestedAt ?? run.changedAt)}
                  </span>
                  <span className="flex justify-end">
                    {canAct && info.canRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRerun(run)}
                        disabled={rerun.isPending}
                      >
                        {t('Reintentar')}
                      </Button>
                    )}
                    {canAct && info.canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(run)}
                        disabled={cancel.isPending}
                      >
                        {t('Cancelar')}
                      </Button>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {runs && (
          <ShowMore
            shown={Math.min(limit, shown.length)}
            total={shown.length}
            onMore={() => setLimit(limit + PAGE)}
          />
        )}
      </section>
      <p className="text-muted-foreground font-mono text-[11.5px] leading-relaxed">
        {tx('{rules} · se configuran en {link}', {
          rules: tn(status.rules.length, '{count} regla activa', '{count} reglas activas'),
          link: (
            <Link to={settingsLink} className="hover:text-foreground underline">
              {t('Ajustes del proyecto → GitHub')}
            </Link>
          ),
        })}
        <br />
        {t(
          'cada ejecución abre su registro en GitHub · reintentar y cancelar piden el permiso «Ejecutar workflows» y tu cuenta de GitHub conectada',
        )}
      </p>
    </div>
  )
}
