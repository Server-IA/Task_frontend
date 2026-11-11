import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { GitBranch, GitPullRequest, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Segmented } from '@/components/common/Segmented'
import { EmptyState, ErrorState } from '@/components/common/States'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { t } from '@/i18n'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { projectPath } from '@/lib/paths'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { ActionsView } from '../GithubActions'
import { GhMark, Pick, PullMark, TaskLink, TonePill } from '../GithubParts'
import { branchUrl, pullChecks, pullNote, pullState, repoName, repoUrl } from '../githubModel'
import { useGithubBranches, useGithubProject, useGithubPulls, useLinkPullRequest } from '../hooks'
import { IssuePicker } from '../IssuePicker'
import { RunWorkflowDialog } from '../RunWorkflowDialog'

const VIEWS = ['pulls', 'actions', 'branches']
const ALL = '__all__'

/**
 * La sección «GitHub» de un proyecto: los pull requests de sus repositorios con la tarea de cada uno, las ejecuciones
 * de GitHub Actions y las ramas enlazadas a tareas.
 */
export function GithubPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const slug = workspace.slug
  const [searchParams, setSearchParams] = useSearchParams()
  const view = VIEWS.includes(searchParams.get('view')) ? searchParams.get('view') : 'pulls'
  const { data: status, isLoading, error, refetch } = useGithubProject(slug, project.id, { live: true })
  const ready = Boolean(status?.connected && status.repositories.length > 0)
  const { data: openPulls } = useGithubPulls(slug, project.id, 'open', { enabled: ready })
  const { data: branches } = useGithubBranches(slug, project.id, { enabled: ready })
  const [running, setRunning] = useState(false)
  const canRun = can(workspace, 'GITHUB_RUN')
  const settingsLink = `/${slug}/projects/${project.id}/settings?tab=github`

  const header = (children, actions) => (
    <PageHeader
      path={[...projectPath(workspace, project), { label: 'github' }]}
      title="GitHub"
      documentTitle={['GitHub', project.name]}
      description={
        ready && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {t('Repositorios de este proyecto')}
            {status.repositories.map((repository) => (
              <a
                key={repository.id}
                href={repoUrl(repository.fullName)}
                target="_blank"
                rel="noreferrer"
                className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-xs hover:underline"
              >
                {repository.fullName}
              </a>
            ))}
          </span>
        )
      }
      actions={actions}
    >
      {children}
    </PageHeader>
  )

  if (isLoading) {
    return (
      <>
        {header()}
        <PageBody>
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-2xl" />
            <Skeleton className="h-14 rounded-2xl" />
            <Skeleton className="h-14 rounded-2xl" />
          </div>
        </PageBody>
      </>
    )
  }
  if (error) {
    return (
      <>
        {header()}
        <ErrorState error={error} onRetry={refetch} className="flex-1" />
      </>
    )
  }
  if (!ready) {
    const canManage = can(workspace, 'GITHUB_MANAGE')
    return (
      <>
        {header()}
        <PageBody>
          <section className="tf-panel mx-auto mt-6 flex max-w-[640px] flex-col items-center gap-3 px-6 py-9 text-center">
            <GhMark />
            <h2 className="text-[19px] font-semibold">
              {status.connected
                ? t('Este proyecto todavía no tiene repositorios')
                : t('Este workspace no está conectado con GitHub')}
            </h2>
            <p className="text-muted-foreground max-w-[460px] text-sm leading-normal">
              {status.connected
                ? t(
                    'Enlaza los repositorios del proyecto y aquí verás sus pull requests, sus pipelines y la tarea de cada uno.',
                  )
                : t(
                    'Al conectarlo, cada tarea muestra su rama, sus pull requests y el resultado de sus pipelines.',
                  )}
            </p>
            {canManage ? (
              <Button asChild>
                <Link to={status.connected ? settingsLink : `/${slug}/settings?tab=integrations`}>
                  {status.connected ? t('Enlazar repositorios') : t('Conectar GitHub')}
                </Link>
              </Button>
            ) : (
              <p className="text-muted-foreground text-[13px]">
                {t('Lo configura quien tiene el permiso «Configurar GitHub».')}
              </p>
            )}
          </section>
        </PageBody>
      </>
    )
  }

  const count = (list) => list && <span className="font-mono">{list.length}</span>
  return (
    <Tabs
      value={view}
      onValueChange={(value) => setSearchParams({ view: value }, { replace: true })}
      className="min-h-0 flex-1 gap-3.5"
    >
      {header(
        <TabsList aria-label={t('Secciones')}>
          <TabsTrigger value="pulls">
            {t('Pull requests')} {count(openPulls)}
          </TabsTrigger>
          <TabsTrigger value="actions">{t('Actions')}</TabsTrigger>
          <TabsTrigger value="branches">
            {t('Ramas')} {count(branches)}
          </TabsTrigger>
        </TabsList>,
        view === 'actions' && canRun && (
          <Button className="gap-2" onClick={() => setRunning(true)}>
            <Play className="size-3.5" aria-hidden="true" />
            {t('Ejecutar workflow')}
          </Button>
        ),
      )}
      <PageBody>
        <TabsContent value="pulls">
          <PullsView workspace={workspace} project={project} status={status} />
        </TabsContent>
        <TabsContent value="actions">
          <ActionsView workspace={workspace} project={project} status={status} settingsLink={settingsLink} />
        </TabsContent>
        <TabsContent value="branches">
          <BranchesView workspace={workspace} project={project} branches={branches} />
        </TabsContent>
      </PageBody>
      {canRun && (
        <RunWorkflowDialog
          open={running}
          onOpenChange={setRunning}
          workspace={workspace}
          project={project}
          repositories={status.repositories}
        />
      )}
    </Tabs>
  )
}

