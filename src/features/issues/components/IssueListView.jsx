import { ChevronLeft, ChevronRight, CircleDot, CornerDownRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { cn } from '@/lib/utils'
import { LIST_PAGE_SIZE } from '../constants'
import { useIssues } from '../hooks'
import { useCriteriaGuard } from '../useCriteriaGuard'
import { isClosed, useIssueUpdater } from '../useIssueHelpers'
import { BlockedChip, ChecklistChip } from './IssueBadges'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker, StatePicker } from './PropertyPickers'

/**
 * Vista de lista: las tareas de la página agrupadas por estado (en el orden de las columnas),
 * con propiedades editables y paginación.
 */
export function IssueListView({
  slug,
  project,
  meta,
  filters,
  sort,
  page,
  setPage,
  openIssue,
  onCreate,
  onCreateInState,
  hasFilters,
  extraParams,
}) {
  const params = { ...filters, ...extraParams, sort, page, size: LIST_PAGE_SIZE }
  const { data, isLoading, error, refetch, isFetching } = useIssues(slug, project.id, params)
  const { guard, dialog: criteriaDialog } = useCriteriaGuard()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />

  if (data.totalElements === 0) {
    return hasFilters ? (
      <EmptyState icon={CircleDot} title="Ninguna tarea coincide" description="Prueba con otros filtros o búsqueda." />
    ) : (
      <EmptyState
        icon={CircleDot}
        title="Todavía no hay tareas"
        description="Crea la primera con el botón «Nueva tarea» o la tecla C."
        action={<Button onClick={onCreate}>Crear tarea</Button>}
      />
    )
  }

  // Grupos por el estado de cada tarea, ordenados como las columnas del tablero
  const position = new Map(meta.states.map((state, index) => [state.id, index]))
  const byState = new Map()
  for (const issue of data.content) {
    if (!byState.has(issue.state.id)) byState.set(issue.state.id, { state: issue.state, issues: [] })
    byState.get(issue.state.id).issues.push(issue)
  }
  const groups = [...byState.values()].sort(
    (a, b) => (position.get(a.state.id) ?? Infinity) - (position.get(b.state.id) ?? Infinity),
  )
  const from = data.page * data.size + 1
  const to = from + data.content.length - 1

  return (
    <div className={cn('tf-fade flex min-h-full flex-col gap-3 transition-opacity duration-200', isFetching && 'opacity-80')}>
      {groups.map(({ state, issues }) => (
        <section key={state.id} aria-label={state.name} className="overflow-hidden rounded-2xl border bg-card">
          <header className="flex items-center gap-2 bg-column px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] uppercase">
            <StateIcon group={state.group} color={state.color} className="size-3.5" />
            <h2 className="font-semibold">{state.name}</h2>
            <span className="text-muted-foreground">{issues.length}</span>
            <button
              type="button"
              className="ml-auto flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
              onClick={() => onCreateInState?.(state.id)}
              aria-label={`Nueva tarea en ${state.name}`}
            >
              <Plus className="size-3.5" />
            </button>
          </header>
          <ul>
            {issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} slug={slug} project={project} meta={meta} openIssue={openIssue} guard={guard} />
            ))}
          </ul>
        </section>
      ))}

      <footer className="mt-auto flex flex-wrap items-center gap-4 rounded-xl border bg-card px-3.5 py-1.5 font-mono text-[11px] text-muted-foreground">
        <span>
          {from}–{to} de {data.totalElements}
        </span>
        <span>
          <kbd className="text-foreground">Enter</kbd> abrir
        </span>
        {data.totalPages > 1 && (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-7" disabled={data.first} onClick={() => setPage(page - 1)} aria-label="Página anterior">
              <ChevronLeft />
            </Button>
            <span className="px-1">
              {data.page + 1} / {data.totalPages}
            </span>
            <Button variant="ghost" size="icon" className="size-7" disabled={data.last} onClick={() => setPage(page + 1)} aria-label="Página siguiente">
              <ChevronRight />
            </Button>
          </div>
        )}
      </footer>
      {criteriaDialog}
    </div>
  )
}

const revealOnHover =
  'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100'

function IssueRow({ issue, slug, project, meta, openIssue, guard }) {
  const { update } = useIssueUpdater(slug, project.id, issue.id)
  const stop = (event) => event.stopPropagation()

  return (
    <li className="border-t">
      <div
        role="button"
        tabIndex={0}
        onClick={() => openIssue(issue.id)}
        onKeyDown={(event) => event.key === 'Enter' && openIssue(issue.id)}
        className="group flex cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-1.5 px-4 py-2 transition-colors duration-150 outline-none hover:bg-subtle focus-visible:bg-accent"
      >
        <span className="flex items-center gap-1" onClick={stop} onKeyDown={stop}>
          <StatePicker
            states={meta.states}
            value={issue.state?.id}
            onChange={(stateId) =>
              guard(
                issue,
                meta.states.find((state) => state.id === stateId),
                () => update({ stateId }),
              )
            }
            showLabel={false}
            className="px-1"
          />
          <span className="w-24">
            <PriorityPicker
              chip
              value={issue.priority}
              onChange={(priority) => update({ priority })}
              className={cn(issue.priority === 'NONE' && revealOnHover)}
            />
          </span>
        </span>
        <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{issue.code}</span>
        <span className="flex min-w-0 flex-[1_1_260px] items-center gap-2">
          {issue.parent && (
            <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground lg:flex" title={`Subtarea de ${issue.parent.code}`}>
              <CornerDownRight className="size-3" />
              {issue.parent.code}
            </span>
          )}
          <span className="truncate text-sm font-medium">{issue.title}</span>
          <BlockedChip issue={issue} />
          {issue.subIssueCount > 0 && (
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground" title="Subtareas completadas">
              ↳ {issue.completedSubIssueCount}/{issue.subIssueCount}
            </span>
          )}
          <ChecklistChip issue={issue} />
        </span>
        <span className="flex items-center gap-1.5" onClick={stop} onKeyDown={stop}>
          {(meta.labels.length > 0 || issue.labels?.length > 0) && (
            <LabelsPicker
              compact
              labels={meta.labels}
              value={issue.labels?.map((label) => label.id) ?? []}
              onChange={(labelIds) => update({ labelIds })}
              className={cn(!issue.labels?.length && revealOnHover)}
            />
          )}
          <DatePicker
            value={issue.dueDate}
            placeholder="Fecha límite"
            due={{ closed: isClosed(issue) }}
            minDate={issue.startDate}
            onChange={(dueDate) => update(dueDate ? { dueDate } : { clearDueDate: true })}
            className={cn(!issue.dueDate && revealOnHover)}
          />
          <AssigneesPicker
            members={meta.users}
            value={issue.assignees?.map((user) => user.id) ?? []}
            onChange={(assigneeIds) => update({ assigneeIds })}
            showLabel={false}
            avatarSize="sm"
            className={cn('w-16 justify-end px-1', !issue.assignees?.length && revealOnHover)}
          />
        </span>
      </div>
    </li>
  )
}
