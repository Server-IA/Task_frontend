import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { GitBranch, GitPullRequest, Play, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { GhMark, Pick, PullMark, ShowMore, TaskLink, TonePill } from '../GithubParts'
import { branchUrl, pullChecks, pullNote, pullState, repoName, repoUrl } from '../githubModel'
import {
  useGithubBranches,
  useGithubLinked,
  useGithubProject,
  useGithubPulls,
  useLinkPullRequest,
} from '../hooks'
import { IssuePicker } from '../IssuePicker'
import { RunWorkflowDialog } from '../RunWorkflowDialog'

const VIEWS = ['pulls', 'actions', 'branches']
const ALL = '__all__'
/** Cuántas filas se dibujan de entrada en cada lista (y cuántas más con «Mostrar más»). */
const PAGE = 30

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
  const { data: status, error, refetch } = useGithubProject(slug, project.id, { live: true })
  const ready = Boolean(status?.connected && status.repositories.length > 0)
  // Para los contadores de las pestañas; se refrescan solos solo en su pestaña
  const { data: openPulls } = useGithubPulls(slug, project.id, 'open', {
    enabled: ready,
    live: view === 'pulls',
  })
  const { data: branches } = useGithubBranches(slug, project.id, {
    enabled: ready,
    live: view === 'branches',
  })
  const [running, setRunning] = useState(false)
  const canRun = can(workspace, 'GITHUB_RUN')
  const linked = useGithubLinked()
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

  // Con datos en pantalla, un sondeo que falla (el servidor se reinició, la red se cortó) no los reemplaza por un error
  if (!status && !error) {
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
  if (!status) {
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
          <Button
            className="gap-2"
            onClick={() => setRunning(true)}
            disabled={!linked}
            title={linked ? undefined : t('Conecta tu cuenta de GitHub para ejecutar workflows')}
          >
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
function Author({ login, name }) {
  if (!login) return <span className="size-6.5 shrink-0" />
  // Con la cuenta enlazada es la persona de TaskFlow (sus iniciales); si no, su usuario de GitHub
  const initials = name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
    : login.slice(0, 2)
  return (
    <span
      role="img"
      aria-label={name ? `${name} (@${login})` : `@${login}`}
      title={name ? `${name} (@${login})` : `@${login}`}
      className="bg-accent-soft text-accent-text flex size-6.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase"
    >
      {initials}
    </span>
  )
}

function PullsView({ workspace, project, status }) {
  const slug = workspace.slug
  const [state, setState] = useState('open')
  const [repository, setRepository] = useState(ALL)
  const [author, setAuthor] = useState(ALL)
  const { data: pulls, error, refetch } = useGithubPulls(slug, project.id, state)
  const link = useLinkPullRequest(slug, project.id)
  const linked = useGithubLinked()
  // Enlazar un PR a una tarea es editarla, y se hace con la cuenta de GitHub de la persona
  const canLink = can(workspace, 'ISSUE_EDIT') && linked === true
  const [limit, setLimit] = useState(PAGE)

  const authors = useMemo(
    () => [...new Set((pulls ?? []).map((pull) => pull.authorLogin).filter(Boolean))].sort(),
    [pulls],
  )
  // Un filtro cuyo selector ya no se muestra (queda un solo autor, o el elegido no está en esta lista) no filtra: si no,
  // la lista saldría vacía sin forma de quitarlo
  const byRepository =
    status.repositories.length > 1 && status.repositories.some((repo) => repo.id === repository)
      ? repository
      : ALL
  const byAuthor = authors.length > 1 && authors.includes(author) ? author : ALL
  const shown = (pulls ?? []).filter(
    (pull) =>
      (byRepository === ALL || pull.repositoryId === byRepository) &&
      (byAuthor === ALL || pull.authorLogin === byAuthor),
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
            value={byRepository}
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
            value={byAuthor}
            onChange={setAuthor}
            options={[
              { value: ALL, label: t('Persona: todas') },
              ...authors.map((login) => ({ value: login, label: login })),
            ]}
            className="h-8 w-[170px] text-[13px]"
          />
        )}
      </div>
      <section aria-label={t('Pull requests')} className="bg-card overflow-hidden rounded-2xl border">
        {!pulls && !error ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        ) : !pulls ? (
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
            {shown.slice(0, limit).map((pull, index) => {
              const info = pullState(pull.state)
              const checks = pullChecks(pull)
              return (
                <li
                  key={pull.id}
                  className={cn(
                    'grid grid-cols-[auto_minmax(0,1fr)_176px_138px_auto_166px] items-center gap-x-3.5 px-4 py-3',
                    index > 0 && 'border-t',
                  )}
                >
                  <PullMark state={pull.state} />
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-x-2">
                      <a
                        href={pull.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate font-semibold hover:underline"
                      >
                        {pull.title}
                      </a>
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">#{pull.number}</span>
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
                  <span className="flex min-w-0">
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
                  </span>
                  <span className="flex min-w-0 justify-start">
                    {checks && (
                      <TonePill tone={checks.tone}>
                        <span aria-hidden="true">{checks.mark}</span>
                        {checks.text}
                      </TonePill>
                    )}
                  </span>
                  <Author login={pull.authorLogin} name={pull.authorName} />
                  <span className="text-muted-foreground truncate text-right font-mono text-[11.5px]">
                    {formatRelative(pull.changedAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {pulls && (
          <ShowMore
            shown={Math.min(limit, shown.length)}
            total={shown.length}
            onMore={() => setLimit(limit + PAGE)}
          />
        )}
      </section>
      <p className="text-muted-foreground font-mono text-[11.5px]">
        {t('un PR se enlaza solo si su rama, su título o su descripción nombran la tarea ({code})', {
          code: `${project.identifier}-22`,
        })}
      </p>
    </div>
  )
}

function BranchesView({ workspace, project, branches }) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const needle = query.trim().toLowerCase()
  const found = (branches ?? []).filter(
    (branch) =>
      !needle ||
      branch.name.toLowerCase().includes(needle) ||
      (branch.issueCode ?? '').toLowerCase().includes(needle) ||
      (branch.issueTitle ?? '').toLowerCase().includes(needle),
  )
  return (
    <div className="flex flex-col gap-3">
      {branches?.length > 0 && (
        <div className="relative w-full max-w-[340px]">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(PAGE)
            }}
            placeholder={t('Buscar rama o tarea')}
            aria-label={t('Buscar rama o tarea')}
            className="h-8.5 pl-9 text-[13px]"
          />
        </div>
      )}
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
        ) : found.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t('Ninguna rama coincide con «{query}»', { query: query.trim() })}
            className="py-10"
          />
        ) : (
          <ul>
            {found.slice(0, limit).map((branch, index) => (
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
                <span className="text-muted-foreground w-[166px] shrink-0 truncate text-right font-mono text-[11.5px]">
                  {formatRelative(branch.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {branches && (
          <ShowMore
            shown={Math.min(limit, found.length)}
            total={found.length}
            onMore={() => setLimit(limit + PAGE)}
          />
        )}
      </section>
    </div>
  )
}
