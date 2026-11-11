import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CircleDot, Flag, MessagesSquare, Pencil, Plus, Trash2, X } from 'lucide-react'
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
import { useCan, useCurrentWorkspace } from '@/features/workspaces/hooks'
import { t, tn } from '@/i18n'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { notifyError } from '@/lib/notify'
import { projectPath } from '@/lib/paths'
import { slugify } from '@/lib/slug'
import { cn } from '@/lib/utils'
import { canCloseCycle, isCycleClosed } from '../closeCycle'
import { PLANNING, useDeletePlanning, usePlanningItem, useRemovePlanningIssue } from '../hooks'
import { planningListCount, progressBreakdown } from '../progressBreakdown'
import { CloseCycleDialog } from '../components/CloseCycleDialog'
import {
  AddIssuesDialog,
  ClosedByText,
  CYCLE_STATUS,
  CycleStatusBadge,
  cycleStatusKey,
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
  const [closeOpen, setCloseOpen] = useState(false)
  // Editar, eliminar, cerrar y mover tareas van cada uno por su permiso
  const canEdit = useCan(kind === 'cycles' ? 'CYCLE_EDIT' : 'MODULE_EDIT')
  const canDelete = useCan(kind === 'cycles' ? 'CYCLE_DELETE' : 'MODULE_DELETE')
  const canClose = useCan('CYCLE_CLOSE')
  const canAssign = useCan(kind === 'cycles' ? 'CYCLE_ASSIGN' : 'MODULE_ASSIGN')
  const listUrl = `/${workspace.slug}/projects/${project.id}/${kind}`
  const listPath = [...projectPath(workspace, project), { label: kind === 'cycles' ? t('ciclos') : t('modulos'), to: listUrl }]

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
  // Un ciclo cerrado ya no recibe ni suelta tareas (409): sus números quedaron fijos al cerrarlo
  const closed = kind === 'cycles' && isCycleClosed(item)
  const showRemaining = kind === 'cycles' && !closed && item.status === 'CURRENT' && end
  // Cerrar el ciclo: el project manager, si ya empezó y sigue abierto
  const showClose = kind === 'cycles' && canClose && canCloseCycle(item)

  return (
    <>
      <PageHeader
        path={[...listPath, { label: slugify(item.name) || item.name }]}
        title={item.name}
        titleAddon={kind === 'cycles' && <CycleStatusBadge cycle={item} />}
        documentTitle={[item.name, project.name]}
        description={
          <>
            {item.description && <p className="max-w-2xl whitespace-pre-wrap">{item.description}</p>}
            <p className="mt-1 font-mono text-xs">
              <DateRange start={item.startDate} end={end} />
              {showRemaining && <span className="font-semibold text-ok"> · {remainingText(end)}</span>}
              {closed && <ClosedByText cycle={item} />}
            </p>
          </>
        }
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  {t('Editar')}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={() => setConfirmDelete(true)}
                  aria-label={text.deleteLabel}
                >
                  <Trash2 />
                </Button>
              )}
              {closed && (
                <Button size="sm" asChild>
                  <Link to={`${listUrl}/${item.id}/retro`}>
                    <MessagesSquare />
                    {t('Ver retrospectiva')}
                  </Link>
                </Button>
              )}
              {showClose && (
                <Button variant="outline" size="sm" onClick={() => setCloseOpen(true)}>
                  <Flag />
                  {t('Cerrar ciclo')}
                </Button>
              )}
              {!closed && (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus strokeWidth={3} />
                  {t('Agregar tareas')}
                </Button>
              )}
            </div>
            {/* Del ancho de los botones: cuando bajan debajo del título, el avance ya no queda corrido a la derecha */}
            <div className="w-full self-stretch sm:min-w-72">
              <ProgressBlock kind={kind} item={item} issues={issues} />
            </div>
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
          onAdd={closed || !canAssign ? undefined : () => setAddOpen(true)}
          canRemove={!closed && canAssign}
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
        title={t('¿Eliminar «{name}»?', { name: item.name })}
        description={t('Las tareas no se borran: solo dejan de pertenecer a él.')}
        confirmLabel={t('Eliminar')}
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(item.id, {
            onSuccess: () => {
              toast.success(t('«{name}» eliminado', { name: item.name }))
              navigate(listUrl, { replace: true })
            },
            onError: (deleteError) => notifyError(deleteError),
          })
        }
      />
      {kind === 'cycles' && canClose && (
        <CloseCycleDialog slug={workspace.slug} projectId={project.id} cycle={item} open={closeOpen} onOpenChange={setCloseOpen} />
      )}
      <AddIssuesDialog
        kind={kind}
        slug={workspace.slug}
        projectId={project.id}
        item={item}
        existingIds={new Set(issues.map((issue) => issue.id))}
        // Si otra persona cierra el ciclo con el diálogo abierto, se cierra (el ciclo ya no acepta tareas)
        open={addOpen && !closed}
        onOpenChange={setAddOpen}
      />
    </>
  )
}

