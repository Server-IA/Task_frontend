import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CircleDot, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarStack } from '@/components/common/AvatarStack'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner } from '@/components/common/Loaders'
import { EmptyState, ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { PriorityIcon } from '@/features/issues/components/PriorityIcon'
import { IssuePeekSheet } from '@/features/issues/components/IssuePeekSheet'
import { useIssues } from '@/features/issues/hooks'
import { useIssueFilters } from '@/features/issues/useIssueFilters'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { notifyError } from '@/lib/notify'
import { PLANNING, useDeletePlanning, usePlanningItem, useRemovePlanningIssue } from '../hooks'
import {
  AddIssuesDialog,
  CycleStatusBadge,
  DateRange,
  PLANNING_TEXT,
  PlanningFormDialog,
  ProgressSummary,
} from '../components/PlanningShared'

/** Detalle de un ciclo o módulo: avance y sus issues (agregar, quitar, abrir). */
export function PlanningDetailPage({ kind }) {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const { itemId } = useParams()
  const navigate = useNavigate()
  const text = PLANNING_TEXT[kind]
  const { data: item, isLoading, error, refetch } = usePlanningItem(kind, workspace.slug, project.id, itemId)
  const issueFilters = useIssueFilters()
  const remove = useDeletePlanning(kind, workspace.slug, project.id)
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const listUrl = `/${workspace.slug}/projects/${project.id}/${kind}`

  const breadcrumbs = [
    { label: workspace.name, to: `/${workspace.slug}` },
    { label: project.name, to: `/${workspace.slug}/projects/${project.id}/issues` },
    { label: text.title, to: listUrl },
    { label: item?.name ?? '…' },
  ]

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error) {
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} />
        <ErrorState error={error} onRetry={refetch} homeLink={listUrl} className="flex-1" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)} aria-label="Editar">
              <Pencil />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Eliminar">
              <Trash2 />
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus />
              Agregar issues
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
          <Card className="gap-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{item.name}</h1>
              {kind === 'cycles' && <CycleStatusBadge status={item.status} />}
            </div>
            {item.description && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{item.description}</p>}
            <div className="grid gap-4 sm:grid-cols-[1fr_18rem] sm:items-end">
              <p className="text-sm">
                <span className="text-muted-foreground">Fechas: </span>
                <DateRange start={item.startDate} end={item.endDate ?? item.targetDate} />
              </p>
              <ProgressSummary progress={item.progress} />
            </div>
          </Card>
          <PlanningIssues
            kind={kind}
            slug={workspace.slug}
            projectId={project.id}
            item={item}
            onOpenIssue={issueFilters.openIssue}
            onAdd={() => setAddOpen(true)}
          />
        </div>
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
        description="Los issues no se borran: solo dejan de pertenecer a él."
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
      <PlanningIssuesAddDialog kind={kind} slug={workspace.slug} projectId={project.id} item={item} open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}

function usePlanningIssues(kind, slug, projectId, itemId) {
  const params = { [PLANNING[kind].filterParam]: itemId, size: 200, sort: 'sortOrder,asc' }
  return useIssues(slug, projectId, params)
}

function PlanningIssuesAddDialog({ kind, slug, projectId, item, open, onOpenChange }) {
  const { data } = usePlanningIssues(kind, slug, projectId, item.id)
  const existingIds = useMemo(() => new Set((data?.content ?? []).map((issue) => issue.id)), [data])
  return (
    <AddIssuesDialog
      kind={kind}
      slug={slug}
      projectId={projectId}
      item={item}
      existingIds={existingIds}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

function PlanningIssues({ kind, slug, projectId, item, onOpenIssue, onAdd }) {
  const { data, isLoading } = usePlanningIssues(kind, slug, projectId, item.id)
  const removeIssue = useRemovePlanningIssue(kind, slug, projectId)

  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    )
  }

  const issues = data?.content ?? []
  if (issues.length === 0) {
    return (
      <EmptyState
        icon={CircleDot}
        title="Sin issues"
        description={`Agrega issues del proyecto a este ${PLANNING_TEXT[kind].singular}.`}
        action={
          <Button onClick={onAdd}>
            <Plus />
            Agregar issues
          </Button>
        }
      />
    )
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">Issues ({issues.length})</h2>
      <ul className="divide-y rounded-xl border">
        {issues.map((issue) => (
          <li key={issue.id} className="group flex items-center gap-3 px-4 py-2 hover:bg-accent/50">
            <button
              type="button"
              onClick={() => onOpenIssue(issue.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <StateIcon group={issue.state?.group} color={issue.state?.color} />
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{issue.code}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{issue.title}</span>
              <PriorityIcon priority={issue.priority} />
              {issue.assignees?.length > 0 && <AvatarStack users={issue.assignees} size="xs" />}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Quitar ${issue.code}`}
              title={`Quitar del ${PLANNING_TEXT[kind].singular}`}
              disabled={removeIssue.isPending}
              onClick={() =>
                removeIssue.mutate(
                  { id: item.id, issueId: issue.id },
                  {
                    onSuccess: () => toast.success(`${issue.code} quitado de «${item.name}»`),
                    onError: (removeError) => notifyError(removeError),
                  },
                )
              }
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