/** Las siglas de quien abrió un pull request (su usuario de GitHub). */
function Author({ login }) {
  if (!login) return <span className="size-6.5 shrink-0" />
  return (
    <span
      title={login}
      className="bg-accent-soft text-accent-text flex size-6.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase"
    >
      {login.slice(0, 2)}
    </span>
  )
}

function PullsView({ workspace, project, status }) {
  const slug = workspace.slug
  const [state, setState] = useState('open')
  const [repository, setRepository] = useState(ALL)
  const [author, setAuthor] = useState(ALL)
  const { data: pulls, isLoading, error, refetch } = useGithubPulls(slug, project.id, state)
  const link = useLinkPullRequest(slug, project.id)
  const canLink = can(workspace, 'ISSUE_EDIT')

  const authors = useMemo(
    () => [...new Set((pulls ?? []).map((pull) => pull.authorLogin).filter(Boolean))].sort(),
    [pulls],
  )
  const shown = (pulls ?? []).filter(
    (pull) =>
      (repository === ALL || pull.repositoryId === repository) &&
      (author === ALL || pull.authorLogin === author),
  )

  const handleLink = (pull, issue) =>
    link.mutate(
      { pullRequestId: pull.id, issueId: issue?.id ?? null },
      {
        onSuccess: () =>
          toast.success(
            issue
              ? t('Pull request #{number} enlazado a {code}', { number: pull.number, code: issue.code })
              : t('Pull request #{number} sin tarea', { number: pull.number }),
          ),
        onError: (linkError) => notifyError(linkError, t('No se pudo enlazar')),
      },
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          label={t('Estado')}
          size="sm"
          value={state}
          onChange={setState}
          options={[
            { value: 'open', label: t('Abiertos') },
            { value: 'merged', label: t('Fusionados') },
            { value: 'all', label: t('Todos') },
          ]}
        />
        {status.repositories.length > 1 && (
          <Pick
            label={t('Repositorio')}
            value={repository}
            onChange={setRepository}
            options={[
              { value: ALL, label: t('Repositorio: todos') },
              ...status.repositories.map((repo) => ({ value: repo.id, label: repoName(repo.fullName) })),
            ]}
            className="h-8 w-[190px] text-[13px]"
          />
        )}
        {authors.length > 1 && (
          <Pick
            label={t('Persona')}
            value={author}
            onChange={setAuthor}
            options={[
              { value: ALL, label: t('Persona: todas') },
              ...authors.map((login) => ({ value: login, label: login })),
            ]}
            className="h-8 w-[170px] text-[13px]"
          />
        )}
        <span className="text-muted-foreground ml-auto font-mono text-[11.5px]">
          {t('un PR se enlaza solo si su rama, su título o su descripción nombran la tarea ({code})', {
            code: `${project.identifier}-22`,
          })}
        </span>
      </div>
      <section aria-label={t('Pull requests')} className="bg-card overflow-hidden rounded-2xl border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title={state === 'open' ? t('No hay pull requests abiertos') : t('No hay pull requests')}
            description={t(
              'Cuando alguien abra uno en un repositorio del proyecto, aparece aquí con su tarea.',
            )}
            className="py-10"
          />
        ) : (
          <ul>
            {shown.map((pull, index) => {
              const info = pullState(pull.state)
              const checks = pullChecks(pull)
              return (
                <li
                  key={pull.id}
                  className={cn(
                    'flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-3',
                    index > 0 && 'border-t',
                  )}
                >
                  <PullMark state={pull.state} />
                  <div className="min-w-0 flex-[1_1_320px]">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <a
                        href={pull.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate font-semibold hover:underline"
                      >
                        {pull.title}
                      </a>
                      <span className="text-muted-foreground font-mono text-xs">#{pull.number}</span>
                      <TonePill tone={info.tone}>{info.label}</TonePill>
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate font-mono text-[11.5px]">
                      {[
                        repoName(pull.repository),
                        pull.headBranch && `${pull.headBranch} → ${pull.baseBranch ?? ''}`.trim(),
                        pullNote(pull),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {pull.issueId ? (
                    <TaskLink
                      slug={slug}
                      projectId={project.id}
                      issueId={pull.issueId}
                      code={pull.issueCode}
                      state={pull.issueState}
                    />
                  ) : canLink ? (
                    <IssuePicker
                      slug={slug}
                      projectId={project.id}
                      onPick={(issue) => handleLink(pull, issue)}
                      align="end"
                    >
                      <button
                        type="button"
                        className="border-dash text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 rounded-lg border border-dashed px-2 py-1 text-[12.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {t('sin tarea · enlazar')}
                      </button>
                    </IssuePicker>
                  ) : (
                    <span className="text-muted-foreground shrink-0 text-[12.5px]">{t('sin tarea')}</span>
                  )}
                  <span className="flex w-[150px] shrink-0 justify-start">
                    {checks && (
                      <TonePill tone={checks.tone}>
                        <span aria-hidden="true">{checks.mark}</span>
                        {checks.text}
                      </TonePill>
                    )}
                  </span>
                  <Author login={pull.authorLogin} />
                  <span className="text-muted-foreground min-w-[92px] shrink-0 text-right font-mono text-[11.5px] whitespace-nowrap">
                    {formatRelative(pull.changedAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function BranchesView({ workspace, project, branches }) {
  return (
    <section aria-label={t('Ramas')} className="bg-card overflow-hidden rounded-2xl border">
      {!branches ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      ) : branches.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title={t('Todavía no hay ramas enlazadas a tareas')}
          description={t(
            'Crea la rama desde una tarea, o pon el código de la tarea ({code}) en el nombre de la tuya.',
            { code: `${project.identifier}-22` },
          )}
          className="py-10"
        />
      ) : (
        <ul>
          {branches.map((branch, index) => (
            <li
              key={branch.id}
              className={cn(
                'flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-2.75',
                index > 0 && 'border-t',
              )}
            >
              <GitBranch className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-[1_1_300px]">
                <a
                  href={branchUrl(branch.repository, branch.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-mono text-[13px] font-semibold hover:underline"
                >
                  {branch.name}
                </a>
                <span className="text-muted-foreground block truncate text-xs">{branch.issueTitle}</span>
              </span>
              <span className="text-muted-foreground font-mono text-xs">{repoName(branch.repository)}</span>
              <TaskLink
                slug={workspace.slug}
                projectId={project.id}
                issueId={branch.issueId}
                code={branch.issueCode}
              />
              <span className="text-muted-foreground min-w-[92px] shrink-0 text-right font-mono text-[11.5px] whitespace-nowrap">
                {formatRelative(branch.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
