import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  closestCenter,
  defaultDropAnimation,
  defaultDropAnimationSideEffects,
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
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarStack } from '@/components/common/AvatarStack'
import { ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { useStories } from '@/features/stories/hooks'
import { stateName, t, tn } from '@/i18n'
import { DND_INSTRUCTIONS, DRAG_ROLE, dndAnnouncements, quoted } from '@/lib/dndAnnouncements'
import {
  columnKey,
  findColumn,
  getNeighbors,
  groupByLaneAndState,
  groupByState,
  laneKeyOf,
  laneOfColumn,
  sortOrderBetween,
  stateOfColumn,
} from '@/lib/kanban'
import { cn } from '@/lib/utils'
import { focusRowMain } from '@/lib/focusReturn'
import { BOARD_GROUP_STORY, BOARD_PAGE_SIZE, DEFAULT_SORT, SORT_OPTIONS } from '../constants'
import { useIssues, useMoveIssue } from '../hooks'
import { needsCriteriaConfirm } from '../issueFlags'
import { isStory, storyFlags, storyLanes, storyProgress } from '../issueTypes'
import { useCriteriaGuard } from '../useCriteriaGuard'
import { useCanEditIssues } from '../editPermission'
import { isClosed, useIssueUpdater } from '../useIssueHelpers'
import { closedStoryActions, useStoryClosedGuard } from '../useStoryClosedGuard'
import { PulseOnChange } from '@/components/common/Pulse'
import { flash, useFlash } from '@/lib/flash'
import { IssueDevChip } from '@/features/github/GithubParts'
import { AttachmentsChip, BlockedChip, BlockingChip, ChecklistChip } from './IssueBadges'
import { BugCountBadge, IssueTypeIcon, ParentStoryChip, ReadyBadge, StoryProgress, TypeIcon } from './IssueTypeBits'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker } from './PropertyPickers'

/**
 * Kanban: una columna por estado; las tarjetas se arrastran entre columnas y dentro de ellas. Con
 * `groupBy="story"` hay un carril por historia (con su progreso, personas y bugs abiertos) y «Sin historia» al
 * final; las historias listas para revisar empiezan plegadas. Soltar una tarjeta en el carril de otra historia la
 * pasa a esa historia (un bug queda como bug de la historia; una tarea cuenta en su avance) y en «Sin historia» la
 * saca de la suya.
 *
 * `sort` es el mismo orden de la lista. Con «manual» las tarjetas se acomodan a mano dentro de cada columna; con
 * cualquier otro (prioridad, más recientes…) cada columna sigue ese orden: arrastrar todavía cambia el estado o la
 * historia, pero la posición dentro de la columna la decide el orden elegido.
 */
export function IssueBoardView({ slug, project, meta, filters, openIssue, onCreateInState, extraParams, groupBy, sort = DEFAULT_SORT }) {
  const manual = sort === DEFAULT_SORT
  const params = { ...filters, ...extraParams, sort, page: 0, size: BOARD_PAGE_SIZE }
  const { data, isLoading, error, refetch } = useIssues(slug, project.id, params)
  const laned = groupBy === BOARD_GROUP_STORY
  const { data: stories } = useStories(slug, project.id, { enabled: laned })
  const issues = useMemo(() => data?.content ?? [], [data])
  // Memorizados: si cada render armara carriles nuevos, sus columnas se recalcularían y una tarjeta recién soltada
  // volvería un instante a su lugar
  const lanes = useMemo(() => (laned ? storyLanes(issues, stories ?? []) : null), [laned, issues, stories])
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
      {t('Se muestran {shown} de {total} tareas. Usa los filtros o la vista de lista para ver el resto.', { shown: BOARD_PAGE_SIZE, total: data.totalElements })}
    </div>
  )
  const common = { slug, project, meta, openIssue, onStoryClosed, sort: manual ? null : sort }

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
                <span className="min-w-0 truncate font-semibold" title={stateName(state)}>
                  {stateName(state)}
                </span>
                {/* Sin ceros a la izquierda, como en el tablero normal */}
                <PulseOnChange value={countOf(state.id)} className="text-muted-foreground" />
                {/* Sin el permiso de crear tareas no hay «+» */}
                {onCreateInState && (
                  <button
                    type="button"
                    className="ml-auto flex size-6.5 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:border-dash hover:text-foreground"
                    onClick={() => onCreateInState(state.id)}
                    aria-label={t('Nueva tarea en {state}', { state: stateName(state) })}
                  >
                    <Plus className="size-3" strokeWidth={3} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Un solo arrastre para todos los carriles: soltar en el de otra historia (o en «Sin historia») cambia la
              historia de la tarea. «Sin historia» se ve aunque esté vacío: es donde se suelta para sacarla */}
          <BoardColumns issues={issues} lanes={lanes} {...common} />
        </div>
      </div>
      {storyClosedDialog}
    </div>
  )
}

