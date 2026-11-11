import { useState } from 'react'
import { ArrowUpRight, GitBranch } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useStates } from '@/features/projects/hooks'
import { useWorkspace } from '@/features/workspaces/hooks'
import { stateName, t, tx } from '@/i18n'
import { formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { ConnectAccountNotice } from './GithubAccount'
import { Pick, PullMark, StateMark, TonePill } from './GithubParts'
import {
  branchUrl,
  checkState,
  devCount,
  duration,
  pullState,
  repoName,
  runState,
  validBranchName,
} from './githubModel'
import {
  useCreateBranch,
  useGithubChecks,
  useGithubIssue,
  useGithubLinked,
  useGithubProject,
  useGithubPulls,
  useGithubRepoBranches,
  useLinkBranch,
  useLinkPullRequest,
} from './hooks'

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(done)
  } catch {
    toast.error(t('No se pudo copiar'))
  }
}

/**
 * La sección «Desarrollo» de una tarea: su rama, sus pull requests con los checks de cada uno y las ejecuciones de
 * Actions que le corresponden. Sin nada todavía, ofrece crear la rama. Si el proyecto no tiene repositorios de GitHub,
 * no se muestra.
 * @param {{ slug: string, project: import('@/api/types').ProjectResponse, issue: import('@/api/types').IssueResponse }} props
 */
export function IssueDevelopment({ slug, project, issue }) {
  const { data: workspace } = useWorkspace(slug)
  const { data: dev } = useGithubIssue(slug, project.id, issue.id)
  const [creating, setCreating] = useState(false)
  const [linking, setLinking] = useState(false)
  const linked = useGithubLinked()
  if (!dev?.available) return null

  const canEdit = can(workspace, 'ISSUE_EDIT')
  // La rama la crea la persona con su cuenta de GitHub; enlazar una que ya existe no la necesita
  const canCreate = canEdit && linked === true
  const empty = dev.branches.length === 0 && dev.pullRequests.length === 0
  const titleId = `development-${issue.id}`
  const action = 'rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 hover:bg-accent'

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={titleId} className="text-sm font-semibold">
          {t('Desarrollo')}{' '}
          {!empty && (
            <span className="text-muted-foreground font-mono text-xs font-normal">{devCount(dev)}</span>
          )}
        </h2>
        {canEdit && !empty && (
          <span className="ml-auto flex gap-1.5">
            {canCreate && (
              <button type="button" className={action} onClick={() => setCreating(true)}>
                {t('+ crear rama')}
              </button>
            )}
            <button type="button" className={action} onClick={() => setLinking(true)}>
              {t('+ enlazar otra rama o PR')}
            </button>
          </span>
        )}
      </div>

      {empty ? (
        <div className="border-dash flex flex-wrap items-center gap-3 rounded-[14px] border border-dashed px-4 py-3.5">
          <span className="text-muted-foreground min-w-0 flex-[1_1_260px] text-[13px] leading-normal">
            {tx(
              'Todavía no hay rama ni pull request. Crea la rama aquí, o nombra {code} en la tuya y se enlaza sola.',
              {
                code: <strong className="text-foreground font-mono font-semibold">{issue.code}</strong>,
              },
            )}
          </span>
          {canEdit && (
            <span className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLinking(true)}>
                {t('Enlazar una que ya existe')}
              </Button>
              {canCreate && (
                <Button size="sm" className="gap-2" onClick={() => setCreating(true)}>
                  <GitBranch className="size-3.5" aria-hidden="true" />
                  {t('Crear rama')}
                </Button>
              )}
            </span>
          )}
        </div>
      ) : (
        <>
          {dev.branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-muted flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl px-3 py-2"
            >
              <GitBranch className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
              <a
                href={branchUrl(branch.repository, branch.name)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate font-mono text-[13px] font-semibold hover:underline"
              >
                {branch.name}
              </a>
              <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11.5px]">
                {branch.repository} · {formatRelative(branch.createdAt)}
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-ring rounded-md px-1.5 py-0.5 text-xs focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => copy(branch.name, t('Nombre de la rama copiado'))}
              >
                {t('Copiar nombre')}
              </button>
            </div>
          ))}
          {dev.pullRequests.map((pull) => (
            <PullCard key={pull.id} slug={slug} projectId={project.id} issueId={issue.id} pull={pull} />
          ))}
          {dev.runs.length > 0 && <Runs runs={dev.runs} />}
        </>
      )}

      {canEdit && (
        <ConnectAccountNotice short>
          {t('Para crear la rama desde aquí, conecta tu cuenta de GitHub: la rama se crea a tu nombre.')}
        </ConnectAccountNotice>
      )}
      {canEdit && (
        <CreateBranchDialog
          open={creating}
          onOpenChange={setCreating}
          slug={slug}
          project={project}
          issue={issue}
          dev={dev}
        />
      )}
      {canEdit && (
        <LinkDialog
          open={linking}
          onOpenChange={setLinking}
          slug={slug}
          project={project}
          issue={issue}
          dev={dev}
        />
      )}
    </section>
  )
}

