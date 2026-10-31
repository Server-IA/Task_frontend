import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { ChevronDown, ChevronRight, Plus, TriangleAlert } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarStack } from '@/components/common/AvatarStack'
import { ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { useStories } from '@/features/stories/hooks'
import { findColumn, getNeighbors, groupByState, sortOrderBetween } from '@/lib/kanban'
import { cn } from '@/lib/utils'
import { BOARD_GROUP_STORY, BOARD_PAGE_SIZE } from '../constants'
import { useIssues, useMoveIssue } from '../hooks'
import { needsCriteriaConfirm } from '../issueFlags'
import { isStory, storyFlags, storyLanes, storyProgress } from '../issueTypes'
import { useCriteriaGuard } from '../useCriteriaGuard'
import { isClosed, useIssueUpdater } from '../useIssueHelpers'
import { closedStoryActions, useStoryClosedGuard } from '../useStoryClosedGuard'
import { AttachmentsChip, BlockedChip, BlockingChip, ChecklistChip } from './IssueBadges'
import { BugCountBadge, IssueTypeIcon, ParentStoryChip, ReadyBadge, StoryProgress, TypeIcon } from './IssueTypeBits'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker } from './PropertyPickers'

/**
 * Kanban: una columna por estado; las tarjetas se arrastran entre columnas y dentro de ellas. Con
 * `groupBy="story"` hay un carril por historia (con su progreso, personas y bugs abiertos) y «Sin historia» al
 * final; las historias listas para revisar empiezan plegadas. Se arrastra dentro de cada carril.
 */
