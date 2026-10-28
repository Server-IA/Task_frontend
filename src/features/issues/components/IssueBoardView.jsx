import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, TriangleAlert } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { findColumn, getNeighbors, groupByState, sortOrderBetween } from '@/lib/kanban'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { BOARD_PAGE_SIZE } from '../constants'
import { useIssues, useMoveIssue } from '../hooks'
import { needsCriteriaConfirm } from '../issueFlags'
import { useCriteriaGuard } from '../useCriteriaGuard'
import { isClosed, useIssueUpdater } from '../useIssueHelpers'
import { BlockedChip, BlockingChip, ChecklistChip } from './IssueBadges'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker } from './PropertyPickers'

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
  // Al soltar, la copia local se conserva hasta que la caché refleje el cambio (actualización optimista);
  // si se borrara de inmediato, la tarjeta volvería un instante a su columna original
  const [settlingFrom, setSettlingFrom] = useState(null)
  // Soltada en un estado completado con criterios sin marcar: queda ahí mientras se confirma
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  const { guard, dialog: criteriaDialog } = useCriteriaGuard()
  const serverColumnsRef = useRef(serverColumns)
  useEffect(() => {
    serverColumnsRef.current = serverColumns
  })
  if (settlingFrom && settlingFrom !== serverColumns && !awaitingConfirm) {
    setSettlingFrom(null)
    setDragColumns(null)
  }
  const columns = dragColumns ?? serverColumns

  // Detección de colisiones estable entre columnas (como el ejemplo «multiple containers» de dnd-kit):
  // primero lo que está bajo el puntero y, si es una columna, la tarjeta más cercana dentro de ella
  const columnsRef = useRef(columns)
  const lastOverId = useRef(null)
  const recentlyMovedToNewColumn = useRef(false)
  useEffect(() => {
    columnsRef.current = columns
  })
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      recentlyMovedToNewColumn.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [columns])

  const collisionDetection = useCallback(
    (args) => {
      const pointerHits = pointerWithin(args)
      const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args)
      let overId = getFirstCollision(hits, 'id')
      if (overId != null) {
        if (String(overId).startsWith('column:')) {
          const ids = columnsRef.current[String(overId).slice('column:'.length)] ?? []
          if (ids.length > 0) {
            const inside = args.droppableContainers.filter((container) => ids.includes(container.id))
            overId = closestCenter({ ...args, droppableContainers: inside })[0]?.id ?? overId
          }
        }
        lastOverId.current = overId
        return [{ id: overId }]
      }
      // Recién movida a otra columna, sus medidas aún no están al día: se mantiene donde está
      if (recentlyMovedToNewColumn.current) lastOverId.current = activeId
      return lastOverId.current ? [{ id: lastOverId.current }] : []
    },
    [activeId],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const columnOf = (id, source = columns) =>
    id?.toString().startsWith('column:') ? id.slice('column:'.length) : findColumn(source, id)

  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
    setSettlingFrom(null)
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
      recentlyMovedToNewColumn.current = true
      return { ...current, [from]: fromItems, [to]: toItems }
    })
  }

  const handleDragEnd = ({ active, over }) => {
    const current = dragColumns
    setActiveId(null)
    if (!over || !current) {
      setDragColumns(null)
      return
    }

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
    if (unchanged) {
      setDragColumns(null)
      return
    }
    // La posición final se queda en pantalla hasta que llegue la actualización optimista
    setDragColumns({ ...current, [targetState]: targetIds })
    setSettlingFrom(serverColumns)

    const { afterIssueId, beforeIssueId } = getNeighbors(targetIds, active.id)
    const others = targetIds.filter((id) => id !== active.id).map((id) => issuesById[id].sortOrder)
    const sortOrder = sortOrderBetween(
      issuesById[afterIssueId]?.sortOrder,
      issuesById[beforeIssueId]?.sortOrder,
      others.length ? Math.max(...others) : null,
    )
    const state = meta.states.find((item) => item.id === targetState)
    const commit = () => {
      setAwaitingConfirm(false)
      // Lo que haya en caché ahora (pudo recargarse mientras se confirmaba): el cambio optimista lo reemplaza
      setSettlingFrom(serverColumnsRef.current)
      move.mutate(
        { issueId: active.id, stateId: targetState, afterIssueId, beforeIssueId, state, sortOrder },
        { onError: (moveError) => notifyError(moveError, 'No se pudo mover la tarea') },
      )
    }
    if (issue.state.id !== targetState && needsCriteriaConfirm(issue, state)) {
      setAwaitingConfirm(true)
      guard(issue, state, commit, () => {
        // Cancelado: la tarjeta vuelve a su columna
        setAwaitingConfirm(false)
        setSettlingFrom(null)
        setDragColumns(null)
      })
      return
    }
    commit()
  }

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-96 w-[284px] shrink-0 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const activeIssue = activeId ? issuesById[activeId] : null

  return (
    <div className="tf-fade flex h-full min-h-0 flex-col">
      {data.totalElements > BOARD_PAGE_SIZE && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-soon-soft px-4 py-2 text-sm text-soon">
          <TriangleAlert className="size-4" />
          Se muestran {BOARD_PAGE_SIZE} de {data.totalElements} tareas. Usa los filtros o la vista de lista para ver el resto.
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          setDragColumns(null)
        }}
      >
        <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto pb-2">
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
        {/* En un portal: así la tarjeta sigue al cursor aunque algún contenedor tenga transform */}
        {createPortal(
          <DragOverlay>
            {activeIssue && <IssueCard issue={activeIssue} slug={slug} project={project} meta={meta} overlay />}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
      {criteriaDialog}
    </div>
  )
}