/** Un pull request de la tarea: quién lo abrió, a quién se le pidió revisión, su estado y sus checks. */
function PullCard({ slug, projectId, issueId, pull }) {
  const info = pullState(pull.state)
  const live = pull.state === 'OPEN' || pull.state === 'DRAFT'
  const { data: checks } = useGithubChecks(slug, projectId, issueId, live ? pull : null)
  const facts = [
    pull.authorLogin && t('abierto por {name}', { name: pull.authorName ?? pull.authorLogin }),
    pull.reviewers && live && t('revisión pedida a {names}', { names: pull.reviewers }),
    pull.baseBranch && `→ ${pull.baseBranch}`,
    pull.repository && repoName(pull.repository),
  ]
  return (
    <div className="overflow-hidden rounded-[14px] border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3">
        <PullMark state={pull.state} />
        <span className="min-w-0 flex-[1_1_240px]">
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <a
              href={pull.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 truncate font-semibold hover:underline"
            >
              {pull.title}
            </a>
            <span className="text-muted-foreground font-mono text-xs">#{pull.number}</span>
          </span>
          <span className="text-muted-foreground mt-0.5 block truncate font-mono text-[11.5px]">
            {facts.filter(Boolean).join(' · ')}
          </span>
        </span>
        <TonePill tone={info.tone}>{info.label}</TonePill>
        <a
          href={pull.url}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[12.5px] hover:underline"
        >
          {t('ver en GitHub')}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      </div>
      {checks?.length > 0 && (
        <ul aria-label={t('Checks del pull request')} className="border-t">
          {checks.map((check, index) => {
            const state = checkState(check)
            const time = duration(check.startedAt, check.completedAt)
            return (
              <li
                key={`${check.name}-${index}`}
                className={cn('flex items-center gap-2.5 px-3.5 py-2 text-[13px]', index > 0 && 'border-t')}
              >
                <StateMark info={state} className="size-5 text-[11px]" />
                {check.url ? (
                  <a
                    href={check.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {check.name}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate">{check.name}</span>
                )}
                <span
                  className={cn(
                    'font-mono text-[11.5px]',
                    state.tone === 'fail' ? 'text-late' : 'text-muted-foreground',
                  )}
                >
                  {state.label}
                </span>
                {time && (
                  <span className="text-muted-foreground w-[86px] text-right font-mono text-[11.5px]">
                    {time}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Las últimas ejecuciones de Actions que corresponden a la tarea (las de su PR, sus reglas o las pedidas para ella). */
function Runs({ runs }) {
  return (
    <ul aria-label={t('Ejecuciones de GitHub Actions')} className="overflow-hidden rounded-[14px] border">
      {runs.map((run, index) => {
        const info = runState(run)
        const name = run.workflowName ?? t('Workflow')
        return (
          <li
            key={run.id}
            className={cn(
              'flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3.5 py-2 text-[13px]',
              index > 0 && 'border-t',
            )}
          >
            <StateMark info={info} className="size-5 text-[11px]" />
            {run.url ? (
              <a href={run.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {name}
              </a>
            ) : (
              <span className="font-medium">{name}</span>
            )}
            <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11.5px]">
              {[repoName(run.repository), run.branch].filter(Boolean).join(' · ')}
            </span>
            <TonePill tone={info.tone} outline={info.outline}>
              {info.label}
            </TonePill>
            <span className="text-muted-foreground min-w-[92px] text-right font-mono text-[11.5px] whitespace-nowrap">
              {formatRelative(run.startedAt ?? run.requestedAt ?? run.changedAt)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function CreateBranchDialog({ open, onOpenChange, slug, project, issue, dev }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {open && (
          <CreateBranchForm
            slug={slug}
            project={project}
            issue={issue}
            dev={dev}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateBranchForm({ slug, project, issue, dev, onDone }) {
  const [repositoryId, setRepositoryId] = useState(dev.repositories[0]?.id ?? '')
  const [base, setBase] = useState('')
  const [name, setName] = useState(dev.suggestedBranch)
  const [move, setMove] = useState(true)
  const repository = dev.repositories.find((candidate) => candidate.id === repositoryId)
  const { data: branches } = useGithubRepoBranches(slug, project.id, repositoryId)
  const { data: status } = useGithubProject(slug, project.id)
  const { data: states } = useStates(slug, project.id)
  const create = useCreateBranch(slug, project.id, issue.id)

  const from = base || repository?.defaultBranch || ''
  const baseOptions = [...new Set([from, ...(branches ?? [])].filter(Boolean))].map((branch) => ({
    value: branch,
    label: branch,
  }))
  const trimmed = name.trim()
  const valid = validBranchName(trimmed)
  // La automatización «se crea la rama» solo mueve una tarea que no ha empezado
  const target = states?.find((state) => state.id === status?.settings.onBranchStateId)
  const current = states?.find((state) => state.id === issue.state?.id)
  const canMove =
    Boolean(target) && ['BACKLOG', 'UNSTARTED'].includes(current?.group) && target.id !== current?.id
  const command = `git fetch && git checkout ${trimmed}`

  const handleSubmit = (event) => {
    event.preventDefault()
    create.mutate(
      { repositoryId, base: from, name: trimmed, move: canMove && move },
      {
        onSuccess: () => {
          toast.success(t('Rama {branch} creada', { branch: trimmed }))
          onDone()
        },
        onError: (createError) => notifyError(createError, t('No se pudo crear la rama')),
      },
    )
  }

  const label = 'flex flex-col gap-1.5 text-sm font-medium'
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{t('Crear rama para {code}', { code: issue.code })}</DialogTitle>
        <DialogDescription>{t('Se crea en GitHub y queda enlazada a la tarea.')}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={label}>
          {t('Repositorio')}
          <Pick
            label={t('Repositorio')}
            value={repositoryId}
            onChange={(value) => {
              setRepositoryId(value)
              setBase('')
            }}
            options={dev.repositories.map((candidate) => ({
              value: candidate.id,
              label: candidate.fullName,
            }))}
            mono
            className="w-full"
          />
        </div>
        <div className={label}>
          {t('A partir de')}
          <Pick
            label={t('A partir de')}
            value={from}
            onChange={setBase}
            options={baseOptions}
            mono
            className="w-full"
          />
        </div>
      </div>
      <div className={label}>
        <label htmlFor="branch-name">{t('Nombre de la rama')}</label>
        <Input
          id="branch-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!valid}
          aria-describedby="branch-name-hint"
          maxLength={200}
          spellCheck={false}
          autoComplete="off"
          className="font-mono text-[13px]"
        />
        <span
          id="branch-name-hint"
          className={cn('font-mono text-[11.5px] font-normal', valid ? 'text-muted-foreground' : 'text-late')}
        >
          {valid
            ? t('con el código de la tarea al principio, para que el PR se enlace solo')
            : t('usa letras, números, guiones, puntos y barras, sin espacios')}
        </span>
      </div>
      {canMove && (
        <div className="flex items-center gap-2.5 text-sm">
          <Checkbox
            id="branch-move"
            checked={move}
            onCheckedChange={(checked) => setMove(checked === true)}
          />
          <label htmlFor="branch-move">
            {t('Pasar la tarea a «{state}»', { state: stateName(target.name) })}
          </label>
        </div>
      )}
      <div className="bg-muted flex items-center gap-2.5 rounded-xl px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs">{command}</code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!valid}
          onClick={() => copy(command, t('Comando copiado'))}
        >
          {t('Copiar')}
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('Cancelar')}
        </Button>
        <Button type="submit" disabled={!valid || !repositoryId || !from || create.isPending}>
          {t('Crear rama')}
        </Button>
      </DialogFooter>
    </form>
  )
}

function LinkDialog({ open, onOpenChange, slug, project, issue, dev }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {open && (
          <LinkForm
            slug={slug}
            project={project}
            issue={issue}
            dev={dev}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Enlazar a mano lo que no nombra a la tarea: un pull request abierto sin tarea o una rama del repositorio. */
function LinkForm({ slug, project, issue, dev, onDone }) {
  const [repositoryId, setRepositoryId] = useState(dev.repositories[0]?.id ?? '')
  const [branch, setBranch] = useState('')
  const { data: branches, isLoading: loadingBranches } = useGithubRepoBranches(slug, project.id, repositoryId)
  const { data: pulls } = useGithubPulls(slug, project.id, 'open')
  const linkBranch = useLinkBranch(slug, project.id, issue.id)
  const linkPull = useLinkPullRequest(slug, project.id)
  const free = (pulls ?? []).filter((pull) => !pull.issueId)
  const linked = new Set(
    dev.branches
      .filter((candidate) => candidate.repositoryId === repositoryId)
      .map((candidate) => candidate.name),
  )
  const branchOptions = (branches ?? [])
    .filter((name) => !linked.has(name))
    .map((name) => ({ value: name, label: name }))

  const handlePull = (pull) =>
    linkPull.mutate(
      { pullRequestId: pull.id, issueId: issue.id },
      {
        onSuccess: () => {
          toast.success(
            t('Pull request #{number} enlazado a {code}', { number: pull.number, code: issue.code }),
          )
          onDone()
        },
        onError: (linkError) => notifyError(linkError, t('No se pudo enlazar')),
      },
    )
  const handleBranch = () =>
    linkBranch.mutate(
      { repositoryId, name: branch },
      {
        onSuccess: () => {
          toast.success(t('Rama {branch} enlazada', { branch }))
          onDone()
        },
        onError: (linkError) => notifyError(linkError, t('No se pudo enlazar')),
      },
    )

  const label = 'flex flex-col gap-1.5 text-sm font-medium'
  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{t('Enlazar una rama o un pull request a {code}', { code: issue.code })}</DialogTitle>
        <DialogDescription>
          {t('Para lo que no nombra a la tarea. Lo que sí la nombra se enlaza solo.')}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-medium">{t('Pull requests abiertos sin tarea')}</h3>
        {free.length === 0 ? (
          <p className="border-dash text-muted-foreground rounded-xl border border-dashed px-3 py-2.5 text-[13px]">
            {t('No hay ninguno.')}
          </p>
        ) : (
          <ul className="max-h-44 overflow-y-auto rounded-xl border">
            {free.map((pull, index) => (
              <li key={pull.id} className={cn(index > 0 && 'border-t')}>
                <button
                  type="button"
                  disabled={linkPull.isPending}
                  onClick={() => handlePull(pull)}
                  className="hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] focus-visible:outline-none"
                >
                  <span className="text-muted-foreground font-mono text-xs">#{pull.number}</span>
                  <span className="min-w-0 flex-1 truncate">{pull.title}</span>
                  <span className="text-muted-foreground font-mono text-[11.5px]">
                    {repoName(pull.repository)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={label}>
          {t('Repositorio')}
          <Pick
            label={t('Repositorio')}
            value={repositoryId}
            onChange={(value) => {
              setRepositoryId(value)
              setBranch('')
            }}
            options={dev.repositories.map((candidate) => ({
              value: candidate.id,
              label: candidate.fullName,
            }))}
            mono
            className="w-full"
          />
        </div>
        <div className={label}>
          {t('Rama')}
          <Pick
            label={t('Rama')}
            value={branch}
            onChange={setBranch}
            options={branchOptions}
            placeholder={loadingBranches ? t('Leyendo ramas…') : t('Elige una rama')}
            disabled={branchOptions.length === 0}
            mono
            className="w-full"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('Cancelar')}
        </Button>
        <Button type="button" onClick={handleBranch} disabled={!branch || linkBranch.isPending}>
          {t('Enlazar rama')}
        </Button>
      </DialogFooter>
    </div>
  )
}