export function IssueBoardView({ slug, project, meta, filters, openIssue, onCreateInState, extraParams, groupBy }) {
  const params = { ...filters, ...extraParams, sort: 'sortOrder,asc', page: 0, size: BOARD_PAGE_SIZE }
  const { data, isLoading, error, refetch } = useIssues(slug, project.id, params)
  const laned = groupBy === BOARD_GROUP_STORY
  const { data: stories } = useStories(slug, project.id, { enabled: laned })
  const issues = useMemo(() => data?.content ?? [], [data])
  // Memorizados: si cada render armara carriles nuevos, sus columnas se recalcularían y una tarjeta recién soltada
  // volvería un instante a su lugar
  const lanes = useMemo(() => (laned ? storyLanes(issues, stories ?? []) : []), [laned, issues, stories])
  // Mover una tarea de una historia cerrada a un estado abierto: 409 STORY_CLOSED → la tarjeta vuelve y se pregunta
  const { onStoryClosed, dialog: storyClosedDialog } = useStoryClosedGuard(slug)

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

  const tooMany = data.totalElements > BOARD_PAGE_SIZE && (
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-soon-soft px-4 py-2 text-sm text-soon">
      <TriangleAlert className="size-4" />
      Se muestran {BOARD_PAGE_SIZE} de {data.totalElements} tareas. Usa los filtros o la vista de lista para ver el resto.
    </div>
  )
  const common = { slug, project, meta, openIssue, onStoryClosed }

  if (!laned) {
    return (
      <div className="tf-fade flex h-full min-h-0 flex-col">
        {tooMany}
        <BoardColumns issues={issues} {...common} onCreateInState={onCreateInState} />
        {storyClosedDialog}
      </div>
    )
  }

  const countOf = (stateId) => issues.filter((issue) => issue.state?.id === stateId).length
  return (
    <div className="tf-fade flex h-full min-h-0 flex-col">
      {tooMany}
      <div className="min-h-0 flex-1 overflow-auto pb-2">
        <div className="flex w-max min-w-full flex-col gap-3">
          <div className="sticky top-0 z-10 flex gap-3 bg-background px-2 pb-1">
            {meta.states.map((state) => (
              <div key={state.id} className="flex w-[284px] shrink-0 items-center gap-2 px-1.5 font-mono text-[11px] tracking-[0.08em] uppercase">
                <StateIcon group={state.group} color={state.color} className="size-3.5" />
                <span className="min-w-0 truncate font-semibold">{state.name}</span>
                {/* Sin ceros a la izquierda, como en el tablero normal */}
                <span className="text-muted-foreground">{countOf(state.id)}</span>
                <button
                  type="button"
                  className="ml-auto flex size-6.5 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:border-dash hover:text-foreground"
                  onClick={() => onCreateInState(state.id)}
                  aria-label={`Nueva tarea en ${state.name}`}
                >
                  <Plus className="size-3" strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
          {lanes.map((lane) => (lane.story || lane.issues.length > 0 ? <StoryLane key={lane.key} lane={lane} {...common} /> : null))}
        </div>
      </div>
      {storyClosedDialog}
    </div>
  )
}

/** Un carril del tablero agrupado por historia: su encabezado (plegable) y sus columnas. */
function StoryLane({ lane, slug, project, meta, openIssue, onStoryClosed }) {
  const { story } = lane
  const flags = story ? storyFlags(story) : null
  // Las historias listas para revisar (y las cerradas) empiezan plegadas en una línea
  const [open, setOpen] = useState(!flags || (!flags.ready && !flags.closed))
  const where = story ? [story.cycle?.name, ...(story.modules ?? []).map((module) => module.name)].filter(Boolean).join(' · ') : ''

  return (
    <section className="rounded-2xl bg-column p-2" aria-label={story ? `${story.code} ${story.title}` : 'Sin historia'}>
      <header className="flex min-w-0 items-center gap-2.5 px-1.5 py-1">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={open ? 'Plegar carril' : 'Desplegar carril'}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        {story ? (
          <>
            <TypeIcon type="STORY" />
            <span className="font-mono text-xs text-muted-foreground">{story.code}</span>
            <button
              type="button"
              onClick={() => openIssue(story.id)}
              className="min-w-0 truncate text-left text-sm font-semibold outline-none hover:underline focus-visible:underline"
            >
              {story.title}
            </button>
            {flags.ready ? <ReadyBadge /> : <BugCountBadge count={flags.openBugs} />}
            {story.storyTaskCount != null && (
              <span className="flex shrink-0 items-center gap-2.5">
                <StoryProgress story={story} compact className="w-28" />
                <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">{storyProgress(story).label}</span>
              </span>
            )}
            {lane.people.length > 0 && <AvatarStack users={lane.people} size="xs" />}
            {where && <span className="ml-auto shrink-0 truncate pr-1 font-mono text-[11px] text-muted-foreground">{where}</span>}
          </>
        ) : (
          <>
            <span aria-hidden="true" className="size-4 shrink-0 rounded-[4px] border-[1.5px] border-dashed border-dash" />
            <span className="text-sm font-semibold">Sin historia</span>
            <span className="font-mono text-xs text-muted-foreground">
              {lane.issues.length} {lane.issues.length === 1 ? 'tarea suelta' : 'tareas sueltas'}
            </span>
            <span className="ml-auto shrink-0 pr-1 font-mono text-[11px] text-muted-foreground">tareas técnicas y bugs sin historia</span>
          </>
        )}
      </header>
      {open && (
        <div className="mt-1.5">
          <BoardColumns
            issues={lane.issues}
            slug={slug}
            project={project}
            meta={meta}
            openIssue={openIssue}
            onStoryClosed={onStoryClosed}
            inLane
          />
        </div>
      )}
    </section>
  )
}

/**
 * Las columnas (una por estado) con sus tarjetas y el arrastre. En un carril (`inLane`) no llevan encabezado (va
 * arriba, una sola vez) y una columna vacía se ve como un hueco punteado.
 */
function BoardColumns({ issues, slug, project, meta, openIssue, onStoryClosed, onCreateInState, inLane = false }) {
  const move = useMoveIssue(slug, project.id)
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
    // Solo Espacio levanta la tarjeta: Enter la abre (como dice la barra de atajos)
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: KEYBOARD_CODES }),
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
    const commit = (extra) => {
      setAwaitingConfirm(false)
      // Lo que haya en caché ahora (pudo recargarse mientras se confirmaba): el cambio optimista lo reemplaza
      setSettlingFrom(serverColumnsRef.current)
      // Si falla, useMoveIssue devuelve la tarjeta a su columna; si fue por una historia cerrada, se pregunta si
      // se reabre y se reintenta (el `onError` va en las variables: sobrevive a otro arrastre hecho enseguida)
      move.mutate({
        issueId: active.id,
        stateId: targetState,
        afterIssueId,
        beforeIssueId,
        state,
        sortOrder,
        ...extra,
        onError: onStoryClosed(issue, closedStoryActions.move(issue, state), () => commit({ reopenParent: true }), 'No se pudo mover la tarea'),
      })
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

  const activeIssue = activeId ? issuesById[activeId] : null

  return (
    <div className={cn('flex min-h-0 flex-col', !inLane && 'h-full')}>
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
        <div className={cn('flex min-h-0 flex-1 gap-3', inLane ? 'items-stretch' : 'items-start overflow-x-auto pb-2')}>
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
              onCreate={() => onCreateInState?.(state.id)}
              inLane={inLane}
            />
          ))}
        </div>
        {/* En un portal: así la tarjeta sigue al cursor aunque algún contenedor tenga transform */}
        {createPortal(
          <DragOverlay>
            {activeIssue && <IssueCard issue={activeIssue} slug={slug} project={project} meta={meta} overlay inLane={inLane} />}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
      {criteriaDialog}
    </div>
  )
}

/** Las teclas del arrastre con teclado: sin Enter para empezar (abre la tarea); Enter o Espacio la sueltan. */
const KEYBOARD_CODES = { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] }

