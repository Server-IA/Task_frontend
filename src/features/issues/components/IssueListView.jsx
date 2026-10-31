import { memo } from 'react'
import { ChevronLeft, ChevronRight, CircleDot, CornerDownRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ColorDot } from '@/components/common/LabelChip'
import { EmptyState, ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import { BOARD_GROUP_STORY, GROUP_BY_DEFAULT, LIST_PAGE_SIZE } from '../constants'
import { groupIssues } from '../groupIssues'
import { useIssues } from '../hooks'
import { stateOptionsFor, storyStateLocked } from '../issueTypes'
import { useCriteriaGuard } from '../useCriteriaGuard'
import { isClosed, useIssueUpdater } from '../useIssueHelpers'
import { closedStoryActions, useStoryClosedGuard } from '../useStoryClosedGuard'
import { AttachmentsChip, BlockedChip, BlockingChip, ChecklistChip } from './IssueBadges'
import { IssueTypeIcon, ParentStoryChip, TypeIcon } from './IssueTypeBits'
import { PriorityIcon } from './PriorityIcon'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker, StatePicker } from './PropertyPickers'

/**
 * Vista de lista: las tareas de la página agrupadas por estado (en el orden de las columnas), prioridad,
 * asignado o etiqueta (`groupBy`), con propiedades editables y paginación.
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
  groupBy = GROUP_BY_DEFAULT,
}) {
  const params = { ...filters, ...extraParams, sort, page, size: LIST_PAGE_SIZE }
  const { data, isLoading, error, refetch, isFetching } = useIssues(slug, project.id, params)
  const { guard, dialog: criteriaDialog } = useCriteriaGuard()
  const { onStoryClosed, dialog: storyClosedDialog, manager } = useStoryClosedGuard(slug)

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

  // «story» es el agrupar del tablero: la lista va por estado
  const groups = groupIssues(data.content, groupBy === BOARD_GROUP_STORY ? 'state' : groupBy, meta)
  const from = data.page * data.size + 1
  const to = from + data.content.length - 1

  return (
    <div className={cn('tf-fade flex min-h-full flex-col gap-3 transition-opacity duration-200', isFetching && 'opacity-80')}>
      {groups.map((group) => (
        <section key={`${group.kind}-${group.key}`} aria-label={group.label} className="overflow-hidden rounded-2xl border bg-card">
          <GroupHeader group={group} onCreateInState={onCreateInState} />
          <ul>
            {group.issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                slug={slug}
                project={project}
                meta={meta}
                openIssue={openIssue}
                guard={guard}
                onStoryClosed={onStoryClosed}
                manager={manager}
              />
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
      {storyClosedDialog}
    </div>
  )
}

/**
 * Encabezado de un grupo: por estado o prioridad en monoespaciada y mayúsculas (como las columnas del tablero);
 * por persona o etiqueta, con su avatar o color y «2 tareas».
 */
function GroupHeader({ group, onCreateInState }) {
  const count = group.issues.length
  if (group.kind === 'assignee' || group.kind === 'label') {
    return (
      <header className="flex items-center gap-2 bg-column px-4 py-2">
        {group.kind === 'assignee' ? (
          group.user ? (
            <UserAvatar user={group.user} size="xs" className="size-5.5" />
          ) : (
            <span aria-hidden="true" className="size-5.5 rounded-full border border-dashed border-dash" />
          )
        ) : group.labelItem ? (
          <ColorDot color={group.labelItem.color} />
        ) : (
          <span aria-hidden="true" className="size-2.5 rounded-full border border-dashed border-dash" />
        )}
        <h2 className="min-w-0 truncate text-[13px] font-semibold">{group.label}</h2>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {count} {count === 1 ? 'tarea' : 'tareas'}
        </span>
      </header>
    )
  }
  return (
    <header className="flex items-center gap-2 bg-column px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] uppercase">
      {group.kind === 'state' ? (
        <StateIcon group={group.state.group} color={group.state.color} className="size-3.5" />
      ) : group.kind === 'type' ? (
        <TypeIcon type={group.type} size={14} />
      ) : (
        <PriorityIcon priority={group.priority} />
      )}
      <h2 className="font-semibold">{group.label}</h2>
      <span className="text-muted-foreground">{count}</span>
      {group.kind === 'state' && (
        <button
          type="button"
          className="ml-auto flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
          onClick={() => onCreateInState?.(group.state.id)}
          aria-label={`Nueva tarea en ${group.state.name}`}
        >
          <Plus className="size-3.5" />
        </button>
      )}
    </header>
  )
}

const revealOnHover =
  'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100'

const stop = (event) => event.stopPropagation()

/**
 * Una fila. Memorizada: guardar la descripción de una tarea (cada segundo mientras se escribe en el panel) reemplaza
 * esa tarea en la lista y solo su fila vuelve a pintarse.
 */
const IssueRow = memo(function IssueRow({ issue, slug, project, meta, openIssue, guard, onStoryClosed, manager }) {
  const { update } = useIssueUpdater(slug, project.id, issue.id)

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
            states={stateOptionsFor(issue, meta.states, manager)}
            disabled={storyStateLocked(issue, manager)}
            value={issue.state?.id}
            onChange={(stateId) => {
              const state = meta.states.find((item) => item.id === stateId)
              guard(issue, state, () =>
                update(
                  { stateId },
                  { onError: onStoryClosed(issue, closedStoryActions.move(issue, state), () => update({ stateId, reopenParent: true })) },
                ),
              )
            }}
            showLabel={false}
            className="px-1"
          />
          <IssueTypeIcon issue={issue} size={14} className="mx-0.5" />
          <span className="w-24">
            <PriorityPicker
              chip
              iconOnlyWhenEmpty
              value={issue.priority}
              onChange={(priority) => update({ priority })}
              className={cn(issue.priority === 'NONE' && revealOnHover)}
            />
          </span>
        </span>
        <span className="min-w-16 shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{issue.code}</span>
        <span className="flex min-w-0 flex-[1_1_260px] items-center gap-2">
          {issue.parent && issue.parent.type !== 'STORY' && (
            <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground lg:flex" title={`Subtarea de ${issue.parent.code}`}>
              <CornerDownRight className="size-3" />
              {issue.parent.code}
            </span>
          )}
          <span className={cn('truncate text-sm font-medium', issue.state?.group === 'CANCELLED' && 'text-muted-foreground line-through')}>
            {issue.title}
          </span>
          {issue.parent?.type === 'STORY' && <ParentStoryChip parent={issue.parent} onOpen={openIssue} />}
          <BlockedChip issue={issue} codes="inline" />
          <BlockingChip issue={issue} />
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
          {/* Columna fija: el clip con el número de adjuntos (vacía si no hay) */}
          <AttachmentsChip issue={issue} reserve className="w-8.5 justify-end" />
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
})
