import { useEffect, useRef, useState } from 'react'
import { GitBranch, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/common/Loaders'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PRIORITIES, PRIORITY_LABELS } from '@/features/issues/constants'
import { PriorityChip } from '@/features/issues/components/PriorityIcon'
import { TypeIcon } from '@/features/issues/components/IssueTypeBits'
import { opensAbove } from '@/features/editor/editor/popups'
import { useLocalEscape } from '@/hooks/useLocalEscape'
import { t, tn, tx } from '@/i18n'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useSplitStory } from '../hooks'
import { emptyLine, linesToItems, pickerQuery, removeToken } from '../splitLines'

/** Largo máximo del título de una tarea (como en el backend). */
const TITLE_MAX = 255
/** Alto máximo del selector de «@» o «!» (seis personas). */
const PICKER_HEIGHT = 230
/** Al abrirse, durante cuánto se lo sigue mostrando entero mientras carga lo de arriba. */
const REVEAL_MS = 1500

/**
 * «Partir en tareas» (project manager): una línea por tarea. Enter agrega una línea, «@» asigna, «!» pone la
 * prioridad, Tab cambia el tipo (Tarea / Bug), Esc cancela y «Crear N tareas» (ctrl ↵) las crea todas juntas. Heredan
 * de la historia su ciclo, sus módulos, sus etiquetas y, si la línea no la trae, su prioridad.
 * Al abrirse (con «Partir en tareas» o solo, en una historia sin partir) el panel se desplaza hasta mostrarlo entero.
 * `sticky`: se muestra solo (historia sin partir) y sigue a la vista al cancelar: cancelar vacía las líneas y, sin
 * nada escrito, Escape sigue su camino (cierra el panel de la historia).
 * @param {{ slug: string, project: object, story: import('@/api/types').IssueResponse, members: object[],
 *           onDone: () => void, onCancel: () => void, sticky?: boolean }} props
 */
