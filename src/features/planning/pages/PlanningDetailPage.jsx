import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CircleDot, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarStack } from '@/components/common/AvatarStack'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner } from '@/components/common/Loaders'
import { EmptyState, ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { PriorityChip } from '@/features/issues/components/PriorityIcon'
import { IssuePeekSheet } from '@/features/issues/components/IssuePeekSheet'
import { useIssues } from '@/features/issues/hooks'
import { isClosed } from '@/features/issues/useIssueHelpers'
import { useIssueFilters } from '@/features/issues/useIssueFilters'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace, useIsManager } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { notifyError } from '@/lib/notify'
import { projectPath } from '@/lib/paths'
import { slugify } from '@/lib/slug'
import { cn } from '@/lib/utils'
import { PLANNING, useDeletePlanning, usePlanningItem, useRemovePlanningIssue } from '../hooks'
import {
  AddIssuesDialog,
  CYCLE_STATUS,
  CycleStatusBadge,
  DateRange,
  PLANNING_TEXT,
  PlanningFormDialog,
  ProgressBar,
  remainingText,
} from '../components/PlanningShared'

/** Detalle de un ciclo o módulo: avance y sus tareas (agregar, quitar, abrir). */
export function PlanningDetailPage({ kind }) {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const { itemId } = useParams()
  const navigate = useNavigate()
  const text = PLANNING_TEXT[kind]
  const { data: item, isLoading, error, refetch } = usePlanningItem(kind, workspace.slug, project.id, itemId)
  const { data: issuesPage, isLoading: issuesLoading } = usePlanningIssues(kind, workspace.slug, project.id, itemId)
  const issueFilters = useIssueFilters()
  const remove = useDeletePlanning(kind, workspace.slug, project.id)
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Editar y eliminar el ciclo/módulo es del project manager; agregar o quitar tareas, de todos
  const canManage = useIsManager()
  const listUrl = `/${workspace.slug}/projects/${project.id}/${kind}`
  const listPath = [...projectPath(workspace, project), { label: kind === 'cycles' ? 'ciclos' : 'modulos', to: listUrl }]

  const issues = useMemo(() => issuesPage?.content ?? [], [issuesPage])

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error) {
    return (
      <>
        <PageHeader path={listPath} title={text.title} />
        <ErrorState error={error} onRetry={refetch} homeLink={listUrl} className="flex-1" />
      </>
    )
  }

  const end = item.endDate ?? item.targetDate
  const showRemaining = kind === 'cycles' && item.status === 'CURRENT' && end

  return (
    <>
      <PageHeader
        path={[...listPath, { label: slugify(item.name) || item.name }]}
        title={item.name}
        titleAddon={kind === 'cycles' && <CycleStatusBadge status={item.status} />}
        documentTitle={[item.name, project.name]}
        description={
          <>
            {item.description && <p className="max-w-2xl whitespace-pre-wrap">{item.description}</p>}
            <p className="mt-1 font-mono text-xs">
              <DateRange start={item.startDate} end={end} />
              {showRemaining && <span className="font-semibold text-ok"> · {remainingText(end)}</span>}
            </p>
          </>
        }
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-72">
            <div className="flex items-center gap-2 sm:justify-end">
              {canManage && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => setConfirmDelete(true)}
                    aria-label={`Eliminar ${text.singular}`}
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus strokeWidth={3} />
                Agregar tareas
              </Button>
            </div>
            <ProgressBlock kind={kind} item={item} issues={issues} />
          </div>
        }
      />
      <PageBody>
        <PlanningIssues
          kind={kind}
          slug={workspace.slug}
          projectId={project.id}
          item={item}
          issues={issues}
          isLoading={issuesLoading}
          onOpenIssue={issueFilters.openIssue}
          onAdd={() => setAddOpen(true)}
        />
      </PageBody>

      <IssuePeekSheet
        slug={workspace.slug}
        project={project}
        issueId={issueFilters.openIssueId}
        onClose={issueFilters.closeIssue}
        onOpenIssue={issueFilters.openIssue}
      />
      <PlanningFormDialog
        kind={kind}
        slug={workspace.slug}
        projectId={project.id}
        item={item}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`¿Eliminar «${item.name}»?`}
        description="Las tareas no se borran: solo dejan de pertenecer a él."
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(item.id, {
            onSuccess: () => {
              toast.success(`«${item.name}» eliminado`)
              navigate(listUrl, { replace: true })
            },
            onError: (deleteError) => notifyError(deleteError),
          })
        }
      />
      <AddIssuesDialog
        kind={kind}
        slug={workspace.slug}
        projectId={project.id}
        item={item}
        existingIds={new Set(issues.map((issue) => issue.id))}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </>
  )
}