function BoardColumn({ state, ids, issuesById, slug, project, meta, openIssue, onCreate }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${state.id}` })

  return (
    <section className="flex max-h-full w-[284px] shrink-0 flex-col gap-2 rounded-2xl bg-column p-2" aria-label={state.name}>
      <header className="flex items-center gap-2 px-1.5 pt-1.5 pb-1 font-mono text-[11px] tracking-[0.08em] uppercase">
        <StateIcon group={state.group} color={state.color} className="size-3.5" />
        <h3 className="min-w-0 truncate font-semibold">{state.name}</h3>
        <span className="text-muted-foreground">{ids.length}</span>
        <button
          type="button"
          className="ml-auto flex size-6.5 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:border-dash hover:text-foreground"
          onClick={onCreate}
          aria-label={`Nueva tarea en ${state.name}`}
        >
          <Plus className="size-3" strokeWidth={3} />
        </button>
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            '-mx-1 flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-xl px-1 pb-1 transition-colors duration-200',
            isOver && 'bg-accent-soft/60',
          )}
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
      className={cn(
        'rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring',
        // Mientras se arrastra queda un hueco punteado del tamaño de la tarjeta
        isDragging && 'bg-card/40 outline-2 -outline-offset-2 outline-dash outline-dashed [&>article]:invisible',
      )}
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

/** Evita que los selectores de la tarjeta inicien el arrastre o abran el detalle. */
const stop = (event) => event.stopPropagation()
const revealOnHover =
  'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100'

function IssueCard({ issue, slug, project, meta, overlay = false }) {
  const { update } = useIssueUpdater(slug, project.id, issue.id)
  const hasLabels = issue.labels?.length > 0

  return (
    <article
      className={cn(
        'group flex cursor-grab flex-col gap-2.5 rounded-xl border bg-card p-3 shadow-card transition-[box-shadow,border-color] duration-200 hover:border-dash hover:shadow-md active:cursor-grabbing',
        overlay && 'cursor-grabbing shadow-xl ring-1 ring-foreground/10',
      )}
    >
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span className="text-muted-foreground">{issue.code}</span>
        <span className="ml-auto" onPointerDown={stop} onKeyDown={stop} onClick={stop}>
          <PriorityPicker
            chip
            value={issue.priority}
            onChange={(priority) => update({ priority })}
            className={cn(issue.priority === 'NONE' && revealOnHover)}
          />
        </span>
      </div>
      <h4 className="line-clamp-3 text-[14.5px] leading-snug font-medium">{issue.title}</h4>
      <BlockedChip issue={issue} codes="by" className="self-start" />
      <BlockingChip issue={issue} className="self-start" />
      {hasLabels && (
        <div onPointerDown={stop} onKeyDown={stop} onClick={stop}>
          <LabelsPicker
            compact
            labels={meta.labels}
            value={issue.labels.map((label) => label.id)}
            onChange={(labelIds) => update({ labelIds })}
            className="-ml-2"
          />
        </div>
      )}
      <div className="flex items-center gap-2 text-xs" onPointerDown={stop} onKeyDown={stop} onClick={stop}>
        <DatePicker
          value={issue.dueDate}
          placeholder="Fecha límite"
          due={{ closed: isClosed(issue) }}
          minDate={issue.startDate}
          onChange={(dueDate) => update(dueDate ? { dueDate } : { clearDueDate: true })}
          className={cn(!issue.dueDate && cn('-ml-2', revealOnHover))}
        />
        {issue.subIssueCount > 0 && (
          <span className="font-mono text-[11px] text-muted-foreground" title="Subtareas completadas">
            ↳ {issue.completedSubIssueCount}/{issue.subIssueCount}
          </span>
        )}
        <ChecklistChip issue={issue} />
        {!hasLabels && meta.labels.length > 0 && (
          <LabelsPicker compact labels={meta.labels} value={[]} onChange={(labelIds) => update({ labelIds })} className={revealOnHover} />
        )}
        <AssigneesPicker
          members={meta.users}
          value={issue.assignees?.map((user) => user.id) ?? []}
          onChange={(assigneeIds) => update({ assigneeIds })}
          showLabel={false}
          avatarSize="sm"
          className={cn('ml-auto px-1', !issue.assignees?.length && revealOnHover)}
        />
      </div>
    </article>
  )
}
