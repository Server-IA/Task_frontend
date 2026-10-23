import { useState } from 'react'
import { Link } from 'react-router'
import { Layers, MoreHorizontal, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { notifyError } from '@/lib/notify'
import { useDeletePlanning, usePlanningList } from '../hooks'
import { CycleStatusBadge, DateRange, PLANNING_TEXT, PlanningFormDialog, ProgressSummary } from '../components/PlanningShared'

/** Lista de ciclos o de módulos del proyecto (`kind` = 'cycles' | 'modules'). */
export function PlanningListPage({ kind }) {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const text = PLANNING_TEXT[kind]
  const { data: items, isLoading, error, refetch } = usePlanningList(kind, workspace.slug, project.id)
  const remove = useDeletePlanning(kind, workspace.slug, project.id)
  const [formState, setFormState] = useState({ open: false, item: null })
  const [toDelete, setToDelete] = useState(null)
  const Icon = kind === 'cycles' ? RefreshCcw : Layers
  const base = `/${workspace.slug}/projects/${project.id}/${kind}`

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: workspace.name, to: `/${workspace.slug}` },
          { label: project.name, to: `/${workspace.slug}/projects/${project.id}/issues` },
          { label: text.title },
        ]}
        actions={
          <Button size="sm" onClick={() => setFormState({ open: true, item: null })}>
            <Plus />
            {text.newLabel}
          </Button>
        }
      />
      <PageBody>
        <div className="mx-auto max-w-5xl p-4 sm:p-8">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          )}
          {error && <ErrorState error={error} onRetry={refetch} />}
          {items?.length === 0 && (
            <EmptyState
              icon={Icon}
              title={`Todavía no hay ${text.title.toLowerCase()}`}
              description={text.emptyDescription}
              action={
                <Button onClick={() => setFormState({ open: true, item: null })}>
                  <Plus />
                  {text.newLabel}
                </Button>
              }
            />
          )}
          {items?.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id} className="flex-row items-center gap-4 p-4 transition-colors hover:bg-accent/40">
                  <Link to={`${base}/${item.id}`} className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-semibold">{item.name}</span>
                        {kind === 'cycles' && <CycleStatusBadge status={item.status} />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <DateRange start={item.startDate} end={item.endDate ?? item.targetDate} />
                        {item.description && ` · ${item.description}`}
                      </p>
                    </div>
                    <ProgressSummary progress={item.progress} className="w-full sm:w-56" />
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Acciones">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setFormState({ open: true, item })}>
                        <Pencil />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(item)}>
                        <Trash2 />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Card>
              ))}
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
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`¿Eliminar «${toDelete?.name}»?`}
        description="Los issues no se borran: solo dejan de pertenecer a él."
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
