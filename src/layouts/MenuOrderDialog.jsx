import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, Lock, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Segmented } from '@/components/common/Segmented'
import { t } from '@/i18n'
import { DND_INSTRUCTIONS, DRAG_ROLE, quoted, sortableAnnouncements } from '@/lib/dndAnnouncements'
import { cn } from '@/lib/utils'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { MAIN_MENU, MENU_ORDER_MODES, moveKey, orderItems, PROJECT_SECTIONS } from './menuOrder'

const MODE_HINTS = {
  default: t('El orden con el que viene TaskFlow.'),
  alpha: t('De la A a la Z.'),
  custom: t('Arrastra cada entrada, o usa las flechas (alt + ↑ ↓ sobre el asa).'),
}

/**
 * «Personalizar menú»: cómo se ordenan el menú principal y las secciones del proyecto abierto. Vale para esta
 * persona en este navegador y se aplica al momento. «Buscar» siempre va primero.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void }} props
 */
export function MenuOrderDialog({ open, onOpenChange }) {
  const menuOrder = usePreferencesStore((state) => state.menuOrder)
  const setMenuOrder = usePreferencesStore((state) => state.setMenuOrder)
  const { mode } = menuOrder
  const main = orderItems(MAIN_MENU, mode, menuOrder.main)
  const sections = orderItems(PROJECT_SECTIONS, mode, menuOrder.sections, (section) => section.path)

  // La primera vez que se pasa a «personalizado» se parte del orden que se está viendo (si venía de alfabético, empieza
  // alfabético); si ya había un orden propio guardado, se recupera ese
  const hasCustom = menuOrder.main.length > 0 || menuOrder.sections.length > 0
  const setMode = (next) =>
    setMenuOrder(
      next === 'custom' && !hasCustom
        ? { mode: next, main: main.map((item) => item.key), sections: sections.map((section) => section.path) }
        : { ...menuOrder, mode: next },
    )

  const moveMain = (key, toIndex) => setMenuOrder({ ...menuOrder, main: moveKey(main.map((item) => item.key), key, toIndex) })
  const moveSection = (key, toIndex) =>
    setMenuOrder({ ...menuOrder, sections: moveKey(sections.map((section) => section.path), key, toIndex) })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh_-_3rem)] gap-4 overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{t('Personalizar menú')}</DialogTitle>
          <DialogDescription>{t('Elige cómo se ordena el menú de la izquierda. Solo cambia para ti, en este navegador.')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Segmented label={t('Orden del menú')} value={mode} onChange={setMode} options={MENU_ORDER_MODES} className="bg-card" />
          <p className="text-[13px] text-muted-foreground">{MODE_HINTS[mode]}</p>
        </div>

        <p className="flex items-center gap-2 rounded-xl border border-dashed border-dash px-3 py-2 text-sm text-muted-foreground">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{t('Buscar')}</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Lock className="size-3" aria-hidden="true" />
            {t('siempre primero')}
          </span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <OrderGroup
            title={t('Menú principal')}
            items={main.map((item) => ({ id: item.key, label: item.label }))}
            canMove={mode === 'custom'}
            onMove={moveMain}
          />
          <OrderGroup
            title={t('Secciones del proyecto')}
            items={sections.map((section) => ({ id: section.path, label: section.label }))}
            canMove={mode === 'custom'}
            onMove={moveSection}
          />
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('Listo')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Una lista del menú: en «personalizado» se arrastra o se mueve con las flechas; si no, solo muestra el orden. */
function OrderGroup({ title, items, canMove, onMove }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map((item) => item.id)
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-1.5">
      <p className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">{title}</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{
          screenReaderInstructions: DND_INSTRUCTIONS,
          announcements: sortableAnnouncements(ids, (id) => quoted(items.find((item) => item.id === id)?.label ?? '')),
        }}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return
          const index = ids.indexOf(over.id)
          if (index >= 0) onMove(active.id, index)
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={!canMove}>
          <ol className="overflow-hidden rounded-xl border">
            {items.map((item, index) => (
              <OrderRow key={item.id} item={item} index={index} count={items.length} canMove={canMove} onMove={onMove} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </section>
  )
}

function OrderRow({ item, index, count, canMove, onMove }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canMove,
    attributes: { roleDescription: DRAG_ROLE.item },
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative flex h-9.5 items-center gap-2 bg-card pr-1.5 pl-1 transition-shadow duration-150',
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
              onMove(item.id, index + (event.key === 'ArrowUp' ? -1 : 1))
              return
            }
            listeners?.onKeyDown?.(event)
          }}
          aria-label={t('Mover «{name}»', { name: item.label })}
          title={t('Arrastra o usa alt + ↑ ↓')}
          className={cn(
            'flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-dash outline-none hover:bg-accent hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
            isDragging && 'bg-accent-soft text-accent-text',
          )}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <span className="w-4 shrink-0 text-right font-mono text-[11px] text-muted-foreground">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
      {canMove && (
        <span className="flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={t('Subir «{name}»', { name: item.label })}
            disabled={index === 0}
            onClick={() => onMove(item.id, index - 1)}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={t('Bajar «{name}»', { name: item.label })}
            disabled={index === count - 1}
            onClick={() => onMove(item.id, index + 1)}
          >
            <ArrowDown />
          </Button>
        </span>
      )}
    </li>
  )
}
