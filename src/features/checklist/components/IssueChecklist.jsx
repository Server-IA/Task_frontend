import { useRef, useState } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, ListChecks, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/common/Segmented'
import { PropertyRow } from '@/features/issues/components/IssueDetail'
import { checklistProgress } from '@/features/issues/issueFlags'
import { useLocalEscape } from '@/hooks/useLocalEscape'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { dropIndex, formatCriterion, itemsOfKind, moveChecklistItem, parseCriterion } from '../checklistMath'
import {
  CHECKLIST_LIMIT,
  useAddChecklistItem,
  useChecklist,
  useDeleteChecklistItem,
  useMoveChecklistItem,
  useUpdateChecklistItem,
} from '../hooks'

/** @typedef {import('@/api/types').ChecklistItem} ChecklistItem */

const onError = (error) => notifyError(error)
const MAX_TEXT = 500

/**
 * Bloques «Criterios de aceptación» y «Checklist» del detalle de la tarea: marcar, agregar, editar el texto,
 * eliminar y reordenar arrastrando el asa (o con alt + ↑ ↓ sobre ella).
 * @param {{ slug: string, projectId: string, issue: import('@/api/types').IssueResponse }} props
 */
export function IssueChecklist({ slug, projectId, issue }) {
  const { data, isLoading } = useChecklist(slug, projectId, issue.id)
  const add = useAddChecklistItem(slug, projectId, issue.id)
  const update = useUpdateChecklistItem(slug, projectId, issue.id)
  const move = useMoveChecklistItem(slug, projectId, issue.id)
  const remove = useDeleteChecklistItem(slug, projectId, issue.id)

  // Al soltar se muestra el orden nuevo enseguida, hasta que la caché lo tenga (si no, el elemento salta atrás un instante)
  const [pending, setPending] = useState(null)
  if (pending && pending.from !== data) setPending(null)
  const items = pending?.items ?? data ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-label="Cargando checklist">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    )
  }

  const full = items.length >= CHECKLIST_LIMIT
  const actions = {
    toggle: (item) => update.mutate({ itemId: item.id, done: !item.done }, { onError }),
    rename: (item, text) => update.mutate({ itemId: item.id, text }, { onError }),
    remove: (item) => remove.mutate(item.id, { onError }),
    add: (kind, text) => add.mutate({ kind, text }, { onError }),
    move: (item, toIndex) => {
      const moved = moveChecklistItem(items, item.id, toIndex)
      if (!moved) return
      setPending({ from: data, items: moved.items })
      move.mutate({ itemId: item.id, position: moved.position }, { onError: (error) => notifyError(error, 'No se pudo mover') })
    },
  }

  return (
    <>
      <CriteriaBlock issueId={issue.id} items={items} actions={actions} full={full} />
      <StepsBlock issueId={issue.id} items={items} actions={actions} full={full} />
    </>
  )
}

/** Fila «Progreso» del panel de propiedades: «3/5 pasos · 2/3 criterios». */
export function ChecklistProgressRow({ issue }) {
  const progress = checklistProgress(issue)
  if (!progress) return null
  return (
    <PropertyRow label="Progreso">
      <span className={cn('flex min-h-7 items-center gap-1.5 px-2 py-1 text-xs leading-snug', progress.complete && 'text-ok')}>
        <ListChecks className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>{progress.label}</span>
      </span>
    </PropertyRow>
  )
}

const FORMAT_OPTIONS = [
  { value: 'gherkin', label: 'Dado / cuando / entonces' },
  { value: 'plain', label: 'Lista simple' },
]

