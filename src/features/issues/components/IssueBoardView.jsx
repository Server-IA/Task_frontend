import { useMemo, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { findColumn, getNeighbors, groupByState, sortOrderBetween } from '@/lib/kanban'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { BOARD_PAGE_SIZE } from '../constants'
import { useIssues, useMoveIssue } from '../hooks'
import { InlineIssueProperties } from './IssueProperties'

/** Kanban: una columna por estado; las tarjetas se arrastran entre columnas y dentro de ellas. */
export function IssueBoardView({ slug, project, meta, filters, openIssue, onCreateInState, extraParams }) {
  const params = { ...filters, ...extraParams, sort: 'sortOrder,asc', page: 0, size: BOARD_PAGE_SIZE }
  const { data, isLoading, error, refetch } = useIssues(slug, project.id, params)
  const move = useMoveIssue(slug, project.id)

  const issues = useMemo(() => data?.content ?? [], [data])
  const issuesById = useMemo(() => Object.fromEntries(issues.map((issue) => [issue.id, issue])), [issues])
  const serverColumns = useMemo(() => groupByState(issues, meta.states), [issues, meta.states])

  // Mientras se arrastra se trabaja sobre una copia local de las columnas (vista previa de la posición)
  const [dragColumns, setDragColumns] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const columns = dragColumns ?? serverColumns

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const columnOf = (id, source = columns) =>
    id?.toString().startsWith('column:') ? id.slice('column:'.length) : findColumn(source, id)

  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
    setDragColumns(serverColumns)
  }

  const handleDragOver = ({ active, over }) => {
    if (!over) return
    setDragColumns((current) => {
      const from = columnOf(active.id, current)
      const to = columnOf(over.id, current)
      if (!from || !to || from === to) return current
      const fromItems = current[from].filter((id) => id !== active.id)
      const toItems = [...current[to]]
      const overIndex = toItems.indexOf(over.id)
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, active.id)
      return { ...current, [from]: fromItems, [to]: toItems }
    })
  }

  const handleDragEnd = ({ active, over }) => {
    const current = dragColumns
    setActiveId(null)
    setDragColumns(null)
    if (!over || !current) return

    const targetState = columnOf(active.id, current)
    let targetIds = current[targetState]
    const overIndex = targetIds.indexOf(over.id)
    const activeIndex = targetIds.indexOf(active.id)
    if (overIndex >= 0 && overIndex !== activeIndex) {
      targetIds = arrayMove(targetIds, activeIndex, overIndex)
    }

    const issue = issuesById[active.id]
    const originalIds = serverColumns[issue.state.id]
    const unchanged =
      issue.state.id === targetState && originalIds.indexOf(active.id) === targetIds.indexOf(active.id)
    if (unchanged) return

    const { afterIssueId, beforeIssueId } = getNeighbors(targetIds, active.id)
    const others = targetIds.filter((id) => id !== active.id).map((id) => issuesById[id].sortOrder)
    const sortOrder = sortOrderBetween(
      issuesById[afterIssueId]?.sortOrder,
      issuesById[beforeIssueId]?.sortOrder,
      others.length ? Math.max(...others) : null,
    )
    move.mutate(
      {
        issueId: active.id,
        stateId: targetState,
        afterIssueId,
        beforeIssueId,
        state: meta.states.find((state) => state.id === targetState),
        sortOrder,
      },
      { onError: (moveError) => notifyError(moveError, 'No se pudo mover el issue') },
    )
  }

  if (isLoading) {
    return (
      <div className="flex gap-3 p-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-96 w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const activeIssue = activeId ? issuesById[activeId] : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      {data.totalElements > BOARD_PAGE_SIZE && (
        <div className="flex items-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
          <TriangleAlert className="size-4" />
          Se muestran {BOARD_PAGE_SIZE} de {data.totalElements} issues. Usa los filtros o la vista de lista para ver el resto.
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          setDragColumns(null)
        }}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
          {meta.states.map((state) => (
            <BoardColumn
              key={state.id}
              state={state}
              ids={columns[state.id] ?? []}
              issuesById={issuesById}
              slug={slug}
              project={project}
              meta={meta}
              openIssue={openIssue}
              onCreate={() => onCreateInState(state.id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeIssue && <IssueCard issue={activeIssue} slug={slug} project={project} meta={meta} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function BoardColumn({ state, ids, issuesById, slug, project, meta, openIssue, onCreate }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${state.id}` })

  return (
    <section className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50" aria-label={state.name}>
      <header className="flex items-center gap-2 px-3 py-2.5">
        <StateIcon group={state.group} color={state.color} />
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium">{state.name}</h3>
        <span className="text-xs text-muted-foreground">{ids.length}</span>
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" onClick={onCreate} aria-label={`Nuevo issue en ${state.name}`}>
          <Plus className="size-3.5" />
        </Button>
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn('flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2', isOver && 'rounded-b-xl bg-primary/5')}
        >
          {ids.map((id) =>
            issuesById[id] ? (
              <SortableIssueCard key={id} issue={issuesById[id]} slug={slug} project={project} meta={meta} openIssue={openIssue} />
            ) : null,
          )}
        </div>
      </SortableContext>
    </section>
  )
}

function SortableIssueCard({ issue, openIssue, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
      onClick={() => openIssue(issue.id)}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event)
        if (event.key === 'Enter' && !event.defaultPrevented) openIssue(issue.id)
      }}
    >
      <IssueCard issue={issue} {...props} />
    </div>
  )
}

function IssueCard({ issue, slug, project, meta, overlay = false }) {
  return (
    <article
      className={cn(
        'group cursor-grab space-y-2 rounded-lg border bg-card p-3 shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing',
        overlay && 'rotate-2 shadow-lg',
      )}
    >
      <p className="font-mono text-xs text-muted-foreground">{issue.code}</p>
      <h4 className="line-clamp-3 text-sm font-medium">{issue.title}</h4>
      <div onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <InlineIssueProperties
          slug={slug}
          projectId={project.id}
          issue={issue}
          meta={meta}
          compact
          show={{ state: false }}
        />
      </div>
    </article>
  )
}