function usePlanningIssues(kind, slug, projectId, itemId) {
  const params = { [PLANNING[kind].filterParam]: itemId, size: 200, sort: 'sortOrder,asc' }
  return useIssues(slug, projectId, params)
}

/**
 * «50%  4 de 8 completadas», la barra y el desglose «○ 3 por hacer ◐ 1 en curso ● 4 hechas» (sin las historias, como
 * el avance: las tres partes suman el total).
 */
function ProgressBlock({ kind, item, issues }) {
  const { completedIssues, totalIssues, percentage } = item.progress
  const { started, pending } = progressBreakdown(issues)
  const bar = kind === 'cycles' ? (CYCLE_STATUS[cycleStatusKey(item)] ?? CYCLE_STATUS.DRAFT).bar : 'bg-accent-text'

  return (
    <div>
      <p className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-display text-[28px] leading-none font-extrabold">{percentage}%</span>
        <span className="text-xs text-muted-foreground">
          {totalIssues === 0 ? t('Sin tareas') : t('{completed} de {total} completadas', { completed: completedIssues, total: totalIssues })}
        </span>
      </p>
      <ProgressBar value={percentage} className={bar} />
      <p className="mt-1.5 flex justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span>{t('○ {count} por hacer', { count: pending })}</span>
        <span>{t('◐ {count} en curso', { count: started })}</span>
        <span>{tn(completedIssues, '● {count} hecha', '● {count} hechas')}</span>
      </p>
    </div>
  )
}

export function PlanningIssues({ kind, slug, projectId, item, issues, isLoading, onOpenIssue, onAdd, canRemove = true }) {
  const removeIssue = useRemovePlanningIssue(kind, slug, projectId)
  const text = PLANNING_TEXT[kind]
  const count = useMemo(() => planningListCount(issues), [issues])

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />

  if (issues.length === 0) {
    return (
      <EmptyState
        icon={CircleDot}
        title={t('Sin tareas')}
        description={onAdd ? text.addHint : t('El ciclo está cerrado: ya no recibe tareas.')}
        action={
          onAdd && (
            <Button onClick={onAdd}>
              <Plus />
              {t('Agregar tareas')}
            </Button>
          )
        }
      />
    )
  }

  return (
    <section aria-label={text.issuesTitle} className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-center gap-2 bg-column px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] uppercase">
        <h2 className="font-semibold">{text.issuesTitle}</h2>
        {/* Como el avance: tareas y bugs sin cancelar; las historias y canceladas de la lista, aparte */}
        <span className="text-muted-foreground" title={count.title}>
          {count.text}
        </span>
      </header>
      <ul>
        {issues.map((issue) => {
          const closed = isClosed(issue)
          return (
            <li key={issue.id} className="group flex items-center gap-3 border-t px-4 py-2 hover:bg-subtle">
              <button type="button" onClick={() => onOpenIssue(issue.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <StateIcon group={issue.state?.group} color={issue.state?.color} />
                <span className="min-w-16 shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{issue.code}</span>
                <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', closed && 'text-muted-foreground line-through')}>
                  {issue.title}
                </span>
                {issue.priority !== 'NONE' && <PriorityChip priority={issue.priority} className="hidden sm:inline-flex" />}
                {issue.assignees?.length > 0 && <AvatarStack users={issue.assignees} size="sm" />}
              </button>
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={text.removeLabel(issue.code)}
                  title={text.removeTitle}
                  disabled={removeIssue.isPending}
                  onClick={() =>
                    removeIssue.mutate(
                      { id: item.id, issueId: issue.id },
                      {
                        onSuccess: () => toast.success(t('{code} quitada de «{name}»', { code: issue.code, name: item.name })),
                        onError: (removeError) => notifyError(removeError),
                      },
                    )
                  }
                >
                  <X />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