function CriteriaBlock({ issueId, items, actions, full }) {
  const format = usePreferencesStore((state) => state.criteriaFormat)
  const setFormat = usePreferencesStore((state) => state.setCriteriaFormat)
  const [adding, setAdding] = useState(false)
  const criteria = itemsOfKind(items, 'CRITERION')
  const done = criteria.filter((item) => item.done).length
  const headingId = `criteria-${issueId}`

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 id={headingId} className="text-sm font-semibold">
          Criterios de aceptación{' '}
          {criteria.length > 0 && (
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {done}/{criteria.length}
            </span>
          )}
        </h2>
        {(criteria.length > 0 || adding) && (
          <Segmented label="Formato" size="sm" className="ml-auto p-0.5" value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
        )}
      </div>

      {criteria.length > 0 && (
        <SortableItems items={items} visible={criteria} onMove={actions.move}>
          <ol className="flex flex-col gap-1.5">
            {criteria.map((item, index) => (
              <SortableItem key={item.id} item={item} index={index} count={criteria.length} onMove={actions.move}>
                {(sortable) => (
                  <ItemRow
                    variant="card"
                    item={item}
                    sortable={sortable}
                    actions={actions}
                    label={`Criterio ${index + 1}`}
                    display={format === 'gherkin' ? <CriterionText text={item.text} /> : null}
                  />
                )}
              </SortableItem>
            ))}
          </ol>
        </SortableItems>
      )}

      {adding ? (
        format === 'gherkin' ? (
          <GherkinAdder onAdd={(text) => actions.add('CRITERION', text)} onClose={() => setAdding(false)} />
        ) : (
          <ul className="overflow-hidden rounded-xl border">
            <AddItemRow
              label="Nuevo criterio de aceptación"
              placeholder="Qué debe cumplirse"
              onAdd={(text) => actions.add('CRITERION', text)}
              onClose={() => setAdding(false)}
              first
            />
          </ul>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-2.5">
          <AddButton disabled={full} onClick={() => setAdding(true)}>
            + criterio
          </AddButton>
          {criteria.length > 0 && done < criteria.length && (
            <span className="text-xs text-muted-foreground">
              Al pasar la tarea a un estado completado con criterios sin marcar se pide confirmación.
            </span>
          )}
        </div>
      )}
    </section>
  )
}

function StepsBlock({ issueId, items, actions, full }) {
  const [adding, setAdding] = useState(false)
  const [hideDone, setHideDone] = useState(false)
  const steps = itemsOfKind(items, 'CHECK')
  const done = steps.filter((item) => item.done).length
  const visible = hideDone ? steps.filter((item) => !item.done) : steps
  const headingId = `checklist-${issueId}`

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h2 id={headingId} className="text-sm font-semibold">
          Checklist{' '}
          {steps.length > 0 && (
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {done}/{steps.length}
            </span>
          )}
        </h2>
        <span className="text-xs text-muted-foreground">pasos internos, no son tareas</span>
        {done > 0 && (
          <button
            type="button"
            className="ml-auto text-xs text-accent-text hover:underline"
            aria-pressed={hideDone}
            onClick={() => setHideDone((current) => !current)}
          >
            {hideDone ? `Mostrar hechos (${done})` : 'Ocultar hechos'}
          </button>
        )}
      </div>

      {steps.length > 0 && (
        <div
          role="progressbar"
          aria-label="Checklist"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done}
          className="h-1 rounded-full bg-column"
        >
          <div
            className="h-full rounded-full bg-ok-dot transition-[width] duration-300"
            style={{ width: `${Math.round((done / steps.length) * 100)}%` }}
          />
        </div>
      )}

      {(visible.length > 0 || adding) && (
        <SortableItems items={items} visible={visible} onMove={actions.move}>
          <ul className="overflow-hidden rounded-xl border">
            {visible.map((item, index) => (
              <SortableItem key={item.id} item={item} index={steps.indexOf(item)} count={steps.length} onMove={actions.move}>
                {(sortable) => (
                  <ItemRow variant="row" item={item} sortable={sortable} actions={actions} first={index === 0} label={item.text} />
                )}
              </SortableItem>
            ))}
            {adding && (
              <AddItemRow
                label="Nuevo paso del checklist"
                placeholder="Nuevo paso"
                onAdd={(text) => actions.add('CHECK', text)}
                onClose={() => setAdding(false)}
                first={visible.length === 0}
              />
            )}
          </ul>
        </SortableItems>
      )}
      {hideDone && visible.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">Todos los pasos están hechos.</p>
      )}

      {!adding && (
        <AddButton disabled={full} onClick={() => setAdding(true)} className="self-start">
          + paso
        </AddButton>
      )}
    </section>
  )
}

