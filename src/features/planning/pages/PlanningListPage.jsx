import { useState } from 'react'
import { Link } from 'react-router'
import { Flag, Layers, MessagesSquare, MoreHorizontal, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, ErrorState } from '@/components/common/States'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace, useIsManager } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { projectPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { notifyError } from '@/lib/notify'
import { canCloseCycle, isCycleClosed } from '../closeCycle'
import { sortCycles } from '../cycleOrder'
import { useDeletePlanning, usePlanningList } from '../hooks'
import { CloseCycleDialog } from '../components/CloseCycleDialog'
import {
  ClosedByText,
  CYCLE_STATUS,
  CycleStatusBadge,
  cycleStatusKey,
  DateRange,
  PLANNING_TEXT,
  PlanningFormDialog,
  ProgressSummary,
  remainingText,
} from '../components/PlanningShared'

/** Lista de ciclos o de módulos del proyecto (`kind` = 'cycles' | 'modules'). */
export function PlanningListPage({ kind }) {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const text = PLANNING_TEXT[kind]
  const { data: items, isLoading, error, refetch } = usePlanningList(kind, workspace.slug, project.id)
  const remove = useDeletePlanning(kind, workspace.slug, project.id)
  const [formState, setFormState] = useState({ open: false, item: null })
  const [toDelete, setToDelete] = useState(null)
  const [toClose, setToClose] = useState(null)
  // Crear, editar y eliminar ciclos/módulos es del project manager; los miembros sí mueven tareas dentro
  const canManage = useIsManager()
  const Icon = kind === 'cycles' ? RefreshCcw : Layers
  const base = `/${workspace.slug}/projects/${project.id}/${kind}`

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: kind === 'cycles' ? 'ciclos' : 'modulos' }]}
        title={text.title}
        documentTitle={[text.title, project.name]}
        description={text.headerDescription}
        actions={
          canManage && (
            <Button className="h-10 rounded-xl px-3.5" onClick={() => setFormState({ open: true, item: null })}>
              <Plus strokeWidth={3} />
              {text.newLabel}
            </Button>
          )
        }
      />
      <PageBody>
        <div>
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          )}
          {error && <ErrorState error={error} onRetry={refetch} />}
          {items?.length === 0 && (
            <EmptyState
              icon={Icon}
              title={`Todavía no hay ${text.title.toLowerCase()}`}
              description={canManage ? text.emptyDescription : text.memberEmptyDescription}
              action={
                canManage && (
                  <Button onClick={() => setFormState({ open: true, item: null })}>
                    <Plus />
                    {text.newLabel}
                  </Button>
                )
              }
            />
          )}
          {items?.length > 0 && (
            <div className="space-y-3">
              {(kind === 'cycles' ? sortCycles(items) : items).map((item) => {
                const end = item.endDate ?? item.targetDate
                const closed = kind === 'cycles' && isCycleClosed(item)
                const current = kind === 'cycles' && !closed && item.status === 'CURRENT'
                const closable = kind === 'cycles' && canManage && canCloseCycle(item)
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'bg-card hover:shadow-card flex items-center gap-4 rounded-2xl border p-4 transition-shadow sm:px-5',
                      current && 'border-ok-dot',
                    )}
                  >
                    <Link
                      to={`${base}/${item.id}`}
                      className="group flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {kind === 'modules' && (
                          <span className="bg-accent-soft text-accent-text flex size-9 shrink-0 items-center justify-center rounded-xl">
                            <Layers className="size-4" />
                          </span>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-semibold">{item.name}</h2>
                            {kind === 'cycles' && <CycleStatusBadge cycle={item} />}
                          </div>
                          {kind === 'modules' && item.description && (
                            <p className="text-muted-foreground line-clamp-1 text-sm">{item.description}</p>
                          )}
                          <p className="text-muted-foreground font-mono text-xs">
                            <DateRange start={item.startDate} end={end} />
                            {current && end && (
                              <span className="text-ok font-semibold"> · {remainingText(end)}</span>
                            )}
                            {closed && <ClosedByText cycle={item} />}
                          </p>
                        </div>
                      </div>
                      <ProgressSummary
                        progress={item.progress}
                        className="w-full sm:w-60"
                        barClassName={
                          kind === 'cycles'
                            ? (CYCLE_STATUS[cycleStatusKey(item)] ?? CYCLE_STATUS.DRAFT).bar
                            : undefined
                        }
                      />
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground group-hover:text-foreground hidden sm:inline"
                      >
                        →
                      </span>
                    </Link>
                    {(canManage || closed) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Acciones de ${item.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {closed && (
                            <DropdownMenuItem asChild>
                              <Link to={`${base}/${item.id}/retro`}>
                                <MessagesSquare />
                                Ver retrospectiva
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {closable && (
                            <DropdownMenuItem onSelect={() => setToClose(item)}>
                              <Flag />
                              Cerrar ciclo
                            </DropdownMenuItem>
                          )}
                          {canManage && (
                            <>
                              <DropdownMenuItem onSelect={() => setFormState({ open: true, item })}>
                                <Pencil />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(item)}>
                                <Trash2 />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PageBody>
      <PlanningFormDialog
        kind={kind}
        slug={workspace.slug}
        projectId={project.id}
        item={formState.item}
        open={formState.open}
        onOpenChange={(open) => setFormState((current) => ({ ...current, open }))}
      />
      {kind === 'cycles' && canManage && (
        <CloseCycleDialog
          slug={workspace.slug}
          projectId={project.id}
          cycle={toClose}
          open={Boolean(toClose)}
          onOpenChange={(open) => !open && setToClose(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`¿Eliminar «${toDelete?.name}»?`}
        description="Las tareas no se borran: solo dejan de pertenecer a él."
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success(`«${toDelete.name}» eliminado`)
              setToDelete(null)
            },
            onError: (deleteError) => notifyError(deleteError),
          })
        }
      />
    </>
  )
}