/** Un carril del tablero agrupado por historia: su encabezado (plegable) y sus columnas (`children`). */
function StoryLane({ lane, openIssue, children }) {
  const { story } = lane
  const flags = story ? storyFlags(story) : null
  // Las historias listas para revisar (y las cerradas) empiezan plegadas en una línea
  const [open, setOpen] = useState(!flags || (!flags.ready && !flags.closed))
  const where = story ? [story.cycle?.name, ...(story.modules ?? []).map((module) => module.name)].filter(Boolean).join(' · ') : ''

  return (
    <section className="rounded-2xl bg-column p-2" aria-label={story ? `${story.code} ${story.title}` : t('Sin historia')}>
      <header className="flex min-w-0 items-center gap-2.5 px-1.5 py-1">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={open ? t('Plegar carril') : t('Desplegar carril')}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        {story ? (
          <>
            <TypeIcon type="STORY" />
            <span className="shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{story.code}</span>
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
            <span className="text-sm font-semibold">{t('Sin historia')}</span>
            <span className="font-mono text-xs text-muted-foreground">{tn(lane.issues.length, '{count} tarea suelta', '{count} tareas sueltas')}</span>
            <span className="ml-auto shrink-0 pr-1 font-mono text-[11px] text-muted-foreground">{t('tareas técnicas y bugs sin historia')}</span>
          </>
        )}
      </header>
      {open && <div className="mt-1.5">{children}</div>}
    </section>
  )
}

/**
 * Las columnas (una por estado) con sus tarjetas y el arrastre. Con `lanes` (tablero agrupado por historia) hay un
 * solo arrastre para todos los carriles: cada columna es «carril|estado» y soltar en otro carril cambia la historia
 * de la tarea. En un carril las columnas no llevan encabezado (va arriba, una sola vez) y una vacía se ve como un
 * hueco punteado.
 */