export function SplitComposer({ slug, project, story, members, onDone, onCancel, sticky = false }) {
  const split = useSplitStory(slug, project.id)
  const [lines, setLines] = useState(() => [emptyLine()])
  // Selector abierto (personas con «@», prioridades con «!») en la línea `lineId`
  const [picker, setPicker] = useState(null)
  const inputs = useRef(new Map())
  const rootRef = useRef(null)
  const items = linesToItems(lines)

  const typed = lines.length > 1 || lines.some((line) => line.title.trim() || line.assignee || line.priority)
  const cancel = () => {
    setPicker(null)
    setLines([emptyLine()])
    onCancel()
  }

  // Esc cierra el selector abierto o cancela, sin cerrar también el panel de la historia (Radix escucha Escape
  // antes que el onKeyDown de React). Si se muestra solo y no hay nada escrito, no hay qué cancelar: cierra el panel
  useLocalEscape(
    rootRef,
    () => {
      if (picker) setPicker(null)
      else cancel()
    },
    !sticky || Boolean(picker) || typed,
  )

  // Abierto al final del panel quedaba fuera de la vista (el foco solo mostraba la primera línea, y los selectores
  // de «@» y «!» se abrían debajo, fuera de la pantalla). Al abrirse se muestra entero; lo de arriba (criterios,
  // checklist) puede crecer al cargar y empujarlo hacia abajo, así que durante un momento se sigue mostrando. Al
  // escribir, también
  const reveal = () => rootRef.current?.scrollIntoView?.({ block: 'nearest' })
  useEffect(() => {
    const element = rootRef.current
    if (!element) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => element.scrollIntoView?.({ block: 'nearest' }))
      return () => cancelAnimationFrame(frame)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.intersectionRatio < 1) element.scrollIntoView?.({ block: 'nearest' })
      },
      { threshold: [1] },
    )
    observer.observe(element)
    const stop = setTimeout(() => observer.disconnect(), REVEAL_MS)
    return () => {
      clearTimeout(stop)
      observer.disconnect()
    }
  }, [])

  const focusLine = (id) => requestAnimationFrame(() => inputs.current.get(id)?.focus())
  const updateLine = (id, change) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...change } : line)))

  const options = (() => {
    if (!picker) return []
    const query = picker.query.toLowerCase()
    if (picker.kind === 'person') {
      return members
        .filter(
          (user) => user.fullName.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query),
        )
        .slice(0, 6)
        .map((user) => ({ value: user, key: user.id, label: user.fullName }))
    }
    return PRIORITIES.filter(
      (priority) => priority.value !== 'NONE' && priority.label.toLowerCase().includes(query),
    ).map((priority) => ({
      value: priority.value,
      key: priority.value,
      label: priority.label,
    }))
  })()

  const choose = (line, option) => {
    const title = removeToken(line.title, picker.start, picker.end)
    updateLine(
      line.id,
      picker.kind === 'person' ? { title, assignee: option.value } : { title, priority: option.value },
    )
    setPicker(null)
    focusLine(line.id)
  }

  const onInput = (line, event) => {
    const value = event.target.value
    updateLine(line.id, { title: value })
    reveal()
    const found = pickerQuery(value, event.target.selectionStart ?? value.length)
    // Cerca del borde de abajo de lo visible, el selector se abre hacia arriba
    setPicker(
      found ? { ...found, lineId: line.id, active: 0, above: opensAbove(event.target, PICKER_HEIGHT) } : null,
    )
  }

  const submit = () => {
    if (items.length === 0 || split.isPending) return
    split.mutate(
      { storyId: story.id, items },
      {
        onSuccess: (created) => {
          toast.success(
            tn(created.length, '{count} tarea creada en {code}', '{count} tareas creadas en {code}', {
              code: story.code,
            }),
          )
          setLines([emptyLine()])
          onDone()
        },
        onError: (error) => notifyError(error, t('No se pudieron crear las tareas')),
      },
    )
  }

  const onKeyDown = (line, index, event) => {
    const pickerHere = picker?.lineId === line.id && options.length > 0
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      submit()
      return
    }
    if (pickerHere && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setPicker({ ...picker, active: (picker.active + step + options.length) % options.length })
      return
    }
    if (pickerHere && (event.key === 'Enter' || event.key === 'Tab')) {
      event.preventDefault()
      choose(line, options[picker.active] ?? options[0])
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const next = emptyLine(line.type)
      setLines((current) => [...current.slice(0, index + 1), next, ...current.slice(index + 1)])
      focusLine(next.id)
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      updateLine(line.id, { type: line.type === 'BUG' ? 'TASK' : 'BUG' })
      return
    }
    if (event.key === 'Backspace' && line.title === '' && lines.length > 1) {
      event.preventDefault()
      setLines((current) => current.filter((other) => other.id !== line.id))
      focusLine(
        lines[Math.max(0, index - 1)].id === line.id
          ? lines[index + 1]?.id
          : lines[Math.max(0, index - 1)].id,
      )
    }
  }

  const inherited = [
    story.cycle?.name,
    ...(story.modules ?? []).map((module) => module.name),
    ...(story.labels ?? []).map((label) => label.name),
  ].filter(Boolean)
  const storyPriority =
    story.priority && story.priority !== 'NONE' ? PRIORITY_LABELS[story.priority].toLowerCase() : null
  const addLine = () => {
    const next = emptyLine(lines[lines.length - 1]?.type)
    setLines((current) => [...current, next])
    focusLine(next.id)
  }

  return (
    <div
      ref={rootRef}
      className="tf-pop border-ring/60 bg-card shadow-card flex flex-col rounded-[16px] border"
    >
      <div className="flex items-start gap-3 border-b px-4 py-3.5">
        <span className="bg-accent-soft text-accent-text flex size-9 shrink-0 items-center justify-center rounded-xl">
          <GitBranch className="size-4.5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-[15px] font-semibold">{t('Partir en tareas')}</h3>
          <span className="text-muted-foreground text-[13px]">
            {t('Una línea por tarea. Enter agrega otra.')}
          </span>
        </span>
        {items.length > 0 && (
          <span
            key={items.length}
            className="tf-pop bg-subtle text-muted-foreground shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px]"
          >
            {tn(items.length, '{count} lista', '{count} listas')}
          </span>
        )}
      </div>
      <ol className="flex flex-col gap-1.5 px-3 pt-3 pb-1.5">
        {lines.map((line, index) => (
          <li
            key={line.id}
            className="tf-enter bg-subtle/60 focus-within:border-ring focus-within:bg-card relative flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors duration-150"
          >
            <span className="bg-card text-muted-foreground flex size-5.5 shrink-0 items-center justify-center rounded-full font-mono text-[11px]">
              {index + 1}
            </span>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => updateLine(line.id, { type: line.type === 'BUG' ? 'TASK' : 'BUG' })}
              title={line.type === 'BUG' ? t('Bug · Tab cambia el tipo') : t('Tarea · Tab cambia el tipo')}
              aria-label={
                line.type === 'BUG'
                  ? t('Tipo de la línea {number}: Bug', { number: index + 1 })
                  : t('Tipo de la línea {number}: Tarea', { number: index + 1 })
              }
              className="shrink-0 rounded-md p-0.5 transition-transform duration-150 hover:scale-110"
            >
              <TypeIcon type={line.type} />
            </button>
            <input
              ref={(element) =>
                element ? inputs.current.set(line.id, element) : inputs.current.delete(line.id)
              }
              autoFocus={index === 0}
              value={line.title}
              onChange={(event) => onInput(line, event)}
              onKeyDown={(event) => onKeyDown(line, index, event)}
              onBlur={() =>
                setTimeout(() => setPicker((current) => (current?.lineId === line.id ? null : current)), 150)
              }
              placeholder={index === 0 ? t('Qué hay que hacer… (@ asignar, ! prioridad)') : t('Otra tarea…')}
              aria-label={t('Tarea {number}', { number: index + 1 })}
              // Como el título de una tarea (el backend rechaza más de 255 y no dice qué línea)
              maxLength={TITLE_MAX}
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
            />
            {line.assignee && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => updateLine(line.id, { assignee: null })}
                title={t('Quitar asignado')}
                className="tf-pop group bg-card flex shrink-0 items-center gap-1.5 rounded-full border py-0.5 pr-2 pl-0.5 text-xs font-medium"
              >
                <UserAvatar user={line.assignee} size="xs" className="size-4.5" />@
                {line.assignee.fullName.split(' ')[0]}
                <X className="hidden size-3 group-hover:block" />
              </button>
            )}
            {line.priority && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => updateLine(line.id, { priority: null })}
                title={t('Quitar prioridad')}
                className="tf-pop shrink-0"
              >
                <PriorityChip priority={line.priority} />
              </button>
            )}
            {picker?.lineId === line.id && options.length > 0 && (
              <div
                role="listbox"
                aria-label={picker.kind === 'person' ? t('Asignar a') : t('Prioridad')}
                className={cn(
                  'tf-pop bg-popover absolute left-24 z-20 w-60 rounded-xl border p-1 shadow-xl',
                  picker.above ? 'bottom-full mb-0.5' : 'top-full mt-0.5',
                )}
              >
                {options.map((option, optionIndex) => (
                  <button
                    key={option.key}
                    type="button"
                    role="option"
                    aria-selected={optionIndex === picker.active}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      choose(line, option)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px]',
                      optionIndex === picker.active && 'bg-accent-soft font-semibold',
                    )}
                  >
                    {picker.kind === 'person' ? (
                      <UserAvatar user={option.value} size="xs" />
                    ) : (
                      <PriorityChip priority={option.value} />
                    )}
                    {picker.kind === 'person' && (
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={addLine}
          className="text-muted-foreground hover:border-ring hover:text-foreground flex h-9 w-full items-center gap-2 rounded-xl border border-dashed px-3 text-left text-[13px] font-medium transition-colors duration-150"
        >
          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          {t('otra línea')}
        </button>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 border-t border-dashed px-4 py-2.5 text-xs">
        <span>{t('Heredan de la historia:')}</span>
        {inherited.length === 0 && <span className="text-foreground">{t('nada')}</span>}
        {inherited.map((name) => (
          <span key={name} className="bg-subtle text-foreground rounded-md border px-1.5 py-0.5">
            {name}
          </span>
        ))}
        <span className="bg-subtle rounded-md border px-1.5 py-0.5">
          {storyPriority
            ? tx('sin {mark}, prioridad {priority}', {
                mark: <span className="font-mono">!</span>,
                priority: <span className="text-foreground">{storyPriority}</span>,
              })
            : tx('sin {mark}, sin prioridad', { mark: <span className="font-mono">!</span> })}
        </span>
      </div>
      <p className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 border-t px-4 py-2 font-mono text-[11px]">
        {KEYS().map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <kbd className="bg-card text-foreground rounded-[5px] border px-1.5">{key}</kbd>
            {label}
          </span>
        ))}
      </p>
      <div className="bg-subtle flex items-center gap-2 rounded-b-[16px] border-t px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>
          {t('Cancelar')}
        </Button>
        <Button
          type="button"
          className="ml-auto"
          disabled={items.length === 0 || split.isPending}
          onClick={submit}
        >
          {split.isPending && <Spinner />}
          {tn(items.length, 'Crear {count} tarea', 'Crear {count} tareas')}
          <kbd className="bg-foreground/10 rounded-[5px] px-1.5 text-[11px] font-normal">ctrl ↵</kbd>
        </Button>
      </div>
    </div>
  )
}

/** Los atajos del compositor, con lo que hace cada uno. */
const KEYS = () => [
  ['Enter', t('nueva línea')],
  ['@', t('asignar')],
  ['!', t('prioridad')],
  ['Tab', t('tipo')],
  ['Esc', t('cancelar')],
]