/**
 * Los mismos ids mientras no cambie su contenido: SortableContext avisa a todas sus tarjetas cuando cambia el
 * arreglo, y reagrupar (por ejemplo al guardar la descripción de una tarea) arma arreglos nuevos.
 */
function useStableIds(ids) {
  const key = ids.join('|')
  return useMemo(() => (key ? key.split('|') : []), [key])
}

function BoardColumn({ state, ids: currentIds, issuesById, slug, project, meta, openIssue, onCreate, inLane }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${state.id}` })
  const ids = useStableIds(currentIds)

  if (inLane) {
    return (
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          aria-label={state.name}
          className={cn(
            'flex min-h-24 w-[284px] shrink-0 flex-col gap-2 rounded-xl p-0.5 transition-colors duration-200',
            ids.length === 0 && 'border border-dashed border-dash/70',
            isOver && 'bg-accent-soft/60',
          )}
        >
          {ids.map((id) =>
            issuesById[id] ? (
              <SortableIssueCard key={id} issue={issuesById[id]} slug={slug} project={project} meta={meta} openIssue={openIssue} inLane />
            ) : null,
          )}
        </div>
      </SortableContext>
    )
  }

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

/**
 * Tarjeta arrastrable. Memorizada (como `IssueCard`): al reemplazarse una tarea en la caché solo se vuelve a pintar
 * su tarjeta. Las historias no se arrastran: su estado sigue a sus tareas y cerrarlas es del project manager.
 */
const SortableIssueCard = memo(function SortableIssueCard({ issue, openIssue, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    disabled: isStory(issue),
  })
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
        // Mientras se arrastra con el teclado, Enter suelta la tarjeta (lo maneja dnd-kit en el documento, después
        // de este manejador): no la abre
        if (event.key === 'Enter' && !event.defaultPrevented && !isDragging) openIssue(issue.id)
      }}
    >
      <IssueCard issue={issue} {...props} />
    </div>
  )
})

/** Evita que los selectores de la tarjeta inicien el arrastre o abran el detalle. */
const stop = (event) => event.stopPropagation()
const revealOnHover =
  'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100'

const IssueCard = memo(function IssueCard({ issue, slug, project, meta, overlay = false, inLane = false }) {
  const { update } = useIssueUpdater(slug, project.id, issue.id)
  const hasLabels = issue.labels?.length > 0
  // En un carril la historia ya está en el encabezado
  const storyChip = !inLane && issue.parent?.type === 'STORY'

  return (
    <article
      className={cn(
        'group flex flex-col gap-2.5 rounded-xl border bg-card p-3 shadow-card transition-[box-shadow,border-color] duration-200 hover:border-dash hover:shadow-md',
        isStory(issue) ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        overlay && 'cursor-grabbing shadow-xl ring-1 ring-foreground/10',
      )}
    >
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <IssueTypeIcon issue={issue} size={14} />
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
      {storyChip && <ParentStoryChip parent={issue.parent} className="self-start" />}
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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" onPointerDown={stop} onKeyDown={stop} onClick={stop}>
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
        <AttachmentsChip issue={issue} />
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
})
