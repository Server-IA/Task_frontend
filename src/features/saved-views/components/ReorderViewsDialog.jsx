import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, Lock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LockNote } from '@/components/common/LockNote'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useReorderSavedViews } from '../hooks'
import { moveView, reorderableGroups } from '../savedViews'

/** @typedef {import('@/api/types').SavedView} SavedView */

/**
 * «Ordenar vistas»: las compartidas (las ordena el project manager) y las personales (cada uno las suyas),
 * arrastrando el asa, con alt + ↑ ↓ sobre ella o con las flechas. Cada cambio se guarda al momento.
 * @param {{ slug: string, projectId: string, views: SavedView[], isManager: boolean, open: boolean,
 *           onOpenChange: (open: boolean) => void }} props
 */
export function ReorderViewsDialog({ slug, projectId, views, isManager, open, onOpenChange }) {
  const reorder = useReorderSavedViews(slug, projectId)
  const { shared, personal, canShared } = reorderableGroups(views, isManager)

  const move = (view, toIndex) => {
    const moved = moveView(views, view.id, toIndex)
    if (!moved) return
    reorder.mutate(moved, { onError: (error) => notifyError(error, 'No se pudo cambiar el orden') })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ordenar vistas</DialogTitle>
          <DialogDescription>Así aparecen en la barra. Las compartidas siempre van antes que las personales.</DialogDescription>
        </DialogHeader>
        {shared.length > 0 && (
          <ViewGroup
            title="Compartidas"
            icon={Users}
            views={shared}
            canMove={canShared}
            note={!isManager && shared.length > 1 ? 'Solo el project manager ordena las vistas compartidas.' : null}
            onMove={move}
          />
        )}
        {personal.length > 0 && (
          <ViewGroup title="Personales" icon={Lock} views={personal} canMove={personal.length > 1} onMove={move} />
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ViewGroup({ title, icon: Icon, views, canMove, note, onMove }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  return (
    <section aria-label={title} className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
        <Icon className="size-3" aria-hidden="true" />
        {title}
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return
          const view = views.find((item) => item.id === active.id)
          const index = views.findIndex((item) => item.id === over.id)
          if (view && index >= 0) onMove(view, index)
        }}
      >
        <SortableContext items={views.map((view) => view.id)} strategy={verticalListSortingStrategy} disabled={!canMove}>
          <ol className="overflow-hidden rounded-xl border">
            {views.map((view, index) => (
              <SortableRow key={view.id} view={view} index={index} count={views.length} canMove={canMove} onMove={onMove} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {note && <LockNote>{note}</LockNote>}
    </section>
  )
}

function SortableRow({ view, index, count, canMove, onMove }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: view.id,
    disabled: !canMove,
  })
  const Icon = view.shared ? Users : Lock

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative flex items-center gap-2 bg-card py-1 pr-1.5 pl-1 transition-shadow duration-150',
        index > 0 && 'border-t',
        !canMove && 'pl-3',
        isDragging && 'z-10 shadow-[0_8px_22px_rgb(35_32_27/0.18)]',
      )}
    >
      {canMove && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onKeyDown={(event) => {
            if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
              event.preventDefault()
              const target = index + (event.key === 'ArrowUp' ? -1 : 1)
              if (target >= 0 && target < count) onMove(view, target)
              return
            }
            listeners?.onKeyDown?.(event)
          }}
          aria-label={`Mover «${view.name}»`}
          title="Arrastra o usa alt + ↑ ↓"
          className={cn(
            'flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-dash outline-none hover:bg-accent hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
            isDragging && 'bg-accent-soft text-accent-text',
          )}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-label={view.shared ? 'compartida' : 'personal'} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{view.name}</span>
      <span className="font-mono text-[11px] text-muted-foreground" title="Tareas que muestra">
        {view.issueCount ?? ''}
      </span>
      {canMove && (
        <span className="flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={`Subir «${view.name}»`}
            disabled={index === 0}
            onClick={() => onMove(view, index - 1)}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={`Bajar «${view.name}»`}
            disabled={index === count - 1}
            onClick={() => onMove(view, index + 1)}
          >
            <ArrowDown />
          </Button>
        </span>
      )}
    </li>
  )
}
