import { useState } from 'react'
import { Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'
import { notifyError } from '@/lib/notify'
import { Pick } from './GithubParts'
import { useDispatchWorkflow, useGithubRepoBranches, useGithubWorkflows } from './hooks'
import { IssuePicker } from './IssuePicker'

/**
 * «Ejecutar workflow»: elegir repositorio, workflow (solo los que aceptan ejecución manual), rama y los datos que pida;
 * opcionalmente, la tarea a la que corresponde.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, workspace: object, project: object,
 *           repositories: import('./api').Repository[], issue?: { id: string, code: string, title: string } }} props
 *        `issue`: la tarea desde la que se abre (queda como tarea relacionada)
 */
export function RunWorkflowDialog({
  open,
  onOpenChange,
  workspace,
  project,
  repositories,
  issue: initialIssue = null,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-3rem)] overflow-y-auto sm:max-w-[520px]">
        {/* El formulario se monta al abrir: cada vez empieza limpio */}
        {open && (
          <RunForm
            workspace={workspace}
            project={project}
            repositories={repositories}
            initialIssue={initialIssue}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RunForm({ workspace, project, repositories, initialIssue, onDone }) {
  const slug = workspace.slug
  const [repositoryId, setRepositoryId] = useState(repositories[0]?.id ?? '')
  const [workflowId, setWorkflowId] = useState('')
  const [ref, setRef] = useState('')
  const [inputs, setInputs] = useState({})
  const [issue, setIssue] = useState(initialIssue)
  const repository = repositories.find((candidate) => candidate.id === repositoryId)
  const {
    data: workflows,
    isLoading: loadingWorkflows,
    error: workflowsError,
  } = useGithubWorkflows(slug, project.id, repositoryId)
  const { data: branches } = useGithubRepoBranches(slug, project.id, repositoryId)
  const dispatch = useDispatchWorkflow(slug, project.id)

  const workflow = workflows?.find((candidate) => String(candidate.id) === workflowId)
  const branch = ref || repository?.defaultBranch || ''
  const branchOptions = [...new Set([branch, ...(branches ?? [])].filter(Boolean))].map((name) => ({
    value: name,
    label: name,
  }))

  const handleRepository = (value) => {
    setRepositoryId(value)
    setWorkflowId('')
    setRef('')
    setInputs({})
  }
  const handleSubmit = (event) => {
    event.preventDefault()
    // Solo se mandan los datos que se llenaron: los demás toman el valor por defecto del workflow
    const filled = Object.fromEntries(
      workflow.inputs.map((name) => [name, (inputs[name] ?? '').trim()]).filter(([, value]) => value),
    )
    dispatch.mutate(
      {
        repositoryId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        ref: branch,
        inputs: filled,
        issueId: issue?.id ?? null,
      },
      {
        onSuccess: () => {
          toast.success(t('Se pidió ejecutar «{name}» en {branch}', { name: workflow.name, branch }))
          onDone()
        },
        onError: (dispatchError) => notifyError(dispatchError, t('No se pudo ejecutar')),
      },
    )
  }

  const label = 'flex flex-col gap-1.5 text-sm font-medium'
  const hint = 'font-mono text-[11.5px] font-normal text-muted-foreground'
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{t('Ejecutar workflow')}</DialogTitle>
        <DialogDescription>
          {t('Lo lanza GitHub Actions en el repositorio; aquí queda quién lo pidió y su resultado.')}
        </DialogDescription>
      </DialogHeader>
      <div className={label}>
        {t('Repositorio')}
        <Pick
          label={t('Repositorio')}
          value={repositoryId}
          onChange={handleRepository}
          options={repositories.map((candidate) => ({ value: candidate.id, label: candidate.fullName }))}
          mono
          className="w-full"
        />
      </div>
      <div className={label}>
        {t('Workflow')}
        <Pick
          label={t('Workflow')}
          value={workflowId}
          onChange={(value) => {
            setWorkflowId(value)
            setInputs({})
          }}
          options={(workflows ?? []).map((candidate) => ({
            value: String(candidate.id),
            label: `${candidate.name} · ${candidate.path.split('/').pop()}`,
          }))}
          placeholder={loadingWorkflows ? t('Leyendo workflows…') : t('Elige un workflow')}
          disabled={!workflows || workflows.length === 0}
          className="w-full"
        />
        <span className={hint}>
          {workflowsError
            ? t('No se pudieron leer los workflows de GitHub. Vuelve a intentarlo en un momento.')
            : workflows?.length === 0
              ? t(
                  'Ese repositorio no tiene workflows que acepten ejecución manual. Agrégale «workflow_dispatch» a su «on:» y vuelve a intentarlo.',
                )
              : t('solo aparecen los que aceptan ejecución manual (workflow_dispatch)')}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={label}>
          {t('Rama')}
          <Pick
            label={t('Rama')}
            value={branch}
            onChange={setRef}
            options={branchOptions}
            mono
            className="w-full"
          />
        </div>
        {workflow?.inputs.map((name) => (
          <div key={name} className={label}>
            <label htmlFor={`workflow-input-${name}`} title={name} className="truncate font-mono">
              {name}
            </label>
            <Input
              id={`workflow-input-${name}`}
              value={inputs[name] ?? ''}
              onChange={(event) => setInputs((current) => ({ ...current, [name]: event.target.value }))}
              aria-describedby={`workflow-input-${name}-hint`}
              maxLength={200}
              className="h-8.5"
            />
            <span id={`workflow-input-${name}-hint`} className={hint}>
              {t('dato que pide el workflow')}
            </span>
          </div>
        ))}
      </div>
      <div className={label}>
        <span>
          {t('Tarea relacionada')} <span className={hint}>{t('opcional')}</span>
        </span>
        <IssuePicker
          slug={slug}
          projectId={project.id}
          onPick={setIssue}
          clearLabel={issue ? t('Sin tarea') : undefined}
        >
          <button
            type="button"
            aria-label={
              issue ? t('Tarea relacionada: {code}', { code: issue.code }) : t('Tarea relacionada: ninguna')
            }
            className="focus-visible:ring-ring flex h-8.5 w-full items-center gap-2 rounded-md border bg-transparent px-3 text-left text-sm font-normal shadow-xs focus-visible:ring-2 focus-visible:outline-none"
          >
            {issue ? (
              <>
                <span className="font-mono text-xs font-semibold">{issue.code}</span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate">{issue.title}</span>
              </>
            ) : (
              <span className="text-muted-foreground flex-1">{t('Ninguna')}</span>
            )}
            <span aria-hidden="true" className="text-muted-foreground">
              ▾
            </span>
          </button>
        </IssuePicker>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('Cancelar')}
        </Button>
        <Button type="submit" className="gap-2" disabled={!workflow || !branch || dispatch.isPending}>
          <Play className="size-3.5" aria-hidden="true" />
          {t('Ejecutar')}
        </Button>
      </DialogFooter>
    </form>
  )
}