function BoardColumns({ issues, lanes = null, slug, project, meta, openIssue, onStoryClosed, onCreateInState, sort = null }) {
  const move = useMoveIssue(slug, project.id)
  const issuesById = useMemo(() => Object.fromEntries(issues.map((issue) => [issue.id, issue])), [issues])
  // Con un orden elegido (`sort`), las tareas ya llegan en ese orden y cada columna lo conserva
  const sorted = Boolean(sort)
  const serverColumns = useMemo(
    () => (lanes ? groupByLaneAndState(lanes, meta.states, { keepOrder: sorted }) : groupByState(issues, meta.states, { keepOrder: sorted })),
    [lanes, issues, meta.states, sorted],
  )

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
  useLayoutEffect(() => {
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
  // El último cambio de columna de este arrastre y dónde estaba el puntero (ver `handleDragOver`)
  const lastHop = useRef(null)
  // La tarjeta que se asienta cuando termina de caer en su sitio (ver `dropAnimation`)
  const settleNext = useRef(null)
  // En un efecto de diseño: dnd-kit avisa (onDragOver) en un efecto normal, que corre después, y ya las ve al día
  useLayoutEffect(() => {
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
      let overId
      if (pointerHits.length > 0) overId = getFirstCollision(pointerHits, 'id')
      // Con el puntero fuera de toda columna (un encabezado, el espacio entre dos, debajo de una corta) decide la
      // columna más cercana al puntero. Con lo que toque la tarjeta arrastrada no: tocando dos columnas a la vez, al
      // pasar a una cambian los tamaños, gana la otra, y la tarjeta va y viene sin parar
      else if (args.pointerCoordinates) overId = nearestColumn(args)
      // Con el teclado no hay puntero: lo que toque la tarjeta
      else overId = getFirstCollision(rectIntersection(args), 'id')
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

  // Con opciones fijas (`POINTER_SENSOR`…): con un objeto nuevo en cada pintada, dnd-kit rehace los sensores y con
  // ellos los manejadores de todas las tarjetas, y cada tarjeta se vuelve a pintar entera en cada paso del arrastre
  const sensors = useSensors(useSensor(PointerSensor, POINTER_SENSOR), useSensor(KeyboardSensor, KEYBOARD_SENSOR))

  // Al soltar, la copia que sigue al cursor cae a su sitio; cuando llega, la tarjeta de verdad se asienta
  const dropAnimation = useMemo(
    () => ({
      ...defaultDropAnimation,
      sideEffects: (args) => {
        const restore = HIDE_WHILE_DROPPING(args)
        return () => {
          restore?.()
          if (settleNext.current === args.active.id) flash('settled', args.active.id, 400)
          settleNext.current = null
        }
      },
    }),
    [],
  )

  const columnOf = (id, source = columns) =>
    id?.toString().startsWith('column:') ? id.slice('column:'.length) : findColumn(source, id)
  const laneByKey = useMemo(() => new Map((lanes ?? []).map((lane) => [lane.key, lane])), [lanes])

  // Lo que oye un lector de pantalla: el código y el título de la tarjeta, la columna (y la historia) donde quedaría
  const accessibility = useMemo(() => {
    const columnName = (key) => {
      const state = meta.states.find((item) => item.id === stateOfColumn(key))
      const name = quoted(stateName(state) || t('sin nombre'))
      if (!lanes) return t('la columna {name}', { name })
      const story = laneByKey.get(laneOfColumn(key))?.story
      return story ? t('la columna {name} de la historia {code}', { name, code: story.code }) : t('la columna {name} de «Sin historia»', { name })
    }
    return {
      screenReaderInstructions: DND_INSTRUCTIONS,
      announcements: dndAnnouncements({
        itemLabel: (id) => {
          const issue = issuesById[id]
          return issue ? `${issue.code} ${quoted(issue.title)}` : t('la tarjeta')
        },
        placeLabel: (overId) => {
          const source = columns
          const key = String(overId).startsWith('column:') ? String(overId).slice('column:'.length) : findColumn(source, overId)
          if (!key) return null
          const ids = source[key] ?? []
          const index = ids.indexOf(overId)
          return index >= 0 ? t('{place}, posición {position} de {total}', { place: columnName(key), position: index + 1, total: ids.length }) : columnName(key)
        },
      }),
    }
  }, [issuesById, meta.states, lanes, laneByKey, columns])

  const handleDragStart = ({ active }) => {
    lastHop.current = null
    settleNext.current = null
    setActiveId(active.id)
    setSettlingFrom(null)
    setDragColumns(serverColumns)
  }

  const handleDragOver = ({ active, over, delta }) => {
    if (!over) return
    // Seguro contra el vaivén: volver a la columna de la que acaba de salir sin que el puntero se haya movido no es
    // un gesto de la persona, es la pantalla reacomodándose. Sin esto, un caso así repinta sin parar y tumba la app
    const known = columnsRef.current
    const hopFrom = columnOf(active.id, known)
    const hopTo = columnOf(over.id, known)
    if (delta && hopFrom && hopTo && hopFrom !== hopTo) {
      const hop = lastHop.current
      if (hop && hop.from === hopTo && hop.to === hopFrom && Math.hypot(delta.x - hop.x, delta.y - hop.y) < HOP_BACK_DISTANCE) return
      lastHop.current = { from: hopFrom, to: hopTo, x: delta.x, y: delta.y }
    }
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

    const targetColumn = columnOf(active.id, current)
    let targetIds = current[targetColumn]
    const overIndex = targetIds.indexOf(over.id)
    const activeIndex = targetIds.indexOf(active.id)
    if (overIndex >= 0 && overIndex !== activeIndex) {
      targetIds = arrayMove(targetIds, activeIndex, overIndex)
    }

    const issue = issuesById[active.id]
    const targetState = stateOfColumn(targetColumn)
    const fromLane = lanes ? laneKeyOf(issue) : null
    const targetLane = laneOfColumn(targetColumn)
    const laneChanged = Boolean(lanes) && targetLane !== fromLane
    const originalIds = serverColumns[columnKey(fromLane, issue.state.id)] ?? []
    const sameColumn = !laneChanged && issue.state.id === targetState
    const unchanged = sameColumn && originalIds.indexOf(active.id) === targetIds.indexOf(active.id)
    if (unchanged || (sorted && sameColumn)) {
      setDragColumns(null)
      // Ordenado por prioridad, fecha…: dentro de la columna manda ese orden, no dónde se suelte
      if (!unchanged) {
        toast.info(t('El tablero está ordenado por {criterion}', { criterion: sortLabel(sort) }), {
          id: 'board-sorted',
          description: t('Para acomodar las tarjetas a mano, cambia el orden a «manual».'),
        })
      }
      return
    }
    // La posición final se queda en pantalla hasta que llegue la actualización optimista
    setDragColumns({ ...current, [targetColumn]: targetIds })
    setSettlingFrom(serverColumns)

    // Con un orden elegido no hay vecinas: el backend la deja al final del orden manual de la columna
    const { afterIssueId, beforeIssueId } = sorted ? { afterIssueId: null, beforeIssueId: null } : getNeighbors(targetIds, active.id)
    const others = targetIds.filter((id) => id !== active.id).map((id) => issuesById[id].sortOrder)
    // Con un orden elegido, cambiar solo de historia (mismo estado) no mueve la tarjeta en el orden manual
    const keepPosition = sorted && issue.state.id === targetState
    const sortOrder = keepPosition
      ? issue.sortOrder
      : sortOrderBetween(
          issuesById[afterIssueId]?.sortOrder,
          issuesById[beforeIssueId]?.sortOrder,
          others.length ? Math.max(...others) : null,
        )
    const state = meta.states.find((item) => item.id === targetState)
    // Otro carril: la historia de ese carril pasa a ser su padre; «Sin historia» se lo quita
    const story = laneChanged ? (laneByKey.get(targetLane)?.story ?? null) : null
    const parentMove = laneChanged ? laneParentChange(story, laneByKey.get(targetLane)) : null
    const commit = (extra) => {
      setAwaitingConfirm(false)
      // Lo que haya en caché ahora (pudo recargarse mientras se confirmaba): el cambio optimista lo reemplaza
      setSettlingFrom(serverColumnsRef.current)
      // Si falla, useMoveIssue devuelve la tarjeta a su columna (y a su historia); si fue por una historia cerrada,
      // se pregunta si se reabre y se reintenta (el `onError` va en las variables: sobrevive a otro arrastre hecho
      // enseguida)
      const action = story ? closedStoryActions.parent(issue) : closedStoryActions.move(issue, state)
      move.mutate({
        issueId: active.id,
        stateId: targetState,
        afterIssueId,
        beforeIssueId,
        state,
        sortOrder,
        keepPosition,
        ...parentMove,
        ...extra,
        onMoved: laneChanged ? () => announceLaneChange(issue, story) : undefined,
        onError: onStoryClosed(
          issue,
          action,
          () => commit({ reopenParent: true }),
          laneChanged ? t('No se pudo cambiar la historia de la tarea') : t('No se pudo mover la tarea'),
        ),
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
    // Se asienta donde se soltó, cuando la copia que sigue al cursor termine de caer (ver `dropAnimation`)
    settleNext.current = active.id
    commit()
  }

  const activeIssue = activeId ? issuesById[activeId] : null
  const inLane = Boolean(lanes)

  const renderColumns = (laneKey) => (
    <div className={cn('flex min-h-0 flex-1 gap-3', inLane ? 'items-stretch' : 'items-start overflow-x-auto pb-2')}>
      {meta.states.map((state) => (
        <BoardColumn
          key={state.id}
          state={state}
          columnId={columnKey(laneKey, state.id)}
          ids={columns[columnKey(laneKey, state.id)] ?? []}
          issuesById={issuesById}
          slug={slug}
          project={project}
          meta={meta}
          openIssue={openIssue}
          onCreate={onCreateInState ? () => onCreateInState(state.id) : undefined}
          inLane={inLane}
          dragging={activeId != null}
        />
      ))}
    </div>
  )

  return (
    <div className={cn('flex min-h-0 flex-col', inLane ? 'gap-3' : 'h-full')}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={MEASURING}
        accessibility={accessibility}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          setDragColumns(null)
        }}
      >
        {lanes
          ? lanes.map((lane) => (
              <StoryLane key={lane.key} lane={lane} openIssue={openIssue}>
                {renderColumns(lane.key)}
              </StoryLane>
            ))
          : renderColumns(null)}
        {/* En un portal: así la tarjeta sigue al cursor aunque algún contenedor tenga transform */}
        {createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {activeIssue && <IssueCard issue={activeIssue} slug={slug} project={project} meta={meta} overlay inLane={inLane} />}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
      {criteriaDialog}
    </div>
  )
}

/**
 * Lo que cambia el padre de una tarjeta soltada en otro carril: `parentChange` va al backend (junto con el estado, en
 * una sola edición) y `parent` se pinta al instante. Con la historia del carril, el resumen que ya traen sus tareas.
 */
function laneParentChange(story, lane) {
  if (!story) return { parentChange: { clearParent: true }, parent: null }
  const parent = lane?.issues.find((item) => item.parent?.id === story.id)?.parent ?? {
    id: story.id,
    code: story.code,
    title: story.title,
    type: 'STORY',
  }
  return { parentChange: { parentId: story.id }, parent }
}

/** Aviso al cambiar de historia arrastrando: un bug queda como bug de la historia; una tarea cuenta en su avance. */
function announceLaneChange(issue, story) {
  if (!story) {
    toast.success(t('{code} quedó sin historia', { code: issue.code }), { description: issue.title })
    return
  }
  toast.success(t('{code} ahora es de {story}', { code: issue.code, story: story.code }), {
    description:
      issue.type === 'BUG' ? t('Queda como bug de «{title}».', { title: story.title }) : t('Cuenta en el avance de «{title}».', { title: story.title }),
  })
}

/** «prioridad», «más recientes»…: el nombre del orden como se lee en el selector. */
const sortLabel = (sort) => SORT_OPTIONS.find((option) => option.value === sort)?.label.toLowerCase() ?? t('otro criterio')

/** Las teclas del arrastre con teclado: sin Enter para empezar (abre la tarea); Enter o Espacio la sueltan. */
const KEYBOARD_CODES = { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] }
const POINTER_SENSOR = { activationConstraint: { distance: 6 } }
// Solo Espacio levanta la tarjeta: Enter la abre (como dice la barra de atajos)
const KEYBOARD_SENSOR = { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: KEYBOARD_CODES }
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } }
// Mientras la copia cae a su sitio, la tarjeta de verdad no se ve (lo que dnd-kit hace por defecto)
const HIDE_WHILE_DROPPING = defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } })
/** Cuánto tiene que moverse el puntero (px) para que volver a la columna anterior cuente como un gesto. */
const HOP_BACK_DISTANCE = 8
/** Hasta qué distancia horizontal (px) de una columna el puntero cuenta como «en esa columna»: cubre el espacio entre dos. */
const COLUMN_REACH = 48