function usePlanningIssues(kind, slug, projectId, itemId) {
  const params = { [PLANNING[kind].filterParam]: itemId, size: 200, sort: 'sortOrder,asc' }
  return useIssues(slug, projectId, params)
}

/** «50%  4 de 8 completadas», la barra y el desglose «○ 3 por hacer ◐ 1 en curso ● 4 hechas». */
function ProgressBlock({ kind, item, issues }) {
  const { completedIssues, totalIssues, percentage } = item.progress
  const started = issues.filter((issue) => issue.state?.group === 'STARTED').length
  const pending = issues.filter((issue) => !isClosed(issue) && issue.state?.group !== 'STARTED').length
  const bar = kind === 'cycles' ? (CYCLE_STATUS[item.status] ?? CYCLE_STATUS.DRAFT).bar : 'bg-accent-text'

  return (
    <div>
      <p className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-display text-[28px] leading-none font-extrabold">{percentage}%</span>
        <span className="text-xs text-muted-foreground">
          {completedIssues} de {totalIssues} completadas
        </span>
      </p>
      <ProgressBar value={percentage} className={bar} />
      <p className="mt-1.5 flex justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span>○ {pending} por hacer</span>
        <span>◐ {started} en curso</span>
        <span>● {completedIssues} hechas</span>
      </p>
    </div>
  )
}

function PlanningIssues({ kind, slug, projectId, item, issues, isLoading, onOpenIssue, onAdd }) {
  const removeIssue = useRemovePlanningIssue(kind, slug, projectId)
  const singular = PLANNING_TEXT[kind].singular

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />

  if (issues.length === 0) {
    return (
      <EmptyState
        icon={CircleDot}
        title="Sin tareas"
        description={`Agrega tareas del proyecto a este ${singular}.`}
        action={
          <Button onClick={onAdd}>
            <Plus />
            Agregar tareas
          </Button>
        }
      />
    )
  }

  return (
    <section aria-label={`Tareas del ${singular}`} className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-center gap-2 bg-column px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] uppercase">
        <h2 className="font-semibold">Tareas del {singular}</h2>
        <span className="text-muted-foreground">{String(issues.length).padStart(2, '0')}</span>
      </header>
      <ul>
        {issues.map((issue) => {
          const closed = isClosed(issue)
          return (
            <li key={issue.id} className="group flex items-center gap-3 border-t px-4 py-2 hover:bg-subtle">
              <button type="button" onClick={() => onOpenIssue(issue.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <StateIcon group={issue.state?.group} color={issue.state?.color} />
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{issue.code}</span>
                <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', closed && 'text-muted-foreground line-through')}>
                  {issue.title}
                </span>
                {issue.priority !== 'NONE' && <PriorityChip priority={issue.priority} className="hidden sm:inline-flex" />}
                {issue.assignees?.length > 0 && <AvatarStack users={issue.assignees} size="sm" />}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Quitar ${issue.code} del ${singular}`}
                title={`Quitar del ${singular}`}
                disabled={removeIssue.isPending}
                onClick={() =>
                  removeIssue.mutate(
                    { id: item.id, issueId: issue.id },
                    {
                      onSuccess: () => toast.success(`${issue.code} quitada de «${item.name}»`),
                      onError: (removeError) => notifyError(removeError),
                    },
                  )
                }
              >
                <X />
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
