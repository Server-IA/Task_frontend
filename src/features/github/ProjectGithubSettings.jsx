import { useState } from 'react'
import { Link } from 'react-router'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ErrorState } from '@/components/common/States'
import { useStates } from '@/features/projects/hooks'
import { stateName, t, tn } from '@/i18n'
import { formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { GhMark, Pick } from './GithubParts'
import { branchFormats, repoName, ruleWhen, runState } from './githubModel'
import {
  useAddGithubRule,
  useDeleteGithubRule,
  useGithubProject,
  useGithubRepoBranches,
  useGithubWorkflows,
  useSaveGithubSettings,
  useSetRepositories,
} from './hooks'

/**
 * Pestaña «GitHub» de los ajustes de un proyecto: qué repositorios son suyos, a qué estado pasa la tarea cuando avanza
 * su rama o su pull request, y las reglas que ejecutan workflows de Actions.
 * @param {{ workspace: import('@/api/types').WorkspaceResponse, project: import('@/api/types').ProjectResponse }} props
 */
export function ProjectGithubSettings({ workspace, project }) {
  const { data: status, isLoading, error, refetch } = useGithubProject(workspace.slug, project.id)
  const canManage = can(workspace, 'GITHUB_MANAGE')

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[940px] flex-col gap-3.5">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={refetch} className="tf-panel" />
  if (!status.connected) return <NotConnected workspace={workspace} />

  return (
    <div className="mx-auto flex max-w-[940px] flex-col gap-3.5">
      {!canManage && (
        <p className="rounded-xl bg-muted px-3.5 py-2.5 text-[13px] leading-normal text-muted-foreground">
          {t('Puedes ver cómo está configurado. Cambiarlo pide el permiso «Configurar GitHub».')}
        </p>
      )}
      <Repositories workspace={workspace} project={project} status={status} canManage={canManage} />
      <Automations workspace={workspace} project={project} status={status} canManage={canManage} />
      <Rules workspace={workspace} project={project} status={status} canManage={canManage} />
    </div>
  )
}

function NotConnected({ workspace }) {
  return (
    <section className="tf-panel mx-auto flex max-w-[940px] flex-wrap items-center gap-3.5 px-6 py-5.5">
      <GhMark />
      <div className="flex-[1_1_320px]">
        <h2 className="text-[17px] font-semibold">{t('Este workspace no está conectado con GitHub')}</h2>
        <p className="mt-0.5 text-sm leading-normal text-muted-foreground">
          {t('Primero se conecta el workspace; después cada proyecto elige sus repositorios aquí.')}
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to={`/${workspace.slug}/settings?tab=integrations`}>{t('Ir a Integraciones')}</Link>
      </Button>
    </section>
  )
}

function Repositories({ workspace, project, status, canManage }) {
  const setRepositories = useSetRepositories(workspace.slug)
  const linkedIds = status.repositories.map((repository) => repository.id)
  const free = status.available.filter((repository) => !linkedIds.includes(repository.id))

  const save = (repositoryIds, done) =>
    setRepositories.mutate(
      { projectId: project.id, repositoryIds },
      { onSuccess: () => toast.success(done), onError: (saveError) => notifyError(saveError, t('No se pudo guardar')) },
    )

  return (
    <section aria-labelledby="github-linked-title" className="tf-panel flex flex-col gap-3 px-5 py-4.5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-[1_1_300px]">
          <h2 id="github-linked-title" className="text-[17px] font-semibold">
            {t('Repositorios de este proyecto')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Sus ramas, PR y pipelines se enlazan con las tareas que nombren: {code} en la rama, o en el título o la descripción del PR.', {
              code: `${project.identifier}-22`,
            })}
          </p>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2" disabled={free.length === 0 || setRepositories.isPending}>
                <Plus className="size-3.5" strokeWidth={3} aria-hidden="true" />
                {t('Enlazar repositorio')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {free.map((repository) => (
                <DropdownMenuItem
                  key={repository.id}
                  className="font-mono text-[13px]"
                  onSelect={() => save([...linkedIds, repository.id], t('{repository} enlazado', { repository: repository.fullName }))}
                >
                  {repository.fullName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {status.repositories.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-dash px-4 py-5 text-center text-sm text-muted-foreground">
          {status.available.length === 0
            ? t('La app de TaskFlow todavía no tiene acceso a ningún repositorio. Se eligen en GitHub, desde Ajustes del workspace → Integraciones.')
            : t('Este proyecto todavía no tiene repositorios. Enlaza uno para ver sus ramas y pull requests en las tareas.')}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border">
          {status.repositories.map((repository, index) => (
            <li key={repository.id} className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-2.5 px-3.5 py-2.75', index > 0 && 'border-t')}>
              <span className="min-w-0 flex-[1_1_240px] truncate font-mono text-[13px] font-semibold">{repository.fullName}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {[repository.defaultBranch, tn(repository.openPullRequests, '{count} PR abierto', '{count} PR abiertos')].filter(Boolean).join(' · ')}
              </span>
              {canManage && (
                <button
                  type="button"
                  aria-label={t('Quitar {name}', { name: repository.fullName })}
                  disabled={setRepositories.isPending}
                  onClick={() =>
                    save(
                      linkedIds.filter((id) => id !== repository.id),
                      t('{repository} ya no es de este proyecto', { repository: repository.fullName }),
                    )
                  }
                  className="flex size-7.5 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Las cuatro automatizaciones: cuándo pasa, qué grupo de estados se ofrece primero al encenderla y la nota. */
const AUTOMATIONS = () => [
  {
    key: 'onBranchStateId',
    when: t('Se crea la rama de la tarea'),
    note: t('Desde TaskFlow o con el código de la tarea en el nombre. Solo si la tarea no había empezado.'),
    prefer: ['STARTED'],
  },
  {
    key: 'onPrOpenedStateId',
    when: t('Se abre el pull request'),
    note: t('Un PR en borrador no cuenta hasta que se marca listo para revisar.'),
    prefer: ['STARTED'],
    review: true,
  },
  {
    key: 'onPrMergedStateId',
    when: t('Se fusiona el pull request'),
    note: t('Si a la tarea le faltan criterios de aceptación, no se completa sola: avisa a quien la tiene asignada.'),
    prefer: ['COMPLETED'],
  },
  {
    key: 'onPrClosedStateId',
    when: t('Se cierra el pull request sin fusionar'),
    note: t('Solo si la tarea seguía en curso.'),
    prefer: ['UNSTARTED', 'BACKLOG'],
  },
]

/** El estado que se propone al encender una automatización: el primero del grupo que le corresponde. */
export function defaultStateFor(automation, states) {
  const inGroup = states.filter((state) => automation.prefer.includes(state.group))
  // Para «se abre el PR», uno que suene a revisión si el proyecto lo tiene
  const review = automation.review && inGroup.find((state) => /review|revisi/i.test(state.name))
  return (review || inGroup[0] || states[0])?.id ?? null
}

function Automations({ workspace, project, status, canManage }) {
  const { data: states } = useStates(workspace.slug, project.id)
  const save = useSaveGithubSettings(workspace.slug, project.id)
  const settings = status.settings
  const formats = branchFormats()
  const format = formats.find((candidate) => candidate.value === settings.branchFormat) ?? formats[0]
  const stateOptions = (states ?? []).map((state) => ({ value: state.id, label: stateName(state.name) }))

  const change = (patch) => save.mutate({ ...settings, ...patch }, { onError: (saveError) => notifyError(saveError, t('No se pudo guardar')) })

  return (
    <section aria-labelledby="github-auto-title" className="tf-panel flex flex-col gap-3 px-5 py-4.5">
      <div>
        <h2 id="github-auto-title" className="text-[17px] font-semibold">
          {t('La tarea sigue al pull request')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('Cada cambio queda en la actividad de la tarea como hecho por GitHub, automático.')}</p>
      </div>
      <ul className="overflow-hidden rounded-[14px] border">
        {AUTOMATIONS().map((automation, index) => {
          const stateId = settings[automation.key]
          const on = Boolean(stateId)
          return (
            <li key={automation.key} className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-2.5 px-3.5 py-2.75', index > 0 && 'border-t')}>
              <Switch
                aria-label={automation.when}
                checked={on}
                disabled={!canManage || !states || save.isPending}
                onCheckedChange={(checked) => change({ [automation.key]: checked ? defaultStateFor(automation, states) : null })}
              />
              <span className="min-w-0 flex-[1_1_260px]">
                <span className={cn('block font-medium', !on && 'text-muted-foreground')}>{automation.when}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{automation.note}</span>
              </span>
              <span aria-hidden="true" className="text-muted-foreground">
                →
              </span>
              <Pick
                label={t('Estado al que pasa la tarea cuando: {when}', { when: automation.when })}
                value={stateId ?? ''}
                onChange={(value) => change({ [automation.key]: value })}
                options={stateOptions}
                placeholder={t('no se mueve')}
                disabled={!canManage || !on || save.isPending}
                className="w-[178px] text-[13px]"
              />
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2.5">
        <span id="github-branch-format" className="font-medium">
          {t('Nombre de las ramas que crea TaskFlow')}
        </span>
        <Pick
          label={t('Nombre de las ramas que crea TaskFlow')}
          value={format.value}
          onChange={(value) => change({ branchFormat: value })}
          options={formats}
          disabled={!canManage || save.isPending}
          className="w-[178px] text-[13px]"
        />
        <span className="font-mono text-xs text-muted-foreground">{format.example}</span>
      </div>
    </section>
  )
}

/** Cómo fue la última vez que se ejecutó una regla: «última vez hace 1 min · en curso». */
function lastRun(rule) {
  if (!rule.lastRunAt) return { text: t('todavía no se ha ejecutado'), tone: 'text-muted-foreground' }
  const state = runState({ status: rule.lastRunStatus, conclusion: rule.lastRunConclusion, runId: 1 })
  const tone = { ok: 'text-ok', fail: 'text-late', run: 'text-accent-text', wait: 'text-muted-foreground' }[state.result]
  return { text: t('última vez {when} · {state}', { when: formatRelative(rule.lastRunAt), state: state.label }), tone }
}

function Rules({ workspace, project, status, canManage }) {
  const remove = useDeleteGithubRule(workspace.slug, project.id)
  const [adding, setAdding] = useState(false)
  const chip = 'rounded-[9px] border bg-background px-2.5 py-1.5 text-[13px] font-medium'
  const word = 'font-mono text-[11.5px] text-muted-foreground'

  const handleRemove = (rule) =>
    remove.mutate(rule.id, {
      onSuccess: () => toast.success(t('Regla quitada')),
      onError: (removeError) => notifyError(removeError, t('No se pudo quitar')),
    })

  return (
    <section aria-labelledby="github-rules-title" className="tf-panel flex flex-col gap-3 px-5 py-4.5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-[1_1_300px]">
          <h2 id="github-rules-title" className="text-[17px] font-semibold">
            {t('Reglas de GitHub Actions')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Cuando pasa algo en una tarea, TaskFlow le pide a GitHub que ejecute un workflow. El resultado se ve en la tarea y en GitHub → Actions.')}
          </p>
        </div>
        {canManage && !adding && (
          <Button variant="outline" className="gap-2" onClick={() => setAdding(true)} disabled={status.repositories.length === 0}>
            <Plus className="size-3.5" strokeWidth={3} aria-hidden="true" />
            {t('Nueva regla')}
          </Button>
        )}
      </div>
      {status.rules.length === 0 && !adding && (
        <p className="rounded-[14px] border border-dashed border-dash px-4 py-5 text-center text-sm text-muted-foreground">
          {status.repositories.length === 0 ? t('Enlaza un repositorio para poder crear reglas.') : t('Este proyecto todavía no tiene reglas.')}
        </p>
      )}
      {status.rules.map((rule) => {
        const last = lastRun(rule)
        return (
          <div key={rule.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-[14px] border px-3.5 py-3">
            <span className={word}>{t('cuando')}</span>
            <span className={chip}>{ruleWhen(rule.firesOn)}</span>
            <span className={word}>{t('ejecutar')}</span>
            <span className={chip}>{rule.workflowName}</span>
            <span className={word}>{t('en')}</span>
            <span className={cn(chip, 'font-mono text-[12.5px] font-normal')}>
              {repoName(rule.repository)} · {rule.ref}
            </span>
            <span className={cn('ml-auto font-mono text-[11.5px]', last.tone)}>{last.text}</span>
            {canManage && (
              <button
                type="button"
                aria-label={t('Quitar la regla «{name}»', { name: rule.workflowName })}
                disabled={remove.isPending}
                onClick={() => handleRemove(rule)}
                className="flex size-7.5 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )
      })}
      {adding && <NewRule workspace={workspace} project={project} repositories={status.repositories} onDone={() => setAdding(false)} />}
      <p className="rounded-xl bg-muted px-3 py-2.5 text-[12.5px] leading-normal text-muted-foreground">
        {t(
          'Si el workflow ya corre solo al hacer push a main, no hace falta una regla: GitHub lo lanza al fusionar y TaskFlow lo muestra en la tarea. Las reglas sirven para lo que GitHub no sabe, como «la tarea quedó completada». Solo se pueden elegir workflows que acepten ejecución manual (workflow_dispatch).',
        )}
      </p>
    </section>
  )
}

/** La regla que se está armando: cuándo, en qué repositorio, qué workflow y sobre qué rama. */
function NewRule({ workspace, project, repositories, onDone }) {
  const [firesOn, setFiresOn] = useState('PR_MERGED')
  const [repositoryId, setRepositoryId] = useState(repositories[0]?.id ?? '')
  const [workflowId, setWorkflowId] = useState('')
  const [ref, setRef] = useState('')
  const repository = repositories.find((candidate) => candidate.id === repositoryId)
  const { data: workflows, isLoading: loadingWorkflows, error: workflowsError } = useGithubWorkflows(workspace.slug, project.id, repositoryId)
  const { data: branches } = useGithubRepoBranches(workspace.slug, project.id, repositoryId)
  const add = useAddGithubRule(workspace.slug, project.id)
  const word = 'font-mono text-[11.5px] text-muted-foreground'

  const branch = ref || repository?.defaultBranch || ''
  const workflow = workflows?.find((candidate) => String(candidate.id) === workflowId)
  const branchOptions = [...new Set([branch, ...(branches ?? [])].filter(Boolean))].map((name) => ({ value: name, label: name }))

  const handleRepository = (value) => {
    setRepositoryId(value)
    setWorkflowId('')
    setRef('')
  }
  const handleSave = () =>
    add.mutate(
      { firesOn, repositoryId, workflowId: workflow.id, workflowName: workflow.name, ref: branch },
      {
        onSuccess: () => {
          toast.success(t('Regla creada'))
          onDone()
        },
        onError: (saveError) => notifyError(saveError, t('No se pudo crear la regla')),
      },
    )

  return (
    <div role="group" aria-label={t('Nueva regla')} className="flex flex-col gap-2.5 rounded-[14px] border border-ring bg-accent-soft/40 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <span className={word}>{t('cuando')}</span>
        <Pick
          label={t('Cuándo se ejecuta')}
          value={firesOn}
          onChange={setFiresOn}
          options={['PR_MERGED', 'ISSUE_COMPLETED'].map((value) => ({ value, label: ruleWhen(value) }))}
          className="w-[250px] bg-background text-[13px]"
        />
        <span className={word}>{t('en')}</span>
        <Pick
          label={t('Repositorio')}
          value={repositoryId}
          onChange={handleRepository}
          options={repositories.map((candidate) => ({ value: candidate.id, label: repoName(candidate.fullName) }))}
          mono
          className="w-[170px] bg-background"
        />
        <span className={word}>{t('ejecutar')}</span>
        <Pick
          label={t('Workflow')}
          value={workflowId}
          onChange={setWorkflowId}
          options={(workflows ?? []).map((candidate) => ({ value: String(candidate.id), label: candidate.name }))}
          placeholder={loadingWorkflows ? t('Leyendo workflows…') : t('Elige un workflow')}
          disabled={!workflows || workflows.length === 0}
          className="w-[210px] bg-background text-[13px]"
        />
        <span className={word}>{t('sobre')}</span>
        <Pick label={t('Rama')} value={branch} onChange={setRef} options={branchOptions} mono className="w-[150px] bg-background" />
      </div>
      {workflowsError && <p className="text-[12.5px] text-late">{t('No se pudieron leer los workflows de GitHub. Vuelve a intentarlo en un momento.')}</p>}
      {workflows?.length === 0 && (
        <p className="text-[12.5px] text-muted-foreground">
          {t('Ese repositorio no tiene workflows que acepten ejecución manual. Agrégale «workflow_dispatch» a su «on:» y vuelve a intentarlo.')}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t('Cancelar')}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!workflow || !branch || add.isPending}>
          {t('Guardar regla')}
        </Button>
      </div>
    </div>
  )
}