/**
 * La columna más cercana al puntero cuando no está sobre ninguna: primero la más cercana a lo ancho (las columnas van
 * una al lado de la otra) y, entre las de un mismo estado en distintos carriles, la más cercana a lo alto. Lejos del
 * tablero (sobre el menú, por ejemplo) no elige ninguna: la tarjeta se queda donde estaba.
 */
function nearestColumn({ droppableContainers, droppableRects, pointerCoordinates }) {
  let best = null
  for (const container of droppableContainers) {
    if (!String(container.id).startsWith('column:')) continue
    const rect = droppableRects.get(container.id)
    if (!rect) continue
    const dx = Math.max(rect.left - pointerCoordinates.x, 0, pointerCoordinates.x - rect.right)
    const dy = Math.max(rect.top - pointerCoordinates.y, 0, pointerCoordinates.y - rect.bottom)
    if (dx > COLUMN_REACH) continue
    if (!best || dx < best.dx || (dx === best.dx && dy < best.dy)) best = { id: container.id, dx, dy }
  }
  return best?.id ?? null
}

/**
 * Los mismos ids mientras no cambie su contenido: SortableContext avisa a todas sus tarjetas cuando cambia el
 * arreglo, y reagrupar (por ejemplo al guardar la descripción de una tarea) arma arreglos nuevos.
 */