function AddButton({ disabled, className, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? `Una tarea admite hasta ${CHECKLIST_LIMIT} criterios y pasos` : undefined}
      className={cn(
        'rounded-full border border-dashed border-dash px-2.5 py-1 text-xs transition-colors duration-150 hover:border-foreground/40 hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

/** Contexto de arrastre de un bloque: al soltar sobre otro elemento del mismo tipo, toma su lugar. */
function SortableItems({ items, visible, onMove, children }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return
        const index = dropIndex(items, active.id, over.id)
        const item = items.find((candidate) => candidate.id === active.id)
        if (item && index != null) onMove(item, index)
      }}
    >
      <SortableContext items={visible.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

/** Elemento ordenable: entrega a su fila el asa (con alt + ↑ ↓) y el estilo mientras se arrastra. */
function SortableItem({ item, index, count, onMove, children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const handle = {
    ref: setActivatorNodeRef,
    ...attributes,
    ...listeners,
    onKeyDown: (event) => {
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        const target = index + (event.key === 'ArrowUp' ? -1 : 1)
        if (target >= 0 && target < count) onMove(item, target)
        return
      }
      listeners?.onKeyDown?.(event)
    },
  }
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10')}
    >
      {children({ handle, isDragging })}
    </li>
  )
}

/**
 * Fila de un criterio (`card`: recuadro propio) o de un paso (`row`: dentro de la lista con bordes).
 * El texto se edita al hacer clic; el menú «⋯» tiene editar y eliminar.
 */
function ItemRow({ variant, item, sortable, actions, label, display, first = false }) {
  const [editing, setEditing] = useState(false)
  const card = variant === 'card'
  const { handle, isDragging } = sortable

  return (
    <div
      className={cn(
        'group flex gap-2 transition-shadow duration-150',
        card
          ? cn('items-start rounded-xl border py-2 pr-2 pl-1', item.done ? 'bg-transparent' : 'bg-card')
          : cn('items-center bg-card py-1 pr-2 pl-1', !first && 'border-t'),
        isDragging && 'bg-card shadow-[0_8px_22px_rgb(35_32_27/0.18)]',
      )}
    >
      <button
        type="button"
        {...handle}
        aria-label={`Mover «${item.text}»`}
        title="Arrastra o usa alt + ↑ ↓"
        className={cn(
          'flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-dash outline-none hover:bg-accent hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
          isDragging && 'bg-accent-soft text-accent-text',
        )}
      >
        <GripVertical className="size-3.5" />
      </button>
      <CheckBox
        checked={item.done}
        label={label}
        onToggle={() => actions.toggle(item)}
        className={card ? 'mt-1 size-5 rounded-[6px]' : undefined}
      />
      {editing ? (
        <InlineEdit
          initial={item.text}
          label={`Editar «${item.text}»`}
          onSave={(text) => {
            setEditing(false)
            if (text !== item.text) actions.rename(item, text)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Editar"
          className={cn(
            'min-w-0 flex-1 cursor-text self-stretch rounded-md px-1 text-left text-sm leading-relaxed break-words hover:bg-accent/50',
            card ? 'py-0.5' : 'py-1',
            item.done && 'text-muted-foreground',
            item.done && !card && 'line-through',
          )}
        >
          {display ?? item.text}
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Opciones de «${item.text}»`}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil />
            Editar texto
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(item)}>
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function CheckBox({ checked, label, onToggle, className }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] text-white transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'border-[#1D6B47] bg-[#1D6B47] dark:border-[#2E9E6A] dark:bg-[#2E9E6A]' : 'border-dash hover:border-foreground/50',
        className,
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3.2} />}
    </button>
  )
}

/** Criterio en tres columnas si tiene la forma «Dado …, cuando …, entonces …»; si no, el texto tal cual. */
function CriterionText({ text }) {
  const parts = parseCriterion(text)
  if (!parts) return text
  return (
    <span className="grid grid-cols-[64px_minmax(0,1fr)] gap-y-0.5">
      {[
        ['Dado', parts.given],
        ['cuando', parts.when],
        ['entonces', parts.then],
      ].map(([keyword, value]) => (
        <span key={keyword} className="contents">
          <span className="pt-px font-mono text-xs font-semibold text-accent-text">{keyword}</span>
          <span>{value}</span>
        </span>
      ))}
    </span>
  )
}

/** Campo de una línea para editar el texto: Enter o salir del campo guarda; Escape cancela. */
function InlineEdit({ initial, label, onSave, onCancel }) {
  const ref = useRef(null)
  const [text, setText] = useState(initial)
  useLocalEscape(ref, onCancel)
  const commit = () => {
    const value = text.trim()
    if (!value) onCancel()
    else onSave(value)
  }
  return (
    <span ref={ref} className="flex min-w-0 flex-1">
      <textarea
        autoFocus
        rows={1}
        value={text}
        maxLength={MAX_TEXT}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setText(event.target.value.replace(/\n/g, ' '))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
        }}
        className="field-sizing-content min-w-0 flex-1 resize-none rounded-lg border border-ring bg-card px-2.5 py-1 text-sm leading-relaxed shadow-[0_0_0_3px_var(--accent-soft)] outline-none"
      />
    </span>
  )
}

/** Fila al final de la lista para escribir un paso nuevo: Enter lo agrega y deja el campo listo para otro. */
function AddItemRow({ label, placeholder, onAdd, onClose, first }) {
  const ref = useRef(null)
  const [text, setText] = useState('')
  useLocalEscape(ref, onClose)
  const submit = () => {
    const value = text.trim()
    if (!value) return
    onAdd(value)
    setText('')
  }
  return (
    <li ref={ref} className={cn('flex items-center gap-2 py-1.5 pr-2 pl-[38px]', !first && 'border-t')}>
      <span aria-hidden="true" className="size-4.5 shrink-0 rounded-[5px] border-[1.5px] border-dashed border-dash" />
      <label className="flex min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <input
          autoFocus
          value={text}
          maxLength={MAX_TEXT}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => !text.trim() && onClose()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-ring bg-card px-2.5 py-1.5 text-sm shadow-[0_0_0_3px_var(--accent-soft)] outline-none placeholder:text-muted-foreground"
        />
      </label>
      <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline">
        <kbd className="text-foreground">↵</kbd> agregar · <kbd className="text-foreground">esc</kbd>
      </span>
    </li>
  )
}

/** Criterio nuevo en tres campos (Dado, cuando, entonces); Enter en cualquiera lo agrega cuando están los tres. */
function GherkinAdder({ onAdd, onClose }) {
  const ref = useRef(null)
  const empty = { given: '', when: '', then: '' }
  const [parts, setParts] = useState(empty)
  useLocalEscape(ref, onClose)
  const complete = Object.values(parts).every((value) => value.trim())
  const submit = () => {
    if (!complete) return
    onAdd(formatCriterion(parts).slice(0, MAX_TEXT))
    setParts(empty)
    ref.current?.querySelector('input')?.focus()
  }
  const fields = [
    ['given', 'Dado', 'un correo registrado'],
    ['when', 'cuando', 'pido recuperar la contraseña'],
    ['then', 'entonces', 'recibo un enlace que sirve 30 minutos'],
  ]

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Nuevo criterio de aceptación"
      className="tf-pop flex flex-col gap-2 rounded-xl border border-ring bg-card p-3 shadow-[0_0_0_3px_var(--accent-soft)]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && !Object.values(parts).some((value) => value.trim())) onClose()
      }}
    >
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
        {fields.map(([key, keyword, placeholder], index) => (
          <label key={key} className="contents">
            <span className="font-mono text-xs font-semibold text-accent-text">{keyword}</span>
            <input
              autoFocus={index === 0}
              value={parts[key]}
              maxLength={160}
              placeholder={placeholder}
              onChange={(event) => setParts((current) => ({ ...current, [key]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (complete) submit()
                  else event.currentTarget.closest('[role="group"]')?.querySelectorAll('input')[index + 1]?.focus()
                }
              }}
              className="min-w-0 rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring dark:bg-input/30"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">
          <kbd className="text-foreground">↵</kbd> siguiente / agregar · <kbd className="text-foreground">esc</kbd> cerrar
        </span>
        <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={!complete} onClick={submit}>
          Agregar criterio
        </Button>
      </div>
    </div>
  )
}