function useStableIds(ids) {
  const key = ids.join('|')
  return useMemo(() => (key ? key.split('|') : []), [key])
}

function BoardColumn({ state, columnId, ids: currentIds, issuesById, slug, project, meta, openIssue, onCreate, inLane, dragging = false }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${columnId}` })
  const ids = useStableIds(currentIds)

  if (inLane) {
    return (
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          aria-label={stateName(state)}
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
    <section className="flex max-h-full w-[284px] shrink-0 flex-col gap-2 rounded-2xl bg-column p-2" aria-label={stateName(state)}>
      <header className="flex items-center gap-2 px-1.5 pt-1.5 pb-1 font-mono text-[11px] tracking-[0.08em] uppercase">
        <StateIcon group={state.group} color={state.color} className="size-3.5" />
        {/* Un estado de nombre largo se corta: completo al pasar el mouse */}
        <h3 className="min-w-0 truncate font-semibold" title={stateName(state)}>
          {stateName(state)}
        </h3>
        {/* Mientras se arrastra el número solo se actualiza; el pulso es al soltar, si la columna cambió */}
        <PulseOnChange value={ids.length} hold={dragging} className="text-muted-foreground" />
        {onCreate && (
          <button
            type="button"
            className="ml-auto flex size-6.5 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:border-dash hover:text-foreground"
            onClick={onCreate}
            aria-label={t('Nueva tarea en {state}', { state: stateName(state) })}
          >
            <Plus className="size-3" strokeWidth={3} />
          </button>
        )}
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
 *
 * Con el mouse, toda la tarjeta: un clic la abre y se arrastra desde cualquier parte. Con el teclado, el título es el
 * control de la tarjeta (nombre corto: código y título): Enter la abre y Espacio la levanta. Los selectores de adentro
 * van aparte, cada uno con su nombre (si la tarjeta entera fuera el botón, su nombre sería todo lo que tiene adentro).
 */
const SortableIssueCard = memo(function SortableIssueCard({ issue, openIssue, ...props }) {
  const story = isStory(issue)
  const canEdit = useCanEditIssues()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    // Una historia no se arrastra; las demás, solo con el permiso de editar tareas
    disabled: story || !canEdit,
    attributes: { roleDescription: DRAG_ROLE.card },
  })
  const onActivatorKeyDown = useCallback(
    (event) => {
      listeners?.onKeyDown?.(event)
      // Mientras se arrastra con el teclado, Enter suelta la tarjeta (lo maneja dnd-kit en el documento, después
      // de este manejador): no la abre
      if (event.key === 'Enter' && !event.defaultPrevented && !isDragging) openIssue(issue.id)
    },
    [listeners, isDragging, openIssue, issue.id],
  )
  // Una historia no se arrastra: su título es un botón que la abre, sin las instrucciones de arrastre
  const activatorAttributes = useMemo(
    () => (story ? { role: 'button', tabIndex: 0 } : { ...attributes, 'aria-disabled': undefined }),
    [story, attributes],
  )
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-xl has-[[data-card-activator]:focus-visible]:ring-2 has-[[data-card-activator]:focus-visible]:ring-ring',
        // Mientras se arrastra queda un hueco punteado del tamaño de la tarjeta
        isDragging && 'bg-card/40 outline-2 -outline-offset-2 outline-dash outline-dashed [&>article]:invisible',
      )}
      onPointerDown={listeners?.onPointerDown}
      onClick={(event) => {
        focusRowMain(event.currentTarget)
        openIssue(issue.id)
      }}
    >
      <IssueCard
        issue={issue}
        {...props}
        activatorRef={setActivatorNodeRef}
        activatorAttributes={activatorAttributes}
        onActivatorKeyDown={onActivatorKeyDown}
      />
    </div>
  )
})

/** Evita que el clic en los selectores de la tarjeta inicie el arrastre o abra el detalle. */
const stop = (event) => event.stopPropagation()
const revealOnHover =
  'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100'

/**
 * `activatorAttributes`, `activatorRef`, `onActivatorKeyDown`: el control de teclado de la tarjeta (ver
 * SortableIssueCard), en el título. Sin ellos (la copia que sigue al cursor mientras se arrastra) el título es solo texto.
 */
const IssueCard = memo(function IssueCard({
  issue,
  slug,
  project,
  meta,
  overlay = false,
  inLane = false,
  activatorRef,
  activatorAttributes,
  onActivatorKeyDown,
}) {
  const { update } = useIssueUpdater(slug, project.id, issue.id)
  const locked = !useCanEditIssues()
  // Recién soltada se asienta con un pequeño rebote; recién creada, aparece resaltada un momento
  const settled = useFlash('settled', issue.id)
  const created = useFlash('created', issue.id)
  const completed = useFlash('completed', issue.id)
  const hasLabels = issue.labels?.length > 0
  // En un carril la historia ya está en el encabezado
  const storyChip = !inLane && issue.parent?.type === 'STORY'

  return (
    <article
      data-issue-id={overlay ? undefined : issue.id}
      className={cn(
        'group flex flex-col gap-2.5 rounded-xl border bg-card p-3 shadow-card transition-[box-shadow,border-color] duration-200 hover:border-dash hover:shadow-md',
        isStory(issue) || locked ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        overlay && 'cursor-grabbing shadow-xl ring-1 ring-foreground/10',
        !overlay && settled && 'tf-settle',
        !overlay && created && 'tf-new-row',
        !overlay && completed && 'tf-done-flash',
      )}
    >
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <IssueTypeIcon issue={issue} size={14} />
        <span className="shrink-0 whitespace-nowrap text-muted-foreground">{issue.code}</span>
        <span className="ml-auto" onPointerDown={stop} onClick={stop}>
          <PriorityPicker disabled={locked}
            chip
            // «sin prioridad» (oculto hasta pasar el mouse) ocupaba 126 px y empujaba el código a dos líneas
            iconOnlyWhenEmpty
            value={issue.priority}
            onChange={(priority) => update({ priority })}
            className={cn(issue.priority === 'NONE' && revealOnHover)}
          />
        </span>
      </div>
      <h4 className="line-clamp-3 text-[14.5px] leading-snug font-medium">
        {activatorAttributes ? (
          <span
            ref={activatorRef}
            data-card-activator=""
            {...activatorAttributes}
            aria-label={`${issue.code} ${issue.title}`}
            onKeyDown={onActivatorKeyDown}
            className="outline-none"
          >
            {issue.title}
          </span>
        ) : (
          issue.title
        )}
      </h4>
      {storyChip && <ParentStoryChip parent={issue.parent} className="self-start" />}
      <BlockedChip issue={issue} codes="by" className="self-start" />
      <BlockingChip issue={issue} className="self-start" />
      {hasLabels && (
        <div onPointerDown={stop} onClick={stop}>
          <LabelsPicker disabled={locked}
            compact
            labels={meta.labels}
            value={issue.labels.map((label) => label.id)}
            onChange={(labelIds) => update({ labelIds })}
            className="-ml-2"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" onPointerDown={stop} onClick={stop}>
        <DatePicker disabled={locked}
          value={issue.dueDate}
          placeholder={t('Fecha límite')}
          due={{ closed: isClosed(issue) }}
          minDate={issue.startDate}
          onChange={(dueDate) => update(dueDate ? { dueDate } : { clearDueDate: true })}
          className={cn(!issue.dueDate && cn('-ml-2', revealOnHover))}
        />
        {issue.subIssueCount > 0 && (
          <span className="font-mono text-[11px] text-muted-foreground" title={t('Subtareas completadas')}>
            ↳ {issue.completedSubIssueCount}/{issue.subIssueCount}
          </span>
        )}
        <AttachmentsChip issue={issue} />
        <ChecklistChip issue={issue} />
        <IssueDevChip slug={slug} projectId={project.id} issueId={issue.id} />
        {!hasLabels && meta.labels.length > 0 && (
          <LabelsPicker disabled={locked} compact labels={meta.labels} value={[]} onChange={(labelIds) => update({ labelIds })} className={revealOnHover} />
        )}
        <AssigneesPicker disabled={locked}
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
